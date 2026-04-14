#!/usr/bin/env bash
# fix-api.sh — Correção definitiva do leg-api
# Resolve: Cannot find module @fastify/swagger e qualquer módulo faltante
set -euo pipefail

APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }
err()  { echo -e "${R}[✘]${N} $1"; }

echo ""
echo -e "${BOLD}════════════════════════════════════════${N}"
echo -e "${BOLD}  Correção Definitiva — leg-api${N}"
echo -e "${BOLD}════════════════════════════════════════${N}"
echo ""

# ── PASSO 1: Parar a API ──────────────────────────────────────────
info "Parando leg-api..."
pm2 delete leg-api 2>/dev/null || true
ok "PM2 limpo"

# ── PASSO 2: Instalar TODAS as dependências corretamente ──────────
info "Instalando dependências no workspace raiz..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2

info "Instalando dependências diretamente na API..."
cd "$API_DIR"
# Garantir que @fastify/swagger e swagger-ui estão no package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const needed = {
  '@fastify/swagger': '^8.14.0',
  '@fastify/swagger-ui': '^4.0.0',
  '@fastify/cors': '^9.0.1',
  '@fastify/jwt': '^8.0.1',
  '@fastify/multipart': '^8.3.0',
  '@fastify/rate-limit': '^9.1.0',
};
let changed = false;
for (const [k,v] of Object.entries(needed)) {
  if (!pkg.dependencies[k]) {
    pkg.dependencies[k] = v;
    console.log('Adicionado:', k);
    changed = true;
  }
}
if (changed) fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
else console.log('Todas as deps já estavam no package.json');
"

# Instalar direto na pasta da API
pnpm install --no-frozen-lockfile 2>&1 | tail -3
ok "Dependências instaladas"

# ── PASSO 3: Verificar que @fastify/swagger está acessível ────────
info "Verificando resolução de módulos..."
MODULES_TO_CHECK=(
  "@fastify/swagger"
  "@fastify/swagger-ui"
  "@fastify/cors"
  "@fastify/jwt"
  "fastify"
  "@prisma/client"
  "pino"
  "zod"
)

ALL_OK=true
for mod in "${MODULES_TO_CHECK[@]}"; do
  if node -e "require('$mod')" 2>/dev/null; then
    ok "  $mod ✓"
  else
    err "  $mod ✗ — NÃO ENCONTRADO"
    ALL_OK=false
  fi
done

if ! $ALL_OK; then
  warn "Alguns módulos não encontrados via require. Configurando NODE_PATH..."
fi

# ── PASSO 4: Gerar Prisma client ──────────────────────────────────
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -2
ok "Prisma client gerado"

# ── PASSO 5: Compilar a API com esbuild ───────────────────────────
info "Compilando API com esbuild..."
rm -rf dist/
node_modules/.bin/esbuild src/server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/server.js \
  --packages=external \
  --sourcemap \
  2>&1 | tail -3
ok "dist/server.js gerado ($(wc -c < dist/server.js | tr -d ' ') bytes)"

# ── PASSO 6: Testar inicialização real ────────────────────────────
info "Testando a API (timeout 10s)..."
NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
  timeout 10 node dist/server.js &
SERVER_PID=$!
sleep 6

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API respondendo em http://localhost:3001/health"
  RESPONSE=$(curl -s "http://localhost:3001/health")
  echo "  Resposta: $RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
else
  err "API não respondeu. Capturando erro..."
  kill $SERVER_PID 2>/dev/null || true
  # Mostrar o erro real
  echo ""
  NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
    timeout 5 node dist/server.js 2>&1 | head -20 || true
  echo ""
fi

# ── PASSO 7: Criar ecosystem.config.js com NODE_PATH ─────────────
info "Criando ecosystem.config.js com NODE_PATH correto..."
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
      kill_timeout: 5000,
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
ok "ecosystem.config.js criado"

# ── PASSO 8: Iniciar PM2 ──────────────────────────────────────────
info "Iniciando leg-api no PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js --only leg-api 2>&1 | tail -5
sleep 6

# ── PASSO 9: Verificar Nginx ──────────────────────────────────────
if ! systemctl is-active --quiet nginx; then
  info "Nginx inativo — iniciando..."
  systemctl start nginx
fi
nginx -t 2>&1 | tail -2
systemctl reload nginx
ok "Nginx recarregado"

# ── PASSO 10: Resultado final ─────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${N}"
echo -e "${BOLD}  RESULTADO FINAL${N}"
echo -e "${BOLD}════════════════════════════════════════${N}"
echo ""

pm2 list 2>/dev/null
echo ""

# Health checks
API_STATUS="OFFLINE"
WEB_STATUS="OFFLINE"
NGINX_STATUS="OFFLINE"

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  API_STATUS="ONLINE"
  ok "API (porta 3001): ${API_STATUS} ✅"
  curl -s "http://localhost:3001/health" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -6 | sed 's/^/  /'
else
  err "API (porta 3001): ${API_STATUS}"
  echo ""
  warn "Logs do PM2:"
  # Ler os arquivos de log diretamente
  cat /var/log/legislativo/api-error-0.log 2>/dev/null | tail -15 || true
  pm2 logs leg-api --lines 15 --nostream 2>&1 | tail -20
fi

echo ""

if curl -sf "http://localhost:3000" &>/dev/null; then
  WEB_STATUS="ONLINE"
  ok "Frontend (porta 3000): ${WEB_STATUS} ✅"
fi

if curl -sf "http://localhost" &>/dev/null; then
  NGINX_STATUS="ONLINE"
  ok "Nginx (porta 80): ${NGINX_STATUS} ✅"
fi

echo ""
echo -e "${BOLD}Acesso:${N}"
if [[ "$NGINX_STATUS" == "ONLINE" ]]; then
  echo "  http://62.171.161.221  ✅"
  echo "  http://62.171.161.221/api/v1  ✅"
  echo "  http://62.171.161.221/health  ✅"
fi

echo ""
echo -e "${BOLD}PM2 Startup:${N}"
pm2 save --force 2>&1 | tail -1
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root 2>&1 | grep "sudo env PATH" || true)
[[ -n "$STARTUP_CMD" ]] && eval "$STARTUP_CMD" 2>&1 | tail -1 || true
ok "PM2 configurado para iniciar no boot"
echo ""
