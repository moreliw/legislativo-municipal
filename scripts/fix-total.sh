#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"
WEB_DIR="$APP_DIR/apps/web"

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }

echo ""
echo -e "${BOLD}  FIX TOTAL — Sistema Legislativo${N}"
echo ""

# 1. Atualizar código
info "Atualizando código..."
cd "$APP_DIR"
git fetch origin main 2>&1 | tail -1
git reset --hard origin/main 2>&1 | tail -1
ok "Código: $(git log --oneline -1 | cut -c1-55)"

# 2. Recriar .env com credenciais corretas
info "Configurando .env..."
source /root/.legislativo-secrets
DB_PORT="${DB_PORT:-5433}"

cat > "$API_DIR/.env" << ENVFILE
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:${REDIS_PORT:-6380}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${DOMAIN:-pleno.morelidev.com}
FRONTEND_URL=https://${DOMAIN:-pleno.morelidev.com}
ENVFILE
ok ".env gerado (DB:${DB_PORT}, JWT:${#JWT_SECRET}c)"

# 3. Instalar deps
info "Instalando dependências..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -1

cd "$API_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -1

# 4. Prisma
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -1

# 5. Parar API velha
pm2 delete leg-api 2>/dev/null || true
pm2 delete leg-web 2>/dev/null || true
sleep 2

# 6. Recompilar frontend
info "Recompilando frontend..."
cd "$WEB_DIR"

# Garantir swap
if ! swapon --show | grep -q sw; then
  fallocate -l 2G /tmp/sw 2>/dev/null && chmod 600 /tmp/sw && mkswap /tmp/sw >/dev/null && swapon /tmp/sw 2>/dev/null || true
fi

NODE_OPTIONS="--max-old-space-size=3072" \
  NEXT_PUBLIC_API_URL="https://${DOMAIN:-pleno.morelidev.com}/api" \
  npx next build 2>&1 | tail -5

SDIR=".next/standalone/apps/web"
mkdir -p "$SDIR/.next"
cp -r .next/static "$SDIR/.next/static"
ok "Frontend compilado"

# 7. Garantir ecosystem.config.js
cat > "$APP_DIR/ecosystem.config.js" << 'PM2CFG'
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
PM2CFG

# 8. Iniciar PM2
info "Iniciando PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save --force >/dev/null
sleep 6

# 9. Nginx
systemctl reload nginx 2>/dev/null || true

# 10. Testes completos
echo ""
echo -e "${BOLD}═════════════════════════════════════════════════════${N}"
echo -e "${BOLD}           TESTES DE INTEGRAÇÃO${N}"
echo -e "${BOLD}═════════════════════════════════════════════════════${N}"
echo ""

# Test 1: Health
if curl -sf http://localhost:3001/health >/dev/null; then
  ok "1. API Health: OK"
else
  warn "1. API Health: FALHOU"
fi

# Test 2: Login
HTTP=$(curl -s -o /tmp/login.json -w "%{http_code}" \
  -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}')

if [[ "$HTTP" == "200" ]]; then
  ok "2. Login Rio Novo: OK"
  TOKEN=$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d['accessToken'])")
  echo "   Token: ${TOKEN:0:40}..."
else
  warn "2. Login Rio Novo: HTTP $HTTP"
  cat /tmp/login.json | head -c 200
fi

# Test 3: /me com token
if [[ -n "${TOKEN:-}" ]]; then
  HTTP_ME=$(curl -s -o /tmp/me.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/v1/auth/me)
  if [[ "$HTTP_ME" == "200" ]]; then
    ok "3. /me com token: OK"
  else
    warn "3. /me com token: HTTP $HTTP_ME (token não aceito pelo authPlugin!)"
    cat /tmp/me.json | head -c 200
  fi

  # Test 4: /menus
  HTTP_MENU=$(curl -s -o /tmp/menus.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/v1/menus)
  if [[ "$HTTP_MENU" == "200" ]]; then
    TOTAL_MENUS=$(python3 -c "import json; d=json.load(open('/tmp/menus.json')); print(d.get('total', 0))")
    ok "4. /menus: $TOTAL_MENUS menus retornados"
  else
    warn "4. /menus: HTTP $HTTP_MENU"
  fi

  # Test 5: /proposicoes
  HTTP_PROP=$(curl -s -o /tmp/prop.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3001/api/v1/proposicoes?page=1&pageSize=5")
  if [[ "$HTTP_PROP" == "200" ]]; then
    TOTAL_PROP=$(python3 -c "import json; d=json.load(open('/tmp/prop.json')); print(d.get('meta',{}).get('total', 0))")
    ok "5. /proposicoes: $TOTAL_PROP proposições"
  else
    warn "5. /proposicoes: HTTP $HTTP_PROP"
  fi
fi

# Test 6: Superadmin login
HTTP_SUPER=$(curl -s -o /tmp/super.json -w "%{http_code}" \
  -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@legislativo.sistema.gov.br","senha":"Admin@Sistema2024!"}')

if [[ "$HTTP_SUPER" == "200" ]]; then
  ok "6. Login Superadmin: OK"
  SUPER_TOKEN=$(python3 -c "import json; d=json.load(open('/tmp/super.json')); print(d['accessToken'])")

  # Test 7: Superadmin menus
  HTTP_SM=$(curl -s -o /tmp/smenu.json -w "%{http_code}" \
    -H "Authorization: Bearer $SUPER_TOKEN" \
    http://localhost:3001/api/v1/menus)
  if [[ "$HTTP_SM" == "200" ]]; then
    IS_SUPER=$(python3 -c "import json; d=json.load(open('/tmp/smenu.json')); print(d.get('isSuperAdmin', False))")
    TOTAL=$(python3 -c "import json; d=json.load(open('/tmp/smenu.json')); print(d.get('total', 0))")
    ok "7. Superadmin /menus: $TOTAL menus, isSuperAdmin=$IS_SUPER"
  fi
fi

# Test 8: JWT_SECRET consistency entre workers
info "Verificando consistência do JWT entre workers..."
for i in 1 2 3 4 5; do
  HTTP=$(curl -s -o /tmp/t.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/v1/auth/me)
  if [[ "$HTTP" != "200" ]]; then
    warn "   Tentativa $i: HTTP $HTTP — token rejeitado!"
    echo "   Resposta: $(cat /tmp/t.json | head -c 150)"
    break
  fi
done
if [[ "$HTTP" == "200" ]]; then
  ok "8. Token aceito em 5 requests consecutivos (JWT consistente)"
fi

echo ""
echo -e "${BOLD}═════════════════════════════════════════════════════${N}"
echo -e "${BOLD}           STATUS FINAL${N}"
echo -e "${BOLD}═════════════════════════════════════════════════════${N}"
echo ""
pm2 list | grep -E "name|leg-"
swapoff /tmp/sw 2>/dev/null || true
echo ""

cat << 'INSTRUCOES'
⚠️  IMPORTANTE:
No seu navegador, limpe o cache do localStorage:
  F12 → Application → Local Storage → Clear All
  OU pressione Ctrl+Shift+Delete → "Cached images and files"
  OU faça logout e login novamente

Tokens antigos do localStorage são INVÁLIDOS após reinício da API.

📍 Logins:
  Superadmin:  admin@legislativo.sistema.gov.br / Admin@Sistema2024!
  Rio Novo:    admin@camararionovosul.es.gov.br / RioNovo@2024!

📍 URL: https://pleno.morelidev.com
INSTRUCOES
