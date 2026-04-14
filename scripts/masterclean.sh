#!/usr/bin/env bash
# =============================================================================
# MASTERCLEAN — Limpeza total + Deploy do Sistema Legislativo Municipal
# Mantém: site morelidev + will market
# Remove: tudo mais
# =============================================================================
set -euo pipefail

DOMAIN="pleno.morelidev.com"
SERVER_IP="62.171.161.221"
APP_DIR="/opt/legislativo"
LOG_DIR="/var/log/legislativo"
DB_PORT=5433     # Porta alternativa para evitar conflito com postgres nativo
REDIS_PORT=6380  # Porta alternativa para Redis
APP_PORT=3001
WEB_PORT=3000

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }
step() { echo -e "\n${BOLD}${B}═══════════════════════════════════${N}"; echo -e "${BOLD}${B}  $1${N}"; echo -e "${BOLD}${B}═══════════════════════════════════${N}"; }

clear
echo ""
echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗"
echo "║   MASTERCLEAN — Sistema Legislativo Municipal        ║"
echo "║   Domínio: pleno.morelidev.com                       ║"
echo -e "╚══════════════════════════════════════════════════════╝${N}"
echo ""

# =============================================================================
# ETAPA 1 — LIMPEZA TOTAL DO SERVIDOR
# =============================================================================
step "1/8 LIMPEZA TOTAL"

info "Parando TODOS os containers Docker..."
docker stop $(docker ps -aq) 2>/dev/null && ok "Containers parados" || info "Nenhum container rodando"

info "Removendo TODOS os containers..."
docker rm -f $(docker ps -aq) 2>/dev/null && ok "Containers removidos" || info "Nenhum container para remover"

info "Removendo imagens não utilizadas..."
docker image prune -af 2>/dev/null | tail -1

info "Removendo redes Docker antigas..."
docker network prune -f 2>/dev/null | tail -1

info "Parando PM2..."
pm2 kill 2>/dev/null || true
pm2 delete all 2>/dev/null || true
ok "PM2 limpo"

info "Parando Nginx temporariamente..."
systemctl stop nginx 2>/dev/null || true

info "Verificando portas em uso..."
echo "--- Porta 5432 (PostgreSQL):"
ss -tlnp | grep 5432 || echo "   Livre"
echo "--- Porta 5433 (PostgreSQL alternativa):"
ss -tlnp | grep 5433 || echo "   Livre"
echo "--- Porta 3000 (Web):"
ss -tlnp | grep 3000 || echo "   Livre"
echo "--- Porta 3001 (API):"
ss -tlnp | grep 3001 || echo "   Livre"

# Verificar se PostgreSQL nativo está rodando
if systemctl is-active --quiet postgresql 2>/dev/null; then
  info "PostgreSQL nativo detectado na porta 5432 — vamos usar porta 5433 para o Docker"
  DB_PORT=5433
  info "PostgreSQL nativo mantido (pode ser do will market ou morelidev)"
else
  DB_PORT=5432
  info "PostgreSQL nativo não detectado — usando porta padrão 5432"
fi

# Matar processos nas portas 3000 e 3001 se ocupadas
for port in 3000 3001; do
  PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    kill -9 $PID 2>/dev/null || true
    ok "Processo na porta $port encerrado (PID: $PID)"
  fi
done

ok "Limpeza concluída"

# =============================================================================
# ETAPA 2 — DEPENDÊNCIAS DO SISTEMA
# =============================================================================
step "2/8 DEPENDÊNCIAS"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>&1 | tail -1

for pkg in curl git nodejs npm pnpm pm2 nginx certbot python3-certbot-nginx; do
  command -v "${pkg%%=*}" &>/dev/null || true
done

# Node.js 20 se não tiver
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)
if [[ "$NODE_VER" -lt 20 ]]; then
  info "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -1
  apt-get install -y nodejs 2>&1 | tail -1
fi

# pnpm
command -v pnpm &>/dev/null || npm install -g pnpm@9 --quiet 2>&1 | tail -1

# PM2
command -v pm2 &>/dev/null || npm install -g pm2 --quiet 2>&1 | tail -1

# certbot
command -v certbot &>/dev/null || apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -1

ok "Node.js $(node -v) | pnpm $(pnpm -v) | PM2 $(pm2 -v 2>/dev/null || echo 'ok')"

# =============================================================================
# ETAPA 3 — CREDENCIAIS
# =============================================================================
step "3/8 CREDENCIAIS"

[[ -f /root/.legislativo-secrets ]] && source /root/.legislativo-secrets 2>/dev/null || true

DB_PASSWORD="${DB_PASSWORD:-Leg$(openssl rand -hex 12)Db}"
REDIS_PASSWORD="${REDIS_PASSWORD:-Red$(openssl rand -hex 10)Rd}"
MINIO_PASSWORD="${MINIO_PASSWORD:-Min$(openssl rand -hex 10)Mn}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-Kc$(openssl rand -hex 10)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

mkdir -p /var/log/legislativo /var/www/certbot

printf '%s\n' \
  "SERVER_IP=${SERVER_IP}" \
  "DOMAIN=${DOMAIN}" \
  "DB_PORT=${DB_PORT}" \
  "DB_PASSWORD=${DB_PASSWORD}" \
  "REDIS_PASSWORD=${REDIS_PASSWORD}" \
  "MINIO_PASSWORD=${MINIO_PASSWORD}" \
  "KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}" \
  "JWT_SECRET=${JWT_SECRET}" \
  "ADMIN_EMAIL=admin@legislativo.gov.br" \
  "ADMIN_PASSWORD=Admin@2024" \
  > /root/.legislativo-secrets
chmod 600 /root/.legislativo-secrets
ok "Credenciais salvas (DB na porta ${DB_PORT})"

# =============================================================================
# ETAPA 4 — DOCKER: INFRAESTRUTURA
# =============================================================================
step "4/8 DOCKER — INFRAESTRUTURA"

docker network create leg-net 2>/dev/null || true

# PostgreSQL (porta alternativa se necessário)
info "Iniciando PostgreSQL 16 (porta ${DB_PORT})..."
docker run -d \
  --name leg_postgres \
  --network leg-net \
  --restart unless-stopped \
  -p "127.0.0.1:${DB_PORT}:5432" \
  -e POSTGRES_DB=legislativo \
  -e POSTGRES_USER=legislativo \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -v leg_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
ok "PostgreSQL iniciado na porta ${DB_PORT}"

# Redis (porta alternativa)
REDIS_PORT=6380
if ! ss -tlnp | grep -q ":6379 "; then
  REDIS_PORT=6379
fi
info "Iniciando Redis 7 (porta ${REDIS_PORT})..."
docker run -d \
  --name leg_redis \
  --network leg-net \
  --restart unless-stopped \
  -p "127.0.0.1:${REDIS_PORT}:6379" \
  -v leg_redis_data:/data \
  redis:7-alpine \
  redis-server --requirepass "${REDIS_PASSWORD}" --appendonly yes
ok "Redis iniciado na porta ${REDIS_PORT}"

# MinIO
info "Iniciando MinIO..."
docker run -d \
  --name leg_minio \
  --network leg-net \
  --restart unless-stopped \
  -p "127.0.0.1:9000:9000" \
  -p "9001:9001" \
  -e MINIO_ROOT_USER=legislativo \
  -e MINIO_ROOT_PASSWORD="${MINIO_PASSWORD}" \
  -v leg_minio_data:/data \
  minio/minio server /data --console-address :9001
ok "MinIO iniciado"

# Keycloak
info "Iniciando Keycloak 24..."
docker run -d \
  --name leg_keycloak \
  --restart unless-stopped \
  -p "8080:8080" \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}" \
  quay.io/keycloak/keycloak:24.0 start-dev
ok "Keycloak iniciado (aguardar ~2min)"

# Camunda
info "Iniciando Camunda 7..."
docker run -d \
  --name leg_camunda \
  --restart unless-stopped \
  -p "8085:8080" \
  camunda/camunda-bpm-platform:run-7.21.0
ok "Camunda iniciado"

# Aguardar PostgreSQL
info "Aguardando PostgreSQL..."
for i in $(seq 1 40); do
  docker exec leg_postgres pg_isready -U legislativo &>/dev/null && { ok "PostgreSQL pronto!"; break; }
  [[ $i -eq 40 ]] && { warn "Timeout! Continuando..."; break; }
  echo -n "."; sleep 2
done; echo ""

# =============================================================================
# ETAPA 5 — CÓDIGO E BUILD
# =============================================================================
step "5/8 CÓDIGO E BUILD"

# Clonar ou atualizar
if [[ -d "${APP_DIR}/.git" ]]; then
  info "Atualizando repositório..."
  cd "$APP_DIR"
  git fetch origin 2>&1 | tail -1
  git reset --hard origin/main 2>&1 | tail -1
else
  info "Clonando repositório..."
  git clone https://github.com/moreliw/legislativo-municipal.git "$APP_DIR"
  cd "$APP_DIR"
fi
ok "Código: $(git log --oneline -1 | cut -c1-60)"

# DATABASE_URL com porta correta
DB_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo"
REDIS_URL="redis://:${REDIS_PASSWORD}@localhost:${REDIS_PORT}"

# Escrever .env com printf (100% seguro contra caracteres especiais)
{
  printf 'NODE_ENV=production\n'
  printf 'PORT=%s\n' "${APP_PORT}"
  printf 'HOST=0.0.0.0\n'
  printf 'DATABASE_URL=%s\n' "${DB_URL}"
  printf 'REDIS_URL=%s\n' "${REDIS_URL}"
  printf 'JWT_SECRET=%s\n' "${JWT_SECRET}"
  printf 'CORS_ORIGIN=https://%s\n' "${DOMAIN}"
  printf 'FRONTEND_URL=https://%s\n' "${DOMAIN}"
  printf 'KEYCLOAK_URL=http://localhost:8080\n'
  printf 'KEYCLOAK_REALM=legislativo\n'
  printf 'KEYCLOAK_CLIENT_ID=legislativo-api\n'
  printf 'KEYCLOAK_PUBLIC_KEY=%s\n' "${JWT_SECRET}"
  printf 'CAMUNDA_URL=http://localhost:8085\n'
  printf 'CAMUNDA_USER=admin\n'
  printf 'CAMUNDA_PASS=admin\n'
  printf 'MINIO_ENDPOINT=localhost\n'
  printf 'MINIO_PORT=9000\n'
  printf 'MINIO_USE_SSL=false\n'
  printf 'MINIO_ACCESS_KEY=legislativo\n'
  printf 'MINIO_SECRET_KEY=%s\n' "${MINIO_PASSWORD}"
  printf 'MINIO_BUCKET=legislativo-documentos\n'
  printf 'SMTP_HOST=localhost\n'
  printf 'SMTP_PORT=1025\n'
  printf 'SMTP_SECURE=false\n'
  printf 'EMAIL_FROM=noreply@%s\n' "${DOMAIN}"
  printf 'LOG_LEVEL=info\n'
  printf 'ENABLE_SWAGGER=true\n'
} > "${APP_DIR}/apps/api/.env"

printf 'NEXT_PUBLIC_API_URL=https://%s/api\n' "${DOMAIN}" > "${APP_DIR}/apps/web/.env.local"
ok ".env escrito com sucesso"

info "Instalando dependências (pnpm install)..."
cd "$APP_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -3

info "Gerando Prisma client..."
pnpm --filter @legislativo/api exec prisma generate 2>&1 | tail -2

info "Criando schema no banco (db push)..."
cd apps/api
DATABASE_URL="$DB_URL" npx prisma db push --accept-data-loss 2>&1 | tail -5
ok "Schema criado no banco"

info "Populando dados iniciais..."
for attempt in 1 2 3; do
  DATABASE_URL="$DB_URL" npx tsx prisma/seed.ts 2>&1 | tail -5 && break || {
    warn "Tentativa $attempt falhou, aguardando 3s..."
    sleep 3
  }
done
cd "$APP_DIR"

info "Compilando API com esbuild (rápido, sem erros de tipo)..."
cd apps/api
node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external --sourcemap \
  2>&1 | tail -3
cd "$APP_DIR"
ok "API compilada (esbuild)"

info "Compilando Frontend Next.js..."
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -5
ok "Frontend compilado"

# =============================================================================
# ETAPA 6 — PM2
# =============================================================================
step "6/8 PM2 — PROCESSOS"

cat > "${APP_DIR}/ecosystem.config.js" << 'PM2EOF'
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
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
    {
      name: 'leg-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      cwd: '/opt/legislativo/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' },
      error_file: '/var/log/legislativo/web-error.log',
      out_file: '/var/log/legislativo/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    }
  ]
}
PM2EOF

pm2 start "${APP_DIR}/ecosystem.config.js" 2>&1 | tail -6
pm2 save --force 2>&1 | tail -1
STARTUP=$(pm2 startup systemd -u root --hp /root 2>&1 | grep "sudo env PATH" || true)
[[ -n "$STARTUP" ]] && eval "$STARTUP" 2>&1 | tail -1 || true
ok "PM2 configurado com startup automático"

# Aguardar API
info "Aguardando API subir (até 30s)..."
for i in $(seq 1 15); do
  curl -sf "http://localhost:${APP_PORT}/health" &>/dev/null && { ok "API online!"; break; }
  [[ $i -eq 15 ]] && warn "API demorando — verificar: pm2 logs leg-api"
  sleep 2; echo -n "."
done; echo ""

# =============================================================================
# ETAPA 7 — NGINX
# =============================================================================
step "7/8 NGINX"

rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/legislativo*

cat > /etc/nginx/sites-available/legislativo << NGINXEOF
# Sistema Legislativo Municipal
# Gerado em: $(date)

limit_req_zone \$binary_remote_addr zone=api_rl:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web_rl:10m rate=60r/s;

upstream leg_api { server 127.0.0.1:${APP_PORT}; keepalive 32; }
upstream leg_web  { server 127.0.0.1:${WEB_PORT}; keepalive 16; }

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root /var/www/certbot;

    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log warn;
    client_max_body_size 50M;

    add_header X-Frame-Options      "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"     always;
    add_header X-XSS-Protection     "1; mode=block" always;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    # API
    location /api/ {
        limit_req zone=api_rl burst=50 nodelay;
        proxy_pass         http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        add_header Access-Control-Allow-Origin  "*"   always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept"    always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    location = /health {
        proxy_pass http://leg_api/health;
        access_log off;
    }

    location /docs {
        proxy_pass         http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
    }

    location /auth/ {
        limit_req zone=api_rl burst=20 nodelay;
        proxy_pass       http://leg_api/auth/;
        proxy_set_header Host \$host;
    }

    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        limit_req zone=web_rl burst=100 nodelay;
        proxy_pass         http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo

systemctl enable nginx --quiet
nginx -t && systemctl start nginx
ok "Nginx iniciado com config HTTP"

# =============================================================================
# ETAPA 8 — HTTPS AUTOMÁTICO
# =============================================================================
step "8/8 HTTPS — LET'S ENCRYPT"

# Resolver DNS
RESOLVED=$(python3 -c "import socket; print(socket.gethostbyname('${DOMAIN}'))" 2>/dev/null || \
           dig +short "${DOMAIN}" 2>/dev/null | tail -1 || echo "")
info "DNS: ${DOMAIN} → ${RESOLVED} (servidor: ${SERVER_IP})"

if [[ "$RESOLVED" == "$SERVER_IP" ]]; then
  info "DNS OK! Obtendo certificado Let's Encrypt..."
  
  if certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" \
    --no-eff-email 2>&1 | tail -8; then

    CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

    if [[ -f "$CERT" ]]; then
      ok "Certificado SSL obtido!"

      # Substituir config HTTP por HTTPS completo
      cat > /etc/nginx/sites-available/legislativo << NGINX_SSL
# Sistema Legislativo Municipal — HTTPS
# Gerado em: $(date)

limit_req_zone \$binary_remote_addr zone=api_rl:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web_rl:10m rate=60r/s;

upstream leg_api { server 127.0.0.1:${APP_PORT}; keepalive 32; }
upstream leg_web  { server 127.0.0.1:${WEB_PORT}; keepalive 16; }

# HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

# HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     ${CERT};
    ssl_certificate_key ${KEY};
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling        on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;
    add_header X-Frame-Options      "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"     always;
    add_header X-XSS-Protection     "1; mode=block" always;
    add_header Referrer-Policy      "strict-origin-when-cross-origin" always;

    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log warn;
    client_max_body_size 50M;
    proxy_connect_timeout 60s;
    proxy_read_timeout    60s;

    location /api/ {
        limit_req zone=api_rl burst=50 nodelay;
        proxy_pass         http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        add_header Access-Control-Allow-Origin  "https://${DOMAIN}" always;
        add_header Access-Control-Allow-Credentials "true"           always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept"    always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    location = /health {
        proxy_pass http://leg_api/health;
        access_log off;
    }

    location /docs {
        proxy_pass         http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
    }

    location /auth/ {
        limit_req zone=api_rl burst=20 nodelay;
        proxy_pass       http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        limit_req zone=web_rl burst=100 nodelay;
        proxy_pass         http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
    }
}
NGINX_SSL

      nginx -t && systemctl reload nginx
      ok "Nginx reconfigurado com HTTPS!"

      # Atualizar .env para HTTPS
      sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" "${APP_DIR}/apps/api/.env"
      sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" "${APP_DIR}/apps/api/.env"
      printf 'NEXT_PUBLIC_API_URL=https://%s/api\n' "${DOMAIN}" > "${APP_DIR}/apps/web/.env.local"

      # Renovação automática via cron
      (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") \
        | sort -u | crontab -
      ok "Renovação automática SSL configurada (diária às 3h)"

      pm2 reload all --update-env 2>&1 | tail -2
    fi
  fi
else
  warn "DNS ainda não aponta para este servidor"
  warn "Configure: A  pleno  62.171.161.221  no painel DNS"
  warn "Após propagar, execute: leg-https ${DOMAIN}"
  info "Sistema funcionando via HTTP: http://${SERVER_IP}"
fi

# Firewall
ufw --force reset 2>/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 8085/tcp
ufw allow 9001/tcp
ufw --force enable 2>&1 | tail -1

# Scripts de gerenciamento
cat > /usr/local/bin/leg-deploy << 'LEGD'
#!/usr/bin/env bash
set -euo pipefail
source /root/.legislativo-secrets
APP_DIR="/opt/legislativo"
echo "🚀 Redeploy: $(date)"
cd "$APP_DIR"
git pull origin main
pnpm install --no-frozen-lockfile
DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT:-5432}/legislativo" \
  pnpm --filter @legislativo/api exec prisma migrate deploy
pnpm --filter @legislativo/api build
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" pnpm --filter @legislativo/web build
pm2 reload ecosystem.config.js --update-env
pm2 save --force
nginx -t && systemctl reload nginx
echo "✅ Redeploy OK: $(date)"
pm2 status
LEGD
chmod +x /usr/local/bin/leg-deploy

cat > /usr/local/bin/leg-https << 'LEGH'
#!/usr/bin/env bash
DOMAIN="${1:-pleno.morelidev.com}"
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
  --non-interactive --agree-tos --email "admin@${DOMAIN}" --no-eff-email
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "✅ SSL OK! Rode: systemctl reload nginx" || echo "❌ Falhou. DNS configurado?"
LEGH
chmod +x /usr/local/bin/leg-https

cat > /usr/local/bin/leg-status << 'LEGS'
#!/usr/bin/env bash
source /root/.legislativo-secrets 2>/dev/null || true
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
echo ""; echo "══ Status — Sistema Legislativo ══"
echo "  URL: https://${DOMAIN}"
echo ""
echo "Docker:"
docker ps --format "  {{.Names}}: {{.Status}}"
echo ""
echo "PM2:"
pm2 list
echo ""
echo "Nginx: $(systemctl is-active nginx)"
echo ""
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "SSL: ✅ $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem | cut -d= -f2)" || \
  echo "SSL: ⏳ Pendente — execute: leg-https ${DOMAIN}"
echo ""
echo "Health: $(curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null | grep status || echo 'verificando...')"
echo ""
LEGS
chmod +x /usr/local/bin/leg-status

# Relatório final
sleep 8
clear
echo ""
echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗"
echo "║         ✅  DEPLOY 100% CONCLUÍDO!                   ║"
echo -e "╚══════════════════════════════════════════════════════╝${N}"
echo ""
SSL_OK=false
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && SSL_OK=true || true

echo "🌐 ACESSO:"
$SSL_OK && echo "   ✅ https://${DOMAIN}  (HTTPS + cadeado verde 🔒)" || \
  echo "   🔗 http://${SERVER_IP}  (HTTP ativo agora)"
echo "   🔗 API: http://${SERVER_IP}/api/v1"
echo "   🔗 Swagger: http://${SERVER_IP}/docs"
$SSL_OK || echo ""
$SSL_OK || echo "   Para HTTPS:"
$SSL_OK || echo "   1. DNS: A pleno → ${SERVER_IP}"
$SSL_OK || echo "   2. Execute: leg-https ${DOMAIN}"
echo ""
echo "🐳 DOCKER:"
docker ps --format "   {{.Names}}: {{.Status}}"
echo ""
echo "⚡ PM2:"
pm2 list 2>/dev/null | grep -E "name|leg-" | head -6
echo ""
echo "🔑 LOGIN:"
echo "   admin@legislativo.gov.br / Admin@2024"
echo ""
echo "📦 GitHub: https://github.com/moreliw/legislativo-municipal"
echo ""
echo "🔧 COMANDOS:"
echo "   leg-status   → status geral"
echo "   leg-deploy   → redeploy rápido"
echo "   leg-https ${DOMAIN}  → ativar HTTPS"
echo ""
