#!/usr/bin/env bash
# fix-api-auth.sh — Corrigir API após deploy de autenticação
set -euo pipefail
APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }

echo ""
echo -e "${BOLD}  Corrigindo API — autenticação JWT/bcrypt${N}"
echo ""

# 1. Parar API
pm2 delete leg-api 2>/dev/null || true

# 2. Instalar deps em TODOS os locais necessários
info "Instalando dependências..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2

cd "$API_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2

# Verificar módulos críticos
info "Verificando módulos necessários..."
for mod in bcryptjs @fastify/cookie @fastify/swagger @fastify/jwt fastify @prisma/client; do
  if node -e "require('$mod')" 2>/dev/null; then
    ok "  $mod ✓"
  else
    warn "  $mod — instalando direto..."
    npm install "$mod" --no-save 2>/dev/null || true
  fi
done

# 3. Gerar Prisma client
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -2

# 4. Compilar API
info "Compilando API..."
node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external \
  2>&1 | tail -3
ok "API compilada ($(wc -c < dist/server.js) bytes)"

# 5. Testar inicialização com NODE_PATH correto
info "Testando API..."
NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
  timeout 10 node dist/server.js &
SERVER_PID=$!
sleep 5

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API respondendo!"
  curl -s "http://localhost:3001/health" | python3 -m json.tool 2>/dev/null | head -5
  kill $SERVER_PID 2>/dev/null || true
else
  warn "API não respondeu no teste manual. Erro:"
  kill $SERVER_PID 2>/dev/null || true
  NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
    timeout 5 node dist/server.js 2>&1 | head -20 || true
fi

# 6. Criar ecosystem.config.js com NODE_PATH correto
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
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
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
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/var/log/legislativo/web-error.log',
      out_file: '/var/log/legislativo/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    }
  ]
}
PM2CFG

# 7. Iniciar PM2
cd "$APP_DIR"
pm2 start ecosystem.config.js --only leg-api 2>&1 | tail -5
pm2 save --force >/dev/null
sleep 6

# 8. Verificar Nginx inclui /auth/ no proxy
info "Verificando Nginx config para /auth/..."
if grep -q "location /auth/" /etc/nginx/sites-available/legislativo; then
  ok "Nginx: /auth/ já está configurado"
else
  warn "Nginx: /auth/ não encontrado — adicionando..."
  # Adicionar location /auth/ antes de location /
  sed -i '/location \/ {/i\    location \/auth\/ {\n        limit_req zone=api_rl burst=20 nodelay;\n        proxy_pass http:\/\/127.0.0.1:3001\/auth\/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n' \
    /etc/nginx/sites-available/legislativo
fi
nginx -t 2>&1 | tail -2 && systemctl reload nginx

# 9. Resultado final
sleep 5
echo ""
echo -e "${BOLD}════════════════════════════════════════════${N}"
echo ""
pm2 list 2>/dev/null | grep -E "name|leg-"
echo ""

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API (3001): ONLINE ✅"
else
  warn "API ainda offline — logs:"
  cat /var/log/legislativo/api-error-0.log 2>/dev/null | tail -20
fi

# Testar endpoint de login
echo ""
info "Testando endpoint de login..."
RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESP" | grep "HTTP:" | cut -d: -f2)
BODY=$(echo "$RESP" | grep -v "HTTP:")

if [[ "$HTTP_CODE" == "200" ]]; then
  ok "Login funcionando! HTTP $HTTP_CODE ✅"
elif [[ "$HTTP_CODE" == "401" ]]; then
  warn "HTTP 401 — credenciais incorretas (mas API respondeu)"
elif [[ "$HTTP_CODE" == "502" ]]; then
  warn "HTTP 502 — API ainda offline. Verificar:"
  echo "  pm2 logs leg-api"
else
  warn "HTTP $HTTP_CODE — Resposta: $(echo $BODY | head -c 200)"
fi
echo ""
