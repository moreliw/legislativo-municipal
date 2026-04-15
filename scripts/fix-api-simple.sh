#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"

echo "=== Corrigindo API ==="

# 1. Parar
pm2 delete leg-api 2>/dev/null || true

# 2. Atualizar código (pega dist/server.js correto do git)
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
echo "Código: $(git log --oneline -1)"
echo "dist/server.js: $(wc -c < $API_DIR/dist/server.js) bytes"

# 3. Verificar que o bundle está correto (sem fp, com decorateRequest simples)
echo ""
echo "Verificando bundle:"
grep "decorateRequest\|hasDecorator\|fp2\b" "$API_DIR/dist/server.js" | head -5 || echo "(nenhuma ocorrência de fp2)"

# 4. Instalar deps
cd "$API_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -1

# 5. Gerar Prisma
npx prisma generate 2>&1 | tail -1

# 6. Testar iniciando direto
echo ""
echo "Testando startup..."
NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
  timeout 8 node dist/server.js &
PID=$!
sleep 5

RESULT="FALHOU"
if curl -sf http://localhost:3001/health 2>/dev/null; then
  RESULT="OK"
fi

kill $PID 2>/dev/null || true

if [[ "$RESULT" == "OK" ]]; then
  echo ""
  echo "✅ API inicia sem erros!"
else
  echo ""
  echo "❌ Erro ao iniciar:"
  NODE_PATH="$API_DIR/node_modules:$APP_DIR/node_modules" \
    timeout 3 node dist/server.js 2>&1 | grep -v "^{" | head -10 || true
  exit 1
fi

# 7. Ecosystem PM2
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

# 8. Iniciar PM2
cd "$APP_DIR"
pm2 start ecosystem.config.js --only leg-api
pm2 save --force >/dev/null
sleep 5

# 9. Nginx
source /root/.legislativo-secrets 2>/dev/null || true
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/log/legislativo

if [[ -f "$SSL_CERT" ]]; then
cat > /etc/nginx/sites-available/legislativo << NGINX
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
  ssl_certificate ${SSL_CERT};
  ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_cache shared:SSL:10m;
  add_header Strict-Transport-Security "max-age=15768000" always;
  access_log /var/log/legislativo/nginx-access.log;
  error_log  /var/log/legislativo/nginx-error.log warn;
  client_max_body_size 50M;
  location /api/ {
    limit_req zone=api_rl burst=50 nodelay;
    proxy_pass http://leg_api/api/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    add_header Access-Control-Allow-Origin "https://${DOMAIN}" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,PATCH,OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept" always;
    if (\$request_method = OPTIONS) { return 204; }
  }
  location = /health { proxy_pass http://leg_api/health; access_log off; }
  location /docs { proxy_pass http://leg_api/docs; proxy_set_header Host \$host; }
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
NGINX
else
cat > /etc/nginx/sites-available/legislativo << NGINX2
limit_req_zone \$binary_remote_addr zone=api_rl:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web_rl:10m rate=60r/s;
upstream leg_api { server 127.0.0.1:3001; keepalive 32; }
upstream leg_web  { server 127.0.0.1:3000; keepalive 16; }
server {
  listen 80; listen [::]:80;
  server_name ${DOMAIN} _;
  access_log /var/log/legislativo/nginx-access.log;
  error_log  /var/log/legislativo/nginx-error.log warn;
  client_max_body_size 50M;
  location /api/ {
    limit_req zone=api_rl burst=50 nodelay;
    proxy_pass http://leg_api/api/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,PATCH,OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept" always;
    if (\$request_method = OPTIONS) { return 204; }
  }
  location = /health { proxy_pass http://leg_api/health; access_log off; }
  location /docs { proxy_pass http://leg_api/docs; proxy_set_header Host \$host; }
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
  }
}
NGINX2
fi

ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t 2>&1 | tail -2 && systemctl reload nginx

# 10. Resultado
echo ""
echo "============================================"
pm2 list | grep -E "name|leg-"
echo ""

if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
  echo "✅ API: ONLINE"
  # Teste login
  HTTP=$(curl -s -o /tmp/lr.json -w "%{http_code}" \
    -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}' 2>/dev/null)
  if [[ "$HTTP" == "200" ]]; then
    echo "✅ Login: FUNCIONANDO"
    python3 -c "
import json
d=json.load(open('/tmp/lr.json'))
u=d['usuario']
print(f'  Nome: {u[\"nome\"]}')
print(f'  Câmara: {u[\"casaNome\"]}')
" 2>/dev/null || true
  else
    echo "❌ Login HTTP $HTTP"
    cat /tmp/lr.json
  fi
else
  echo "❌ API offline"
  cat /var/log/legislativo/api-error-0.log 2>/dev/null | tail -20
fi

NGINX_OK=$(curl -sf http://localhost >/dev/null 2>&1 && echo "✅" || echo "❌")
echo "$NGINX_OK Nginx/Frontend"
echo ""
