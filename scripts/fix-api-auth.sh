#!/usr/bin/env bash
# fix-api-auth.sh — Corrigir API após deploy de autenticação
set -euo pipefail
APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }
err()  { echo -e "${R}[✘]${N} $1"; }

echo ""
echo -e "${BOLD}  Corrigindo API — Sistema Legislativo${N}"
echo ""

# ── 0. Atualizar código PRIMEIRO ──────────────────────────────────
info "Atualizando código do GitHub..."
cd "$APP_DIR"
git fetch origin main 2>&1 | tail -1
git reset --hard origin/main 2>&1 | tail -1
ok "Código: $(git log --oneline -1 | cut -c1-50)"

# ── 1. Parar API ─────────────────────────────────────────────────
pm2 delete leg-api 2>/dev/null || true

# ── 2. Instalar dependências ──────────────────────────────────────
info "Instalando dependências..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2
cd "$API_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2

# Garantir bcryptjs e @fastify/cookie no node_modules local da API
for pkg in bcryptjs @fastify/cookie @fastify/swagger @fastify/swagger-ui; do
  if ! node -e "require('$pkg')" 2>/dev/null; then
    info "Instalando $pkg diretamente..."
    npm install "$pkg" 2>/dev/null | tail -1 || true
  fi
done
ok "Dependências OK"

# ── 3. Gerar Prisma client ────────────────────────────────────────
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -2

# ── 4. Compilar API ───────────────────────────────────────────────
info "Compilando API..."
node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external \
  2>&1 | tail -3
ok "API compilada"

# ── 5. Testar inicialização ───────────────────────────────────────
info "Testando inicialização da API..."
NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
  timeout 10 node dist/server.js &
SERVER_PID=$!
sleep 5

if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API iniciou corretamente!"
  kill $SERVER_PID 2>/dev/null || true
else
  kill $SERVER_PID 2>/dev/null || true
  err "API falhou. Erro:"
  NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
    timeout 4 node dist/server.js 2>&1 | grep -v "^{" | head -10 || true
  exit 1
fi

# ── 6. Ecosystem PM2 com NODE_PATH ────────────────────────────────
info "Criando ecosystem.config.js..."
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

# ── 7. Iniciar no PM2 ─────────────────────────────────────────────
cd "$APP_DIR"
pm2 start ecosystem.config.js --only leg-api 2>&1 | tail -5
pm2 save --force >/dev/null
sleep 5
ok "PM2 iniciado"

# ── 8. Configurar Nginx ───────────────────────────────────────────
info "Configurando Nginx..."

# Encontrar arquivo de configuração do nginx
NGINX_CONF=""
for f in \
  /etc/nginx/sites-available/legislativo \
  /etc/nginx/sites-enabled/legislativo \
  /etc/nginx/sites-available/default \
  /etc/nginx/conf.d/legislativo.conf \
  /etc/nginx/conf.d/default.conf; do
  if [[ -f "$f" ]]; then
    NGINX_CONF="$f"
    info "Nginx config encontrada: $f"
    break
  fi
done

if [[ -z "$NGINX_CONF" ]]; then
  warn "Config Nginx não encontrada. Criando em /etc/nginx/sites-available/legislativo..."
  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

  DOMAIN=$(grep DOMAIN /root/.legislativo-secrets 2>/dev/null | cut -d= -f2 || echo "pleno.morelidev.com")
  SERVER_IP=$(grep SERVER_IP /root/.legislativo-secrets 2>/dev/null | cut -d= -f2 || echo "62.171.161.221")

  # Verificar se tem SSL
  SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

  if [[ -f "$SSL_CERT" ]]; then
    cat > /etc/nginx/sites-available/legislativo << NGINX_SSL
limit_req_zone \$binary_remote_addr zone=api_rl:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web_rl:10m rate=60r/s;
upstream leg_api { server 127.0.0.1:3001; keepalive 32; }
upstream leg_web  { server 127.0.0.1:3000; keepalive 16; }

server {
    listen 80; listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2; listen [::]:443 ssl http2;
    server_name ${DOMAIN};
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    add_header Strict-Transport-Security "max-age=15768000" always;

    access_log /var/log/legislativo/nginx-access.log;
    error_log  /var/log/legislativo/nginx-error.log warn;
    client_max_body_size 50M;

    location /api/ {
        limit_req zone=api_rl burst=50 nodelay;
        proxy_pass http://leg_api/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        add_header Access-Control-Allow-Origin "https://${DOMAIN}" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,PATCH,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }
    location /auth/ {
        proxy_pass http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
    location = /health { proxy_pass http://leg_api/health; access_log off; }
    location /docs     { proxy_pass http://leg_api/docs; proxy_set_header Host \$host; }
    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    location / {
        limit_req zone=web_rl burst=100 nodelay;
        proxy_pass http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINX_SSL
  else
    cat > /etc/nginx/sites-available/legislativo << NGINX_HTTP
limit_req_zone \$binary_remote_addr zone=api_rl:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web_rl:10m rate=60r/s;
upstream leg_api { server 127.0.0.1:3001; keepalive 32; }
upstream leg_web  { server 127.0.0.1:3000; keepalive 16; }

server {
    listen 80; listen [::]:80;
    server_name ${DOMAIN} ${SERVER_IP} _;
    access_log /var/log/legislativo/nginx-access.log;
    error_log  /var/log/legislativo/nginx-error.log warn;
    client_max_body_size 50M;

    location /api/ {
        limit_req zone=api_rl burst=50 nodelay;
        proxy_pass http://leg_api/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,PATCH,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }
    location /auth/ {
        proxy_pass http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location = /health { proxy_pass http://leg_api/health; access_log off; }
    location /docs     { proxy_pass http://leg_api/docs; proxy_set_header Host \$host; }
    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    location / {
        proxy_pass http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_HTTP
  fi

  ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo
  rm -f /etc/nginx/sites-enabled/default
  NGINX_CONF="/etc/nginx/sites-available/legislativo"
fi

# Adicionar /auth/ se não existir
if ! grep -q "location /auth/" "$NGINX_CONF" 2>/dev/null; then
  warn "/auth/ não encontrado em $NGINX_CONF — adicionando..."
  python3 << PYFIX
with open('$NGINX_CONF', 'r') as f:
    c = f.read()
auth_block = '''
    location /auth/ {
        proxy_pass http://127.0.0.1:3001/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
'''
# Inserir antes de "location /"
if 'location /auth/' not in c and 'location / {' in c:
    c = c.replace('    location / {', auth_block + '    location / {', 1)
    with open('$NGINX_CONF', 'w') as f:
        f.write(c)
    print("  /auth/ adicionado")
PYFIX
fi

# Testar e recarregar nginx
mkdir -p /var/log/legislativo
nginx -t 2>&1 | tail -3
systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
ok "Nginx configurado e recarregado"

# ── 9. Resultado final ────────────────────────────────────────────
sleep 5
echo ""
echo -e "${BOLD}══════════════════════════════════════════${N}"
echo ""
pm2 list 2>/dev/null | grep -E "name|leg-"
echo ""

# Health checks
if curl -sf "http://localhost:3001/health" &>/dev/null; then
  ok "API (porta 3001): ONLINE ✅"
else
  err "API offline. Logs:"
  cat /var/log/legislativo/api-error-0.log 2>/dev/null | tail -15
fi

# Teste de login
echo ""
info "Testando login..."
HTTP=$(curl -s -o /tmp/login_test.json -w "%{http_code}" \
  -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}' 2>/dev/null)

if [[ "$HTTP" == "200" ]]; then
  ok "Login funcionando! ✅"
  python3 -c "
import json,sys
d=json.load(open('/tmp/login_test.json'))
print(f'  Usuário: {d[\"usuario\"][\"nome\"]}')
print(f'  Câmara:  {d[\"usuario\"][\"casaNome\"]}')
print(f'  Perfis:  {d[\"usuario\"][\"perfis\"]}')
" 2>/dev/null || true
elif [[ "$HTTP" == "401" ]]; then
  warn "HTTP 401 — API respondeu mas credenciais erradas"
  cat /tmp/login_test.json 2>/dev/null
else
  err "HTTP $HTTP — $(cat /tmp/login_test.json 2>/dev/null | head -c 200)"
fi

echo ""
echo -e "${BOLD}🌐 Acesso:${N}"
DOMAIN=$(grep DOMAIN /root/.legislativo-secrets 2>/dev/null | cut -d= -f2 || echo "pleno.morelidev.com")
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "  https://${DOMAIN}" || echo "  http://62.171.161.221"
echo ""
