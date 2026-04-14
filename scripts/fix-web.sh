#!/usr/bin/env bash
# fix-web.sh — Corrigir apenas o frontend sem refazer o deploy completo
set -euo pipefail
source /root/.legislativo-secrets 2>/dev/null || true
APP_DIR="/opt/legislativo"
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }

cd "$APP_DIR/apps/web"

# Swap para o build
if ! swapon --show 2>/dev/null | grep -q swap; then
  fallocate -l 2G /tmp/swap_web 2>/dev/null || dd if=/dev/zero of=/tmp/swap_web bs=1M count=2048 2>/dev/null
  chmod 600 /tmp/swap_web && mkswap /tmp/swap_web >/dev/null && swapon /tmp/swap_web
  ok "Swap 2GB ativado"
fi

info "Compilando Frontend Next.js..."
NODE_OPTIONS="--max-old-space-size=3072" \
  NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  npx next build 2>&1 | tail -8

# Copiar static files (monorepo path)
SDIR=".next/standalone/apps/web"
if [[ -d "$SDIR" ]]; then
  cp -r .next/static "$SDIR/.next/static" 2>/dev/null || true
  [[ -d "public" ]] && cp -r public "$SDIR/public" 2>/dev/null || true
  ok "Static files → $SDIR"
else
  info "standalone/apps/web não encontrado, buscando..."
  find .next/standalone -name "server.js" | grep -v node_modules
fi

# Atualizar ecosystem.config.js com path correto
cat > "$APP_DIR/ecosystem.config.js" << 'PM2'
module.exports = {
  apps: [
    {
      name: 'leg-api',
      script: 'dist/server.js',
      cwd: '/opt/legislativo/apps/api',
      instances: 2,
      exec_mode: 'cluster',
      env_file: '/opt/legislativo/apps/api/.env',
      error_file: '/var/log/legislativo/api-error.log',
      out_file: '/var/log/legislativo/api-out.log',
      max_restarts: 10, min_uptime: '10s', watch: false,
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
      max_restarts: 10, min_uptime: '10s', watch: false,
    }
  ]
}
PM2

cd "$APP_DIR"
pm2 delete leg-web 2>/dev/null || true
pm2 start ecosystem.config.js --only leg-web 2>&1 | tail -4
pm2 save --force >/dev/null

swapoff /tmp/swap_web 2>/dev/null && rm -f /tmp/swap_web 2>/dev/null || true

sleep 4
echo ""
curl -sf "http://localhost:3001/health" >/dev/null && ok "API: online" || echo "  API: verificar pm2 logs leg-api"
curl -sf "http://localhost:3000" >/dev/null && ok "Web: online" || echo "  Web: verificar pm2 logs leg-web"
curl -sf "http://localhost" >/dev/null && ok "Nginx: OK" || true
echo ""
pm2 status
echo ""
ok "Acesso: http://62.171.161.221"
