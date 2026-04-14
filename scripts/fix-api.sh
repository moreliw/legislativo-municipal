#!/usr/bin/env bash
# fix-api.sh — Corrigir leg-api: instalar deps + recompilar + reiniciar
set -euo pipefail
APP_DIR="/opt/legislativo"
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }

echo ""
echo "  Corrigindo leg-api — Cannot find module"
echo ""

# 1. Instalar deps na raiz E na pasta da API
info "Instalando dependências (monorepo + API local)..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2

cd "$APP_DIR/apps/api"
pnpm install --no-frozen-lockfile 2>&1 | tail -2
ok "node_modules da API instalado"

# 2. Gerar Prisma client
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -2
ok "Prisma client gerado"

# 3. Recompilar com esbuild (deps agora disponíveis)
info "Recompilando API..."
node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external \
  2>&1 | tail -3
ok "API recompilada ($(wc -c < dist/server.js) bytes)"

# 4. Testar inicialização
info "Testando API..."
cd "$APP_DIR/apps/api"
timeout 8 node dist/server.js &
PID=$!
sleep 5
if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API iniciando corretamente!"
  kill $PID 2>/dev/null || true
else
  warn "API não respondeu no teste — verificar logs"
  kill $PID 2>/dev/null || true
  # Mostrar erro
  timeout 4 node dist/server.js 2>&1 | head -15 || true
fi

# 5. Reiniciar PM2
cd "$APP_DIR"
info "Reiniciando PM2..."
pm2 delete leg-api 2>/dev/null || true
pm2 start ecosystem.config.js --only leg-api 2>&1 | tail -4
pm2 save --force >/dev/null
sleep 6

# 6. Verificar Nginx
if ! systemctl is-active --quiet nginx; then
  info "Reiniciando Nginx..."
  systemctl start nginx
fi
nginx -t 2>/dev/null && systemctl reload nginx

# 7. Resultado
echo ""
echo "══════════════════════════════════════"
pm2 list 2>/dev/null | grep -E "name|leg-"
echo ""

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API: ONLINE ✅"
  curl -s "http://localhost:3001/health" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -5
else
  warn "API: ainda offline. Logs:"
  pm2 logs leg-api --lines 30 --nostream 2>&1 | grep -v "^$\|last 30" | tail -20
fi

echo ""
curl -sf "http://localhost" &>/dev/null && ok "Site: ONLINE ✅ → http://62.171.161.221" || warn "Nginx: verificar"
echo ""
