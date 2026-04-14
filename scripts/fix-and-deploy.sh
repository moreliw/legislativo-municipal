#!/usr/bin/env bash
# Script de correção e deploy completo para o servidor Contabo
# Executa tudo do zero de forma robusta
set -euo pipefail

DOMAIN="pleno.morelidev.com"
SERVER_IP="62.171.161.221"
APP_DIR="/opt/legislativo"
LOG_DIR="/var/log/legislativo"
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }
step() { echo -e "\n${BOLD}${B}════ $1 ════${N}"; }

echo ""
echo -e "${BOLD}${G}  Sistema Legislativo Municipal — Deploy Completo${N}"
echo -e "  Domínio: ${DOMAIN} | IP: ${SERVER_IP}"
echo ""

# ════ ETAPA 1: LIMPAR ESTADO ANTERIOR ════════════════════════════
step "LIMPEZA"
info "Removendo containers antigos..."
for c in leg_postgres leg_redis leg_minio leg_keycloak leg_camunda; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
    docker stop "$c" 2>/dev/null || true
    docker rm -f "$c" 2>/dev/null || true
    ok "Removido: $c"
  fi
done

# Parar PM2
pm2 delete all 2>/dev/null || true

mkdir -p "$LOG_DIR" /var/www/certbot
ok "Limpeza concluída"

# ════ ETAPA 2: CARREGAR / GERAR CREDENCIAIS ═══════════════════════
step "CREDENCIAIS"
[[ -f /root/.legislativo-secrets ]] && source /root/.legislativo-secrets 2>/dev/null || true

# Gerar apenas o que falta
DB_PASSWORD="${DB_PASSWORD:-Leg$(openssl rand -hex 12)Db}"
REDIS_PASSWORD="${REDIS_PASSWORD:-Red$(openssl rand -hex 10)Rd}"
MINIO_PASSWORD="${MINIO_PASSWORD:-Min$(openssl rand -hex 10)Mn}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-Kc$(openssl rand -hex 12)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

# Salvar tudo (usar printf para evitar problemas com heredoc e chars especiais)
printf "SERVER_IP=%s\n" "$SERVER_IP" > /root/.legislativo-secrets
printf "DOMAIN=%s\n" "$DOMAIN" >> /root/.legislativo-secrets
printf "DB_PASSWORD=%s\n" "$DB_PASSWORD" >> /root/.legislativo-secrets
printf "REDIS_PASSWORD=%s\n" "$REDIS_PASSWORD" >> /root/.legislativo-secrets
printf "MINIO_PASSWORD=%s\n" "$MINIO_PASSWORD" >> /root/.legislativo-secrets
printf "KEYCLOAK_ADMIN_PASSWORD=%s\n" "$KEYCLOAK_ADMIN_PASSWORD" >> /root/.legislativo-secrets
printf "JWT_SECRET=%s\n" "$JWT_SECRET" >> /root/.legislativo-secrets
printf "ADMIN_EMAIL=admin@legislativo.gov.br\n" >> /root/.legislativo-secrets
printf "ADMIN_PASSWORD=Admin@2024\n" >> /root/.legislativo-secrets
chmod 600 /root/.legislativo-secrets
ok "Credenciais salvas"

# ════ ETAPA 3: DOCKER — INFRAESTRUTURA ════════════════════════════
step "DOCKER — INFRAESTRUTURA"

docker network create leg-net 2>/dev/null || true

info "Iniciando PostgreSQL 16..."
docker run -d \
  --name leg_postgres \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:5432:5432 \
  -e POSTGRES_DB=legislativo \
  -e POSTGRES_USER=legislativo \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -v leg_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
ok "PostgreSQL iniciado"

info "Iniciando Redis 7..."
docker run -d \
  --name leg_redis \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:6379:6379 \
  -v leg_redis_data:/data \
  redis:7-alpine \
  redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes
ok "Redis iniciado"

info "Iniciando MinIO..."
docker run -d \
  --name leg_minio \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=legislativo \
  -e MINIO_ROOT_PASSWORD="$MINIO_PASSWORD" \
  -v leg_minio_data:/data \
  minio/minio server /data --console-address :9001
ok "MinIO iniciado"

info "Iniciando Keycloak 24..."
docker run -d \
  --name leg_keycloak \
  --restart unless-stopped \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  quay.io/keycloak/keycloak:24.0 start-dev
ok "Keycloak iniciado (pode demorar 2min)"

info "Iniciando Camunda 7..."
docker run -d \
  --name leg_camunda \
  --restart unless-stopped \
  -p 8085:8080 \
  camunda/camunda-bpm-platform:run-7.21.0
ok "Camunda iniciado"

# Aguardar PostgreSQL
info "Aguardando PostgreSQL ficar pronto..."
for i in $(seq 1 30); do
  docker exec leg_postgres pg_isready -U legislativo &>/dev/null && { ok "PostgreSQL pronto!"; break; }
  [[ $i -eq 30 ]] && warn "Timeout — continuando mesmo assim"
  echo -n "."; sleep 2
done; echo ""

# ════ ETAPA 4: CÓDIGO DO PROJETO ══════════════════════════════════
step "CÓDIGO DO PROJETO"

if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando repositório..."
  cd "$APP_DIR" && git fetch origin && git reset --hard origin/main
else
  info "Clonando repositório..."
  git clone https://github.com/moreliw/legislativo-municipal.git "$APP_DIR"
fi
cd "$APP_DIR"
ok "Código: $(git log --oneline -1)"

# ════ ETAPA 5: VARIÁVEIS DE AMBIENTE ══════════════════════════════
step "VARIÁVEIS DE AMBIENTE"

# Usar printf para escrever o .env (evita problemas com chars especiais em heredoc)
printf "NODE_ENV=production\n"                                    > apps/api/.env
printf "PORT=3001\n"                                             >> apps/api/.env
printf "HOST=0.0.0.0\n"                                         >> apps/api/.env
printf "DATABASE_URL=postgresql://legislativo:%s@localhost:5432/legislativo\n" \
  "$DB_PASSWORD"                                                 >> apps/api/.env
printf "REDIS_URL=redis://:%s@localhost:6379\n" \
  "$REDIS_PASSWORD"                                              >> apps/api/.env
printf "JWT_SECRET=%s\n"              "$JWT_SECRET"              >> apps/api/.env
printf "CORS_ORIGIN=https://%s\n"     "$DOMAIN"                  >> apps/api/.env
printf "FRONTEND_URL=https://%s\n"    "$DOMAIN"                  >> apps/api/.env
printf "KEYCLOAK_URL=http://localhost:8080\n"                    >> apps/api/.env
printf "KEYCLOAK_REALM=legislativo\n"                            >> apps/api/.env
printf "KEYCLOAK_CLIENT_ID=legislativo-api\n"                    >> apps/api/.env
printf "KEYCLOAK_PUBLIC_KEY=%s\n"     "$JWT_SECRET"              >> apps/api/.env
printf "CAMUNDA_URL=http://localhost:8085\n"                     >> apps/api/.env
printf "CAMUNDA_USER=admin\n"                                    >> apps/api/.env
printf "CAMUNDA_PASS=admin\n"                                    >> apps/api/.env
printf "MINIO_ENDPOINT=localhost\n"                              >> apps/api/.env
printf "MINIO_PORT=9000\n"                                       >> apps/api/.env
printf "MINIO_USE_SSL=false\n"                                   >> apps/api/.env
printf "MINIO_ACCESS_KEY=legislativo\n"                          >> apps/api/.env
printf "MINIO_SECRET_KEY=%s\n"        "$MINIO_PASSWORD"          >> apps/api/.env
printf "MINIO_BUCKET=legislativo-documentos\n"                   >> apps/api/.env
printf "SMTP_HOST=localhost\n"                                   >> apps/api/.env
printf "SMTP_PORT=1025\n"                                        >> apps/api/.env
printf "SMTP_SECURE=false\n"                                     >> apps/api/.env
printf "EMAIL_FROM=noreply@%s\n"      "$DOMAIN"                  >> apps/api/.env
printf "LOG_LEVEL=info\n"                                        >> apps/api/.env
printf "ENABLE_SWAGGER=true\n"                                   >> apps/api/.env

printf "NEXT_PUBLIC_API_URL=https://%s/api\n" "$DOMAIN" > apps/web/.env.local
ok ".env configurado com printf (sem problemas de chars especiais)"

# ════ ETAPA 6: BUILD DA API ════════════════════════════════════════
step "BUILD DA API"

info "Instalando dependências..."
pnpm install --frozen-lockfile 2>&1 | tail -2

info "Gerando Prisma client..."
pnpm --filter @legislativo/api exec prisma generate 2>&1 | tail -2

info "Migrations do banco..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -3 || \
  pnpm --filter @legislativo/api exec prisma db push --accept-data-loss 2>&1 | tail -3

info "Seed de dados iniciais..."
cd apps/api && pnpm exec tsx prisma/seed.ts 2>&1 | tail -5; cd "$APP_DIR"

info "Build TypeScript..."
pnpm --filter @legislativo/api build 2>&1 | tail -3
ok "API compilada"

# ════ ETAPA 7: BUILD DO FRONTEND ══════════════════════════════════
step "BUILD DO FRONTEND"
info "Build Next.js para produção..."
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -5
ok "Frontend compilado"

# ════ ETAPA 8: PM2 ════════════════════════════════════════════════
step "PM2 — PROCESSOS"

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
      script: 'node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
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

pm2 start "$APP_DIR/ecosystem.config.js" 2>&1 | tail -5
pm2 save --force 2>&1 | tail -1

# Startup automático no boot
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root 2>&1 | grep "^sudo env" || true)
if [[ -n "$STARTUP_CMD" ]]; then
  eval "$STARTUP_CMD" 2>&1 | tail -1
fi
ok "PM2 configurado (startup automático ativo)"

# Aguardar API subir
info "Aguardando API iniciar..."
for i in $(seq 1 20); do
  curl -sf "http://localhost:3001/health" &>/dev/null && { ok "API respondendo!"; break; }
  [[ $i -eq 20 ]] && warn "API demorando — verifique: pm2 logs leg-api"
  sleep 2; echo -n "."
done; echo ""

# ════ ETAPA 9: NGINX ══════════════════════════════════════════════
step "NGINX — PROXY REVERSO"

rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/legislativo << NGINXCONF
# Sistema Legislativo Municipal — $(date)
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

upstream leg_api { server 127.0.0.1:3001; keepalive 32; }
upstream leg_web  { server 127.0.0.1:3000; keepalive 16; }

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${SERVER_IP} _;

    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log warn;

    client_max_body_size 50M;
    proxy_connect_timeout 60s;
    proxy_read_timeout    60s;

    add_header X-Frame-Options      "SAMEORIGIN"   always;
    add_header X-Content-Type-Options "nosniff"    always;
    add_header X-XSS-Protection     "1; mode=block" always;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass         http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        add_header Access-Control-Allow-Origin  "https://${DOMAIN}" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    location /health {
        proxy_pass http://leg_api/health;
        proxy_set_header Host \$host;
        access_log off;
    }

    location /docs {
        proxy_pass         http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
    }

    location /auth/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass       http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        limit_req zone=web burst=100 nodelay;
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
NGINXCONF

ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo
nginx -t && systemctl reload nginx
ok "Nginx configurado (HTTP ativo)"

# ════ ETAPA 10: HTTPS COM CERTBOT ═════════════════════════════════
step "HTTPS — CERTBOT (LET'S ENCRYPT)"

RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | tail -1 || \
              nslookup "$DOMAIN" 2>/dev/null | grep "^Address:" | tail -1 | awk '{print $2}' || \
              python3 -c "import socket; print(socket.gethostbyname('$DOMAIN'))" 2>/dev/null || \
              echo "")

info "DNS: $DOMAIN → $RESOLVED_IP (servidor: $SERVER_IP)"

if [[ "$RESOLVED_IP" == "$SERVER_IP" ]]; then
  info "DNS OK! Obtendo certificado SSL..."
  certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" \
    --no-eff-email 2>&1 | tail -5

  if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    ok "Certificado SSL obtido! Configurando HTTPS..."

    cat > /etc/nginx/sites-available/legislativo << NGINX_SSL
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

upstream leg_api { server 127.0.0.1:3001; keepalive 32; }
upstream leg_web  { server 127.0.0.1:3000; keepalive 16; }

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$server_name\$request_uri; }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling        on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains" always;
    add_header X-Frame-Options           "SAMEORIGIN"    always;
    add_header X-Content-Type-Options    "nosniff"       always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log warn;
    client_max_body_size 50M;

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass         http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        add_header Access-Control-Allow-Origin  "https://${DOMAIN}" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    location /health {
        proxy_pass http://leg_api/health;
        access_log off;
    }

    location /docs {
        proxy_pass         http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
    }

    location /auth/ {
        limit_req zone=api burst=20 nodelay;
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
        limit_req zone=web burst=100 nodelay;
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

    # Atualizar .env com HTTPS
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" apps/api/.env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" apps/api/.env
    printf "NEXT_PUBLIC_API_URL=https://%s/api\n" "$DOMAIN" > apps/web/.env.local
    pm2 reload all --update-env 2>&1 | tail -2

    # Renovação automática
    echo "0 3 * * * certbot renew --quiet && systemctl reload nginx" | crontab -
    ok "Renovação automática configurada (todo dia às 3h)"
  else
    warn "Certbot falhou. Verifique o DNS e rode: certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
  fi
else
  warn "DNS $DOMAIN → $RESOLVED_IP (esperado: $SERVER_IP)"
  warn "Configure o registro A no seu provedor de DNS e aguarde propagar (até 48h)"
  warn "Após propagar, rode: leg-https ${DOMAIN}"
fi

# ════ FIREWALL ════════════════════════════════════════════════════
step "FIREWALL UFW"
ufw --force reset 2>/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 8085/tcp
ufw allow 9001/tcp
ufw --force enable
ok "Firewall configurado"

# ════ SCRIPTS AUXILIARES ══════════════════════════════════════════
step "SCRIPTS AUXILIARES"

# leg-deploy: redeploy rápido
cat > /usr/local/bin/leg-deploy << 'RDEPLOY'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/legislativo"
echo "🚀 Redeploy iniciado: $(date)"
cd "$APP_DIR"
git pull origin main 2>&1 | tail -3
pnpm install --frozen-lockfile 2>&1 | tail -2
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -2
pnpm --filter @legislativo/api build 2>&1 | tail -3
source /root/.legislativo-secrets
NEXT_PUBLIC_API_URL="https://${DOMAIN:-pleno.morelidev.com}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -5
pm2 reload ecosystem.config.js --update-env 2>&1 | tail -3
pm2 save --force 2>&1 | tail -1
nginx -t && systemctl reload nginx
echo "✅ Redeploy concluído: $(date)"
pm2 status
RDEPLOY
chmod +x /usr/local/bin/leg-deploy

# leg-https: ativar HTTPS após DNS propagar
cat > /usr/local/bin/leg-https << 'RHTTPS'
#!/usr/bin/env bash
DOMAIN="${1:-pleno.morelidev.com}"
set -euo pipefail
LOG_DIR="/var/log/legislativo"
echo "→ Obtendo certificado SSL para $DOMAIN..."
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
  --non-interactive --agree-tos --email "admin@${DOMAIN}" --no-eff-email
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "❌ Falhou. DNS configurado? Execute: dig +short $DOMAIN"
  exit 1
fi
echo "✅ Certificado obtido!"

sed -i "s|server_name ${DOMAIN}.*|server_name ${DOMAIN};|" /etc/nginx/sites-available/legislativo
sed -i "/listen 80;/a\    location /.well-known/acme-challenge/ { root /var/www/certbot; }\n    location / { return 301 https://\$server_name\$request_uri; }" \
  /etc/nginx/sites-available/legislativo 2>/dev/null || true

cat > /etc/nginx/sites-available/legislativo-ssl-block << SSLBLOCK
# Adicionado por leg-https em $(date)
server {
    listen 443 ssl http2; listen [::]:443 ssl http2;
    server_name ${DOMAIN};
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    add_header Strict-Transport-Security "max-age=15768000" always;
    access_log ${LOG_DIR}/nginx-access.log;
    error_log ${LOG_DIR}/nginx-error.log;
    client_max_body_size 50M;
    location /api/  { proxy_pass http://127.0.0.1:3001/api/; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto https; }
    location /health { proxy_pass http://127.0.0.1:3001/health; access_log off; }
    location /docs   { proxy_pass http://127.0.0.1:3001/docs; proxy_set_header Host \$host; }
    location /auth/  { proxy_pass http://127.0.0.1:3001/auth/; proxy_set_header Host \$host; }
    location /_next/static/ { proxy_pass http://127.0.0.1:3000; add_header Cache-Control "public, max-age=31536000, immutable"; }
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto https; }
}
SSLBLOCK
ln -sf /etc/nginx/sites-available/legislativo-ssl-block /etc/nginx/sites-enabled/legislativo-ssl-block

sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" /opt/legislativo/apps/api/.env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" /opt/legislativo/apps/api/.env
echo "NEXT_PUBLIC_API_URL=https://${DOMAIN}/api" > /opt/legislativo/apps/web/.env.local

nginx -t && systemctl reload nginx
pm2 reload all --update-env
echo "0 3 * * * certbot renew --quiet && systemctl reload nginx" | crontab -
echo ""
echo "✅ HTTPS ativo: https://${DOMAIN}"
RHTTPS
chmod +x /usr/local/bin/leg-https

# leg-status: ver status geral
cat > /usr/local/bin/leg-status << 'RSTATUS'
#!/usr/bin/env bash
source /root/.legislativo-secrets 2>/dev/null || true
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Sistema Legislativo Municipal — Status"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📍 URLs:"
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "   https://${DOMAIN}  ✅ HTTPS ativo" || \
  echo "   http://${SERVER_IP:-62.171.161.221}  (HTTP — leg-https ${DOMAIN} para ativar HTTPS)"
echo ""
echo "🐳 Docker:"
docker ps --format "   {{.Names}}: {{.Status}}" 2>/dev/null
echo ""
echo "⚡ PM2:"
pm2 list 2>/dev/null
echo ""
echo "🌐 Nginx: $(systemctl is-active nginx)"
echo ""
echo "🔒 SSL:"
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "   Expira: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem | cut -d= -f2)" || \
  echo "   Não configurado — execute: leg-https ${DOMAIN}"
echo ""
echo "🔑 Login: admin@legislativo.gov.br / Admin@2024"
echo ""
RSTATUS
chmod +x /usr/local/bin/leg-status

ok "Scripts leg-deploy, leg-https e leg-status instalados"

# ════ RESULTADO FINAL ══════════════════════════════════════════════
sleep 8
step "RESULTADO FINAL"

SSL_ATIVO=false
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && SSL_ATIVO=true || true

echo ""
echo -e "${BOLD}${G}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║         ✅  DEPLOY 100% CONCLUÍDO!                   ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${N}"

echo ""
echo "🌐 ACESSO:"
if $SSL_ATIVO; then
  echo "   ✅ https://${DOMAIN}           (HTTPS + cadeado verde)"
  echo "   ✅ https://${DOMAIN}/api/v1   (API REST)"
  echo "   ✅ https://${DOMAIN}/docs     (Swagger)"
  echo "   ✅ https://${DOMAIN}/health   (Health check)"
else
  echo "   🔗 http://${SERVER_IP}           (funcionando agora)"
  echo "   🔗 http://${SERVER_IP}/api/v1"
  echo ""
  echo "   Para HTTPS com ${DOMAIN}:"
  echo "   1. Configure DNS: A ${DOMAIN} → ${SERVER_IP}"
  echo "   2. Execute: leg-https ${DOMAIN}"
fi

echo ""
echo "🏛️  INFRAESTRUTURA:"
echo "   Keycloak: http://${SERVER_IP}:8080 (admin / $(grep KEYCLOAK /root/.legislativo-secrets | cut -d= -f2))"
echo "   Camunda:  http://${SERVER_IP}:8085/camunda"
echo "   MinIO:    http://${SERVER_IP}:9001 (legislativo / $(grep MINIO_PASSWORD /root/.legislativo-secrets | cut -d= -f2))"

echo ""
echo "🔑 LOGIN:"
echo "   Email: admin@legislativo.gov.br"
echo "   Senha: Admin@2024"

echo ""
echo "📊 STATUS ATUAL:"
docker ps --format "   Docker  {{.Names}}: {{.Status}}" 2>/dev/null
pm2 list 2>/dev/null | grep -E "online|error|stopped" | sed 's/^/   PM2  /'
echo "   Nginx: $(systemctl is-active nginx)"

echo ""
echo "🔧 COMANDOS:"
echo "   leg-status   — ver status completo"
echo "   leg-deploy   — redeploy rápido"
echo "   leg-https ${DOMAIN}  — ativar HTTPS"
echo "   pm2 logs leg-api    — logs da API"
echo ""
echo "📦 GitHub: https://github.com/moreliw/legislativo-municipal"
echo ""
