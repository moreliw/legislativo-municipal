#!/usr/bin/env bash
# fix-api.sh — Diagnosticar e corrigir leg-api errored
set -euo pipefail
APP_DIR="/opt/legislativo"
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }
err()  { echo -e "${R}[✘]${N} $1"; }

echo ""
echo "═══════════════════════════════════════"
echo "  DIAGNÓSTICO + CORREÇÃO — leg-api"
echo "═══════════════════════════════════════"
echo ""

# ── 1. Ver logs do PM2 (razão do erro) ──────────────────────────
info "Logs recentes do leg-api:"
pm2 logs leg-api --lines 30 --nostream 2>&1 | tail -35
echo ""

# ── 2. Verificar dist/server.js ─────────────────────────────────
if [[ -f "$APP_DIR/apps/api/dist/server.js" ]]; then
  ok "dist/server.js existe ($(wc -c < $APP_DIR/apps/api/dist/server.js) bytes)"
else
  err "dist/server.js NÃO EXISTE — precisar recompilar"
fi

# ── 3. Verificar .env ────────────────────────────────────────────
info "Variáveis do .env:"
if [[ -f "$APP_DIR/apps/api/.env" ]]; then
  grep -v "SECRET\|PASSWORD\|PASS" "$APP_DIR/apps/api/.env" | head -15
else
  err ".env não encontrado!"
fi

# ── 4. Testar conexão com banco ──────────────────────────────────
info "Testando PostgreSQL..."
source /root/.legislativo-secrets 2>/dev/null || true
DB_PORT="${DB_PORT:-5432}"
if docker exec leg_postgres pg_isready -U legislativo &>/dev/null 2>&1; then
  ok "PostgreSQL container respondendo"
else
  err "PostgreSQL container não responde!"
  docker ps | grep postgres || echo "Container não está rodando!"
fi

# ── 5. Testar porta do banco ─────────────────────────────────────
for port in 5432 5433; do
  nc -z localhost $port 2>/dev/null && \
    info "Porta $port: ABERTA" || \
    info "Porta $port: fechada"
done

# ── 6. Reconstruir a API ─────────────────────────────────────────
echo ""
info "Recompilando API com esbuild..."
cd "$APP_DIR/apps/api"

# Garantir que esbuild está disponível
if [[ ! -f "node_modules/.bin/esbuild" ]]; then
  warn "esbuild não encontrado, instalando..."
  cd "$APP_DIR"
  pnpm install --no-frozen-lockfile 2>&1 | tail -2
  cd "$APP_DIR/apps/api"
fi

node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external --sourcemap \
  2>&1 && ok "API recompilada com sucesso!" || err "Erro na compilação!"

# ── 7. Testar se o server inicia ─────────────────────────────────
info "Testando inicialização da API..."
cd "$APP_DIR/apps/api"
timeout 8 node dist/server.js &
SERVER_PID=$!
sleep 4

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API inicia e responde corretamente!"
  kill $SERVER_PID 2>/dev/null || true
else
  warn "API não respondeu no teste manual. Logs:"
  kill $SERVER_PID 2>/dev/null || true
fi
cd "$APP_DIR"

# ── 8. Reiniciar PM2 ─────────────────────────────────────────────
info "Reiniciando leg-api no PM2..."
pm2 delete leg-api 2>/dev/null || true
pm2 start ecosystem.config.js --only leg-api 2>&1 | tail -5
sleep 5

# ── 9. Verificar Nginx ───────────────────────────────────────────
info "Verificando Nginx..."
if systemctl is-active --quiet nginx; then
  ok "Nginx ativo"
  nginx -t 2>&1 | tail -2
else
  warn "Nginx inativo — reiniciando..."
  systemctl start nginx
  nginx -t && systemctl reload nginx
fi

# ── 10. Resultado final ──────────────────────────────────────────
sleep 4
echo ""
echo "═══════════════════════════════════════"
echo "  RESULTADO FINAL"
echo "═══════════════════════════════════════"
echo ""

pm2 list
echo ""

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API: ONLINE ✅"
  curl -s "http://localhost:3001/health" | python3 -m json.tool 2>/dev/null | head -6
else
  err "API: ainda offline"
  info "Logs do PM2:"
  pm2 logs leg-api --lines 20 --nostream 2>&1 | tail -25
fi

echo ""
if curl -sf "http://localhost" &>/dev/null; then
  ok "Nginx/Frontend: ONLINE ✅"
else
  warn "Nginx: verificar config"
fi

echo ""
echo "  http://62.171.161.221"
echo ""
