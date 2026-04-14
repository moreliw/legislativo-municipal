#!/usr/bin/env bash
# =============================================================================
# DEPLOY MASTER — Sistema Legislativo Municipal
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/moreliw/legislativo-municipal/main/scripts/deploy-server.sh)
# =============================================================================
set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────
GH_USER="moreliw"
GH_REPO="legislativo-municipal"
APP_DIR="/opt/legislativo"
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
SERVER_IP="${SERVER_IP:-$(curl -4s ifconfig.me 2>/dev/null || echo '62.171.161.221')}"
APP_PORT=3001
WEB_PORT=3000
LOG_DIR="/var/log/legislativo"

# ── Cores ─────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}✔${N}  $1"; }
info() { echo -e "${B}→${N}  $1"; }
warn() { echo -e "${Y}!${N}  $1"; }
err()  { echo -e "${R}✘${N}  $1"; exit 1; }
step() { echo -e "\n${BOLD}${B}━━━ $1 ━━━${N}"; }

echo ""
echo -e "${BOLD}${G}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║   Sistema Legislativo Municipal — Deploy v1.0     ║"
echo "  ║   $(date '+%d/%m/%Y %H:%M:%S')                           ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${N}"

# =============================================================================
# ETAPA 1 — SISTEMA E DEPENDÊNCIAS
# =============================================================================
step "1/10 SISTEMA E DEPENDÊNCIAS"

export DEBIAN_FRONTEND=noninteractive
info "Atualizando pacotes do sistema..."
apt-get update -qq 2>&1 | tail -1
apt-get upgrade -y -qq 2>&1 | tail -1

info "Instalando dependências base..."
apt-get install -y -qq \
  curl wget git ca-certificates gnupg lsb-release \
  build-essential python3 ufw nginx certbot \
  python3-certbot-nginx jq unzip 2>&1 | tail -1
ok "Pacotes base instalados"

# Docker
if ! command -v docker &>/dev/null; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh 2>&1 | tail -2
  systemctl enable docker --quiet && systemctl start docker
fi
ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"

# Docker Compose plugin
if ! docker compose version &>/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -sSL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose 2>&1 | tail -1
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'OK')"

# Node.js 20 LTS
NODE_VER=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v' || echo "0")
if [[ "$NODE_VER" -lt 20 ]]; then
  info "Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -2
  apt-get install -y nodejs 2>&1 | tail -1
fi
ok "Node.js $(node -v)"

# pnpm
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@9 --quiet 2>&1 | tail -1
fi
ok "pnpm $(pnpm -v)"

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 --quiet 2>&1 | tail -1
fi
ok "PM2 $(pm2 -v)"

# =============================================================================
# ETAPA 2 — REPOSITÓRIO
# =============================================================================
step "2/10 REPOSITÓRIO"

git config --global user.email "deploy@legislativo.gov.br"
git config --global user.name "Deploy Bot"

if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando repositório..."
  cd "$APP_DIR"
  git fetch origin main 2>&1 | tail -2
  git reset --hard origin/main 2>&1 | tail -1
  ok "Código atualizado: $(git log --oneline -1)"
else
  info "Clonando repositório..."
  git clone "https://github.com/${GH_USER}/${GH_REPO}.git" "$APP_DIR" 2>&1 | tail -3
  ok "Repositório clonado em $APP_DIR"
fi
cd "$APP_DIR"

# =============================================================================
# ETAPA 3 — VARIÁVEIS DE AMBIENTE
# =============================================================================
step "3/10 VARIÁVEIS DE AMBIENTE"

# Criar ou completar o arquivo de secrets
# (garante que todas as variáveis existam mesmo se o arquivo for parcial)

# Carregar secrets existentes se houver
[[ -f /root/.legislativo-secrets ]] && source /root/.legislativo-secrets || true

# Gerar apenas as que faltam
DB_PASSWORD="${DB_PASSWORD:-Leg$(openssl rand -hex 12)Db}"
REDIS_PASSWORD="${REDIS_PASSWORD:-Red$(openssl rand -hex 10)Rd}"
MINIO_PASSWORD="${MINIO_PASSWORD:-Min$(openssl rand -hex 10)Mn}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-Kc$(openssl rand -hex 12)Admin}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

# Reescrever o arquivo completo com todos os valores
cat > /root/.legislativo-secrets << SECRETS
# Sistema Legislativo Municipal — Credenciais
# Atualizado em: $(date)

SERVER_IP=${SERVER_IP}
DOMAIN=${DOMAIN}
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
MINIO_PASSWORD=${MINIO_PASSWORD}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
JWT_SECRET=${JWT_SECRET}

# Login de teste
ADMIN_EMAIL=admin@legislativo.gov.br
ADMIN_PASSWORD=Admin@2024
SECRETS
chmod 600 /root/.legislativo-secrets
ok "Credenciais salvas em /root/.legislativo-secrets"

# Criar .env da API
cat > "$APP_DIR/apps/api/.env" << ENV
# === Sistema Legislativo Municipal — API ===
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0

# Banco de dados
DATABASE_URL=postgresql://legislativo:${DB_PASSWORD}@localhost:5432/legislativo

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379

# Segurança
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=legislativo
KEYCLOAK_CLIENT_ID=legislativo-api
KEYCLOAK_PUBLIC_KEY=${JWT_SECRET}

# Camunda
CAMUNDA_URL=http://localhost:8085
CAMUNDA_USER=admin
CAMUNDA_PASS=admin

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=legislativo
MINIO_SECRET_KEY=${MINIO_PASSWORD}
MINIO_BUCKET=legislativo-documentos

# Email
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@${DOMAIN}

# Logs
LOG_LEVEL=info
ENABLE_SWAGGER=true
ENV

# Criar .env.local do frontend
cat > "$APP_DIR/apps/web/.env.local" << WEBENV
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
WEBENV

# Criar diretório de logs
mkdir -p "$LOG_DIR"
ok ".env configurado para https://${DOMAIN}"

# =============================================================================
# ETAPA 4 — DOCKER: INFRAESTRUTURA
# =============================================================================
step "4/10 INFRAESTRUTURA DOCKER"

# Criar rede Docker se não existir
docker network create leg-net 2>/dev/null || true

# Parar e remover containers antigos
for c in leg_postgres leg_redis leg_minio leg_keycloak leg_camunda; do
  docker stop "$c" 2>/dev/null && docker rm "$c" 2>/dev/null || true
done

# PostgreSQL
info "Iniciando PostgreSQL..."
docker run -d \
  --name leg_postgres \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:5432:5432 \
  -e POSTGRES_DB=legislativo \
  -e POSTGRES_USER=legislativo \
  -e "POSTGRES_PASSWORD=${DB_PASSWORD}" \
  -v leg_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine 2>&1 | tail -1

# Redis
info "Iniciando Redis..."
docker run -d \
  --name leg_redis \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine \
  redis-server --requirepass "${REDIS_PASSWORD}" --appendonly yes 2>&1 | tail -1

# MinIO
info "Iniciando MinIO..."
docker run -d \
  --name leg_minio \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=legislativo" \
  -e "MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}" \
  -v leg_minio_data:/data \
  minio/minio server /data --console-address ":9001" 2>&1 | tail -1

ok "PostgreSQL, Redis e MinIO iniciando..."

# Aguardar PostgreSQL
info "Aguardando PostgreSQL ficar pronto..."
for i in $(seq 1 30); do
  if docker exec leg_postgres pg_isready -U legislativo &>/dev/null 2>&1; then
    ok "PostgreSQL pronto!"
    break
  fi
  [[ $i -eq 30 ]] && { warn "PostgreSQL demorou — continuando..."; break; }
  sleep 2; echo -n "."
done
echo ""

# Keycloak
info "Iniciando Keycloak (pode demorar 2-3min na 1ª vez)..."
docker run -d \
  --name leg_keycloak \
  --restart unless-stopped \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e "KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}" \
  quay.io/keycloak/keycloak:24.0 start-dev 2>&1 | tail -1

# Camunda
info "Iniciando Camunda..."
docker run -d \
  --name leg_camunda \
  --restart unless-stopped \
  -p 8085:8080 \
  camunda/camunda-bpm-platform:run-7.21.0 2>&1 | tail -1

ok "Todos os containers Docker iniciados"

# =============================================================================
# ETAPA 5 — BUILD DA API
# =============================================================================
step "5/10 BUILD DA API"

cd "$APP_DIR"
info "Instalando dependências do monorepo..."
pnpm install --frozen-lockfile 2>&1 | tail -3
ok "Dependências instaladas"

info "Gerando Prisma client..."
pnpm --filter @legislativo/api exec prisma generate 2>&1 | tail -2
ok "Prisma client gerado"

info "Executando migrations do banco..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -3 || \
  pnpm --filter @legislativo/api exec prisma db push --accept-data-loss 2>&1 | tail -3
ok "Banco de dados migrado"

info "Populando dados iniciais..."
pnpm --filter @legislativo/api exec tsx prisma/seed.ts 2>&1 | tail -5
ok "Dados iniciais criados"

info "Compilando TypeScript da API..."
pnpm --filter @legislativo/api build 2>&1 | tail -5
ok "API compilada com sucesso"

# =============================================================================
# ETAPA 6 — BUILD DO FRONTEND
# =============================================================================
step "6/10 BUILD DO FRONTEND"

cd "$APP_DIR"
info "Compilando frontend Next.js para produção..."
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -8
ok "Frontend compilado com sucesso"

# =============================================================================
# ETAPA 7 — PM2: GERENCIADOR DE PROCESSOS
# =============================================================================
step "7/10 PM2 — GERENCIADOR DE PROCESSOS"

# Parar processos PM2 antigos
pm2 delete all 2>/dev/null || true

# ecosystem.config.js
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
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
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
PM2

# Iniciar ambos os processos
info "Iniciando API com PM2 (2 instâncias em cluster)..."
pm2 start "$APP_DIR/ecosystem.config.js" 2>&1 | tail -8

# Salvar configuração do PM2
pm2 save --force 2>&1 | tail -1

# Configurar startup automático
info "Configurando PM2 startup..."
pm2 startup systemd -u root --hp /root 2>&1 | tail -2
ok "PM2 configurado para reiniciar no boot"

# Aguardar serviços
sleep 6
if curl -sf "http://localhost:${APP_PORT}/health" &>/dev/null; then
  ok "API respondendo em http://localhost:${APP_PORT}/health"
else
  warn "API ainda iniciando (normal, pode demorar 10-15s)..."
  pm2 logs leg-api --lines 15 --nostream 2>&1 | tail -10
fi

# =============================================================================
# ETAPA 8 — NGINX: PROXY REVERSO (HTTP)
# =============================================================================
step "8/10 NGINX — PROXY REVERSO"

# Remover site default
rm -f /etc/nginx/sites-enabled/default

# Configuração HTTP inicial (antes do HTTPS)
cat > /etc/nginx/sites-available/legislativo << NGINX
# Sistema Legislativo Municipal
# Gerado em: $(date)

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

# Upstream
upstream leg_api { server 127.0.0.1:${APP_PORT}; keepalive 32; }
upstream leg_web { server 127.0.0.1:${WEB_PORT}; keepalive 16; }

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${SERVER_IP} _;

    # Logs
    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log;

    # Segurança básica
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 50M;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    # API REST
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Access-Control-Allow-Origin "\$http_origin" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    # Health check
    location /health {
        proxy_pass http://leg_api/health;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Swagger
    location /docs {
        proxy_pass http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Auth
    location /auth/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Arquivos estáticos Next.js (cache agressivo)
    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Frontend Next.js
    location / {
        limit_req zone=web burst=100 nodelay;
        proxy_pass http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

# Habilitar site
ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo

# Criar diretório para certbot challenge
mkdir -p /var/www/certbot

# Testar e ativar Nginx
info "Testando configuração Nginx..."
nginx -t 2>&1
systemctl enable nginx --quiet
systemctl reload nginx
ok "Nginx ativo e configurado (HTTP)"

# =============================================================================
# ETAPA 9 — HTTPS COM CERTBOT (Let's Encrypt)
# =============================================================================
step "9/10 HTTPS — LET'S ENCRYPT"

info "Verificando se DNS do domínio $DOMAIN aponta para $SERVER_IP..."
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | tail -1 || \
              nslookup "$DOMAIN" 2>/dev/null | awk '/^Address: / { print $2 }' | head -1 || \
              python3 -c "import socket; print(socket.gethostbyname('$DOMAIN'))" 2>/dev/null || \
              echo "não resolvido")

echo "   Domínio: $DOMAIN"
echo "   Resolvido para: $RESOLVED_IP"
echo "   Servidor IP: $SERVER_IP"

# Instalar snap certbot se necessário
if ! command -v snap &>/dev/null; then
  apt-get install -y snapd 2>&1 | tail -1
fi

if [[ "$RESOLVED_IP" == "$SERVER_IP" ]]; then
  info "DNS OK! Obtendo certificado SSL gratuito..."

  # Tentar obter certificado
  certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN}" \
    --no-eff-email 2>&1 | tail -10

  if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    ok "Certificado SSL obtido com sucesso!"

    # Recriar config Nginx com HTTPS
    cat > /etc/nginx/sites-available/legislativo << NGINX_HTTPS
# Sistema Legislativo Municipal — HTTPS
# Gerado em: $(date)

limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

upstream leg_api { server 127.0.0.1:${APP_PORT}; keepalive 32; }
upstream leg_web { server 127.0.0.1:${WEB_PORT}; keepalive 16; }

# Redirecionar HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

# HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # Certificados SSL
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Configurações SSL modernas (A+ no SSL Labs)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # HSTS (6 meses)
    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log;

    client_max_body_size 50M;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # API REST
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        add_header Access-Control-Allow-Origin "https://${DOMAIN}" always;
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
        proxy_pass http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location /auth/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        limit_req zone=web burst=100 nodelay;
        proxy_pass http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINX_HTTPS

    # Configurar renovação automática
    systemctl enable certbot.timer 2>/dev/null || \
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --reload-nginx") | crontab -
    ok "Renovação automática do certificado configurada"

    nginx -t && systemctl reload nginx
    ok "Nginx reconfigurado com HTTPS ✅"

  else
    warn "Certificado SSL não obtido. Verificar DNS ou tentar manualmente:"
    warn "  certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
    warn "Sistema continua funcionando via HTTP até o HTTPS ser configurado"
  fi

else
  warn "DNS do domínio ${DOMAIN} não resolve para ${SERVER_IP}"
  warn "Resolvido para: ${RESOLVED_IP}"
  warn "Configure o DNS e execute: certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
  warn "Após o DNS propagar, rode: leg-https ${DOMAIN}"
  info "Sistema funcionando via HTTP: http://${SERVER_IP}"
fi

# =============================================================================
# ETAPA 10 — FIREWALL, AUTOMAÇÃO E FINALIZAÇÃO
# =============================================================================
step "10/10 FIREWALL E AUTOMAÇÃO"

# Firewall
ufw --force reset 2>/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp   # Keycloak
ufw allow 8085/tcp   # Camunda
ufw allow 9001/tcp   # MinIO Console
ufw --force enable
ok "Firewall UFW configurado"

# Script de redeploy rápido
cat > /usr/local/bin/leg-deploy << 'REDEPLOY'
#!/usr/bin/env bash
# Redeploy rápido — Sistema Legislativo Municipal
set -euo pipefail
APP_DIR="/opt/legislativo"
G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
ok()   { echo -e "${G}✔${N} $1"; }
info() { echo -e "${B}→${N} $1"; }

echo ""
info "🚀 Iniciando redeploy..."

cd "$APP_DIR"
info "Atualizando código..."
git pull origin main 2>&1 | tail -3

info "Dependências..."
pnpm install --frozen-lockfile 2>&1 | tail -2

info "Migrations..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -2

info "Compilando API..."
pnpm --filter @legislativo/api build 2>&1 | tail -3

info "Compilando Frontend..."
NEXT_PUBLIC_API_URL="$(grep NEXT_PUBLIC_API_URL apps/web/.env.local | cut -d= -f2)" \
  pnpm --filter @legislativo/web build 2>&1 | tail -5

info "Reiniciando PM2..."
pm2 reload ecosystem.config.js --update-env 2>&1 | tail -3
pm2 save --force 2>&1 | tail -1

info "Recarregando Nginx..."
nginx -t && systemctl reload nginx

echo ""
ok "Redeploy concluído! $(date)"
pm2 list
REDEPLOY
chmod +x /usr/local/bin/leg-deploy

# Script para ativar HTTPS depois que DNS propagar
cat > /usr/local/bin/leg-https << 'HTTPSSCRIPT'
#!/usr/bin/env bash
DOMAIN="${1:-pleno.morelidev.com}"
SERVER_IP=$(curl -4s ifconfig.me 2>/dev/null || echo "")
LOG_DIR="/var/log/legislativo"
APP_PORT=3001
WEB_PORT=3000

echo "Configurando HTTPS para $DOMAIN..."

certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "admin@${DOMAIN}" \
  --no-eff-email

if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "✅ Certificado obtido!"

  cat > /etc/nginx/sites-available/legislativo << NGINXCONF
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;
upstream leg_api { server 127.0.0.1:${APP_PORT}; keepalive 32; }
upstream leg_web  { server 127.0.0.1:${WEB_PORT}; keepalive 16; }

server {
    listen 80; listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2; listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log;
    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://leg_api/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
    location /health  { proxy_pass http://leg_api/health; access_log off; }
    location /docs    { proxy_pass http://leg_api/docs; proxy_set_header Host \$host; }
    location /auth/   { proxy_pass http://leg_api/auth/; proxy_set_header Host \$host; }
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
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINXCONF

  # Atualizar .env com HTTPS
  sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" /opt/legislativo/apps/api/.env
  sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" /opt/legislativo/apps/api/.env
  echo "NEXT_PUBLIC_API_URL=https://${DOMAIN}/api" > /opt/legislativo/apps/web/.env.local

  nginx -t && systemctl reload nginx
  pm2 reload all
  echo "✅ HTTPS ativo em https://${DOMAIN}"
else
  echo "❌ Falhou. Verificar DNS: dig ${DOMAIN}"
fi
HTTPSSCRIPT
chmod +x /usr/local/bin/leg-https

# Ativar serviços no boot
systemctl enable nginx --quiet
ok "Automação configurada (leg-deploy e leg-https instalados)"

# =============================================================================
# RESULTADO FINAL
# =============================================================================
sleep 8

# Checar status final
API_OK=false
WEB_OK=false
NGINX_OK=false
SSL_OK=false

curl -sf "http://localhost/health" &>/dev/null && API_OK=true || true
curl -sf "http://localhost" &>/dev/null && WEB_OK=true || true
systemctl is-active --quiet nginx && NGINX_OK=true || true
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && SSL_OK=true || true

echo ""
echo -e "${BOLD}${G}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║         ✅  DEPLOY CONCLUÍDO COM SUCESSO!                ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${N}"
echo ""
echo -e "${BOLD}🌐 ACESSO AO SISTEMA:${N}"
if $SSL_OK; then
  echo "   ✅ Sistema: https://${DOMAIN}  (HTTPS seguro)"
  echo "   ✅ API:     https://${DOMAIN}/api/v1"
  echo "   ✅ Swagger: https://${DOMAIN}/docs"
  echo "   ✅ Health:  https://${DOMAIN}/health"
else
  echo "   Sistema: http://${SERVER_IP}  (HTTP — aguardando DNS)"
  echo "   API:     http://${SERVER_IP}/api/v1"
  echo "   🔧 Após DNS propagar: leg-https ${DOMAIN}"
fi
echo ""
echo -e "${BOLD}🏛️  SERVIÇOS DE INFRAESTRUTURA:${N}"
echo "   Keycloak:  http://${SERVER_IP}:8080  (admin / ver secrets)"
echo "   Camunda:   http://${SERVER_IP}:8085/camunda"
echo "   MinIO:     http://${SERVER_IP}:9001"
echo ""
echo -e "${BOLD}🔑 LOGIN PARA TESTES:${N}"
echo "   Email:  admin@legislativo.gov.br"
echo "   Senha:  Admin@2024"
echo ""
echo -e "${BOLD}📊 STATUS DOS SERVIÇOS:${N}"
echo ""
echo "   Nginx: $(systemctl is-active nginx 2>/dev/null)"
echo ""
echo "   PM2:"
pm2 list 2>/dev/null | grep -E "name|leg-" | head -10
echo ""
echo "   Docker:"
docker ps --format "   {{.Names}}: {{.Status}}" 2>/dev/null
echo ""
if $SSL_OK; then
  echo "   SSL: ✅ Certificado Let's Encrypt ativo"
  EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null | cut -d= -f2)
  echo "   Expira: $EXPIRY"
else
  echo "   SSL: ⏳ Pendente (configure DNS e execute: leg-https ${DOMAIN})"
fi
echo ""
echo -e "${BOLD}📋 CREDENCIAIS:${N} /root/.legislativo-secrets"
echo ""
echo -e "${BOLD}🔧 COMANDOS ÚTEIS:${N}"
echo "   Redeploy:      leg-deploy"
echo "   Ativar HTTPS:  leg-https ${DOMAIN}"
echo "   Logs API:      pm2 logs leg-api"
echo "   Logs Web:      pm2 logs leg-web"
echo "   Status:        pm2 status"
echo ""
