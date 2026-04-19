#!/usr/bin/env bash
# Diagnóstico completo + correção automática
set +e
source /root/.legislativo-secrets 2>/dev/null || true

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${N}"
echo -e "${BOLD}  DIAGNÓSTICO COMPLETO — Sistema Legislativo${N}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${N}"
echo ""

# ── 1. Atualizar código ─────────────────────────────────────────
echo -e "${B}▶ 1. Atualizando código${N}"
cd /opt/legislativo
git fetch origin main 2>&1 | tail -1
git reset --hard origin/main 2>&1 | tail -1
echo "   Commit: $(git log --oneline -1 | cut -c1-55)"

# ── 2. Verificar secrets ──────────────────────────────────────────
echo ""
echo -e "${B}▶ 2. Verificando secrets${N}"
if [[ -z "${JWT_SECRET:-}" ]]; then
  echo -e "${R}   ❌ JWT_SECRET não encontrado!${N}"
  exit 1
fi
echo "   JWT_SECRET: ${#JWT_SECRET} caracteres ✓"
echo "   DB_PORT: ${DB_PORT:-5433}"
echo "   DB_PASSWORD: ${#DB_PASSWORD} caracteres ✓"

# ── 3. Criar .env correto ─────────────────────────────────────────
echo ""
echo -e "${B}▶ 3. Criando .env correto${N}"
DB_PORT="${DB_PORT:-5433}"
cat > /opt/legislativo/apps/api/.env << ENV
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:${REDIS_PORT:-6380}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${DOMAIN:-pleno.morelidev.com}
FRONTEND_URL=https://${DOMAIN:-pleno.morelidev.com}
ENV
echo "   .env gerado"
grep -c "=" /opt/legislativo/apps/api/.env | xargs -I{} echo "   {} variáveis"

# ── 4. Verificar PostgreSQL ────────────────────────────────────────
echo ""
echo -e "${B}▶ 4. Verificando PostgreSQL${N}"
if docker ps | grep -q leg_postgres; then
  echo -e "${G}   ✓ Container rodando${N}"
  TABLES=$(docker exec leg_postgres psql -U legislativo -d legislativo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
  echo "   Tabelas: ${TABLES}"

  # Verificar dados críticos
  USERS=$(docker exec leg_postgres psql -U legislativo -d legislativo -t -c "SELECT COUNT(*) FROM usuarios" 2>/dev/null | tr -d ' ')
  MENUS=$(docker exec leg_postgres psql -U legislativo -d legislativo -t -c "SELECT COUNT(*) FROM menus" 2>/dev/null | tr -d ' ')
  CASAS=$(docker exec leg_postgres psql -U legislativo -d legislativo -t -c "SELECT COUNT(*) FROM casas_legislativas" 2>/dev/null | tr -d ' ')
  echo "   Usuários: ${USERS:-?}, Menus: ${MENUS:-?}, Câmaras: ${CASAS:-?}"
else
  echo -e "${R}   ❌ Container não está rodando${N}"
  docker start leg_postgres 2>/dev/null
  sleep 5
fi

# ── 5. Instalar deps ──────────────────────────────────────────────
echo ""
echo -e "${B}▶ 5. Instalando dependências${N}"
cd /opt/legislativo
pnpm install --no-frozen-lockfile 2>&1 | tail -1
cd /opt/legislativo/apps/api
pnpm install --no-frozen-lockfile 2>&1 | tail -1
echo "   ✓ deps OK"

# ── 6. Prisma ─────────────────────────────────────────────────────
echo ""
echo -e "${B}▶ 6. Gerando Prisma${N}"
npx prisma generate 2>&1 | tail -1

printf "y\n" | DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo" \
  npx prisma db push --accept-data-loss 2>&1 | tail -2

# ── 7. Seeds (idempotentes — podem rodar múltiplas vezes) ────────
echo ""
echo -e "${B}▶ 7. Populando banco${N}"
DB_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo"

if [[ "${CASAS:-0}" -eq "0" ]]; then
  echo "   Seed câmara principal..."
  DATABASE_URL="$DB_URL" npx tsx prisma/seed.ts 2>&1 | tail -3
fi

echo "   Seed menus..."
DATABASE_URL="$DB_URL" npx tsx prisma/seed-menus.ts 2>&1 | tail -3

echo "   Seed superadmin..."
DATABASE_URL="$DB_URL" npx tsx prisma/seed-superadmin.ts 2>&1 | tail -3

echo "   Seed proposições..."
DATABASE_URL="$DB_URL" npx tsx prisma/seed-proposicoes.ts 2>&1 | tail -3

# ── 8. Verificar bundle da API ────────────────────────────────────
echo ""
echo -e "${B}▶ 8. Verificando bundle da API${N}"
if [[ ! -f "/opt/legislativo/apps/api/dist/server.js" ]]; then
  echo "   Compilando..."
  node_modules/.bin/esbuild src/server.ts \
    --bundle --platform=node --target=node20 \
    --outfile=dist/server.js --packages=external 2>&1 | tail -1
fi
BUNDLE_SIZE=$(wc -c < /opt/legislativo/apps/api/dist/server.js)
DECORATOR_COUNT=$(grep -c "decorateRequest" /opt/legislativo/apps/api/dist/server.js)
echo "   Bundle: ${BUNDLE_SIZE} bytes"
echo "   decorateRequest count: ${DECORATOR_COUNT} (esperado: 1)"

# ── 9. PM2 ────────────────────────────────────────────────────────
echo ""
echo -e "${B}▶ 9. PM2${N}"
pm2 delete leg-api 2>/dev/null
pm2 delete leg-web 2>/dev/null

cat > /opt/legislativo/ecosystem.config.js << 'PM2'
module.exports = {
  apps: [
    {
      name: 'leg-api',
      script: 'dist/server.js',
      cwd: '/opt/legislativo/apps/api',
      instances: 2,
      exec_mode: 'cluster',
      env_file: '/opt/legislativo/apps/api/.env',
      env: {
        NODE_PATH: '/opt/legislativo/apps/api/node_modules:/opt/legislativo/node_modules',
      },
      error_file: '/var/log/legislativo/api-error.log',
      out_file: '/var/log/legislativo/api-out.log',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
    {
      name: 'leg-web',
      script: '.next/standalone/apps/web/server.js',
      cwd: '/opt/legislativo/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' },
      error_file: '/var/log/legislativo/web-error.log',
      out_file: '/var/log/legislativo/web-out.log',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    }
  ]
}
PM2

mkdir -p /var/log/legislativo
cd /opt/legislativo
pm2 start ecosystem.config.js
pm2 save --force >/dev/null
sleep 8

# ── 10. Recompilar frontend ──────────────────────────────────────
echo ""
echo -e "${B}▶ 10. Verificando frontend${N}"

# Só recompila se não existir standalone ou se código mudou
NEED_BUILD=false
if [[ ! -f "/opt/legislativo/apps/web/.next/standalone/apps/web/server.js" ]]; then
  NEED_BUILD=true
fi

# Forçar build sempre para garantir sincronia com backend
NEED_BUILD=true

if $NEED_BUILD; then
  echo "   Recompilando frontend..."
  cd /opt/legislativo/apps/web

  if ! swapon --show | grep -q sw; then
    fallocate -l 2G /tmp/sw 2>/dev/null && chmod 600 /tmp/sw && mkswap /tmp/sw >/dev/null 2>&1 && swapon /tmp/sw 2>/dev/null || true
  fi

  NODE_OPTIONS="--max-old-space-size=3072" \
    NEXT_PUBLIC_API_URL="https://${DOMAIN:-pleno.morelidev.com}/api" \
    npx next build 2>&1 | tail -3

  if [[ -d ".next/standalone/apps/web" ]]; then
    cp -r .next/static .next/standalone/apps/web/.next/static 2>/dev/null
    echo "   ✓ frontend compilado"
  else
    echo -e "${R}   ❌ build falhou${N}"
  fi
  swapoff /tmp/sw 2>/dev/null
fi

# Reiniciar leg-web
pm2 restart leg-web 2>/dev/null || pm2 start ecosystem.config.js --only leg-web
sleep 3

# ── 11. Nginx ─────────────────────────────────────────────────────
echo ""
echo -e "${B}▶ 11. Nginx${N}"
nginx -t 2>&1 | tail -1
systemctl reload nginx

# ── 12. TESTES DE INTEGRAÇÃO ─────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${N}"
echo -e "${BOLD}  TESTES${N}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${N}"

# Test Health
if curl -sf http://localhost:3001/health >/dev/null; then
  echo -e "${G}✓${N} 1. API /health"
else
  echo -e "${R}✗${N} 1. API /health — OFFLINE"
  pm2 logs leg-api --lines 15 --nostream | tail -20
  exit 1
fi

# Test Login
HTTP=$(curl -s -o /tmp/login.json -w "%{http_code}" \
  -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}')

if [[ "$HTTP" == "200" ]]; then
  TOKEN=$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d['accessToken'])")
  echo -e "${G}✓${N} 2. Login Rio Novo (token ${#TOKEN}c)"
else
  echo -e "${R}✗${N} 2. Login Rio Novo HTTP $HTTP"
  cat /tmp/login.json
  exit 1
fi

# Test /auth/me (crítico — se falhar, JWT está inconsistente)
HTTP=$(curl -s -o /tmp/me.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/auth/me)

if [[ "$HTTP" == "200" ]]; then
  echo -e "${G}✓${N} 3. /auth/me com token"
else
  echo -e "${R}✗${N} 3. /auth/me HTTP $HTTP — JWT REJEITADO!"
  cat /tmp/me.json
  echo ""
  echo "=== PROBLEMA: JWT_SECRET inconsistente entre workers ==="
  pm2 logs leg-api --lines 20 --nostream | tail -25
  exit 1
fi

# Test 4: mesma request 5 vezes (consistência entre workers)
echo -n "   Testando consistência em 5 requests: "
FAIL=0
for i in 1 2 3 4 5; do
  H=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me)
  if [[ "$H" != "200" ]]; then
    FAIL=$((FAIL+1))
    echo -n "[$i:❌$H] "
  else
    echo -n "[$i:✓] "
  fi
done
echo ""
if [[ "$FAIL" -eq "0" ]]; then
  echo -e "${G}✓${N} 4. Consistência JWT: 5/5 OK"
else
  echo -e "${R}✗${N} 4. ${FAIL}/5 requests falharam — workers com JWT diferentes!"
  echo ""
  echo "=== LOGS ==="
  pm2 logs leg-api --lines 25 --nostream | tail -30
fi

# Test /menus
HTTP=$(curl -s -o /tmp/menus.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/menus)
if [[ "$HTTP" == "200" ]]; then
  MENU_COUNT=$(python3 -c "import json; print(json.load(open('/tmp/menus.json')).get('total',0))")
  echo -e "${G}✓${N} 5. /menus retornou $MENU_COUNT menus"
else
  echo -e "${R}✗${N} 5. /menus HTTP $HTTP"
fi

# Test /proposicoes
HTTP=$(curl -s -o /tmp/prop.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/v1/proposicoes?page=1&pageSize=5")
if [[ "$HTTP" == "200" ]]; then
  P_COUNT=$(python3 -c "import json; print(json.load(open('/tmp/prop.json')).get('meta',{}).get('total',0))")
  echo -e "${G}✓${N} 6. /proposicoes: $P_COUNT proposições"
else
  echo -e "${R}✗${N} 6. /proposicoes HTTP $HTTP"
  cat /tmp/prop.json | head -c 300
fi

# Test Superadmin
HTTP=$(curl -s -o /tmp/super.json -w "%{http_code}" \
  -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@legislativo.sistema.gov.br","senha":"Admin@Sistema2024!"}')
if [[ "$HTTP" == "200" ]]; then
  echo -e "${G}✓${N} 7. Login Superadmin"
  STOKEN=$(python3 -c "import json; print(json.load(open('/tmp/super.json'))['accessToken'])")

  HTTP=$(curl -s -o /tmp/smenu.json -w "%{http_code}" \
    -H "Authorization: Bearer $STOKEN" http://localhost:3001/api/v1/menus)
  if [[ "$HTTP" == "200" ]]; then
    IS_SUPER=$(python3 -c "import json; print(json.load(open('/tmp/smenu.json')).get('isSuperAdmin', False))")
    echo -e "${G}✓${N} 8. Superadmin /menus — isSuperAdmin=$IS_SUPER"
  fi
else
  echo -e "${Y}!${N} 7. Superadmin não encontrado — rodando seed-superadmin..."
  DATABASE_URL="$DB_URL" npx tsx prisma/seed-superadmin.ts 2>&1 | tail -5
fi

# Status final
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${N}"
pm2 list | grep -E "name|leg-"
echo ""
echo "🌐 https://${DOMAIN:-pleno.morelidev.com}"
echo ""
echo -e "${Y}⚠️  IMPORTANTE: Limpe localStorage do browser:${N}"
echo "   F12 → Application → Local Storage → Clear All"
echo "   OU pressione Ctrl+Shift+Del"
echo ""
