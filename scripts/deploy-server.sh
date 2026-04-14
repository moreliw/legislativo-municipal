#!/usr/bin/env bash
# =============================================================================
# DEPLOY MASTER — Sistema Legislativo Municipal
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/moreliw/legislativo-municipal/main/scripts/deploy-server.sh)
# =============================================================================
set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────
GH_TOKEN="${GH_TOKEN:-}"
GH_USER="moreliw"
GH_REPO="legislativo-municipal"
APP_DIR="/opt/legislativo"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "62.171.161.221")
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
  python3-certbot-nginx jq unzip \
  2>&1 | tail -1
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
ok "Docker Compose $(docker compose version --short 2>/dev/null)"

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
# ETAPA 2 — CLONAR / ATUALIZAR REPOSITÓRIO
# =============================================================================
step "2/10 REPOSITÓRIO"

git config --global user.email "deploy@legislativo.gov.br"
git config --global user.name "Deploy Bot"
git config --global credential.helper store
echo "https://${GH_TOKEN}:x-oauth-basic@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando repositório..."
  cd "$APP_DIR"
  git fetch origin main 2>&1 | tail -2
  git reset --hard origin/main 2>&1 | tail -1
  ok "Código atualizado: $(git log --oneline -1)"
else
  info "Clonando repositório..."
  git clone "https://${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO}.git" "$APP_DIR" 2>&1 | tail -3
  ok "Repositório clonado em $APP_DIR"
fi

cd "$APP_DIR"

# =============================================================================
# ETAPA 3 — SENHAS E VARIÁVEIS DE AMBIENTE
# =============================================================================
step "3/10 VARIÁVEIS DE AMBIENTE"

# Gerar senhas se não existirem
if [[ ! -f /root/.legislativo-secrets ]]; then
  DB_PASS="Leg$(openssl rand -hex 12)Db"
  REDIS_PASS="Red$(openssl rand -hex 10)Rd"
  MINIO_PASS="Min$(openssl rand -hex 10)Mn"
  KC_PASS="Kc$(openssl rand -hex 12)Admin"
  JWT_SECRET="$(openssl rand -hex 32)"

  cat > /root/.legislativo-secrets << SECRETS
DB_PASSWORD=${DB_PASS}
REDIS_PASSWORD=${REDIS_PASS}
MINIO_PASSWORD=${MINIO_PASS}
KEYCLOAK_ADMIN_PASSWORD=${KC_PASS}
JWT_SECRET=${JWT_SECRET}
SERVER_IP=${SERVER_IP}
ADMIN_EMAIL=admin@legislativo.gov.br
ADMIN_PASSWORD=Admin@2024
SECRETS
  chmod 600 /root/.legislativo-secrets
  ok "Senhas geradas em /root/.legislativo-secrets"
else
  ok "Usando senhas existentes"
fi

source /root/.legislativo-secrets

# Criar .env da API
cat > "$APP_DIR/apps/api/.env" << ENV
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0
DATABASE_URL=postgresql://legislativo:${DB_PASSWORD}@localhost:5432/legislativo
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=http://${SERVER_IP}
FRONTEND_URL=http://${SERVER_IP}
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=legislativo
KEYCLOAK_CLIENT_ID=legislativo-api
KEYCLOAK_PUBLIC_KEY=${JWT_SECRET}
CAMUNDA_URL=http://localhost:8085
CAMUNDA_USER=admin
CAMUNDA_PASS=admin
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=legislativo
MINIO_SECRET_KEY=${MINIO_PASSWORD}
MINIO_BUCKET=legislativo-documentos
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@legislativo.gov.br
LOG_LEVEL=info
ENABLE_SWAGGER=true
ENV
ok ".env configurado"

# Criar .env.local do frontend
cat > "$APP_DIR/apps/web/.env.local" << WEBENV
NEXT_PUBLIC_API_URL=http://${SERVER_IP}/api
WEBENV
ok ".env.local do frontend configurado"

# Criar diretório de logs
mkdir -p "$LOG_DIR"

# =============================================================================
# ETAPA 4 — DOCKER: INFRAESTRUTURA
# =============================================================================
step "4/10 INFRAESTRUTURA DOCKER"

source /root/.legislativo-secrets

# Parar containers antigos se existirem
docker stop leg_postgres leg_redis leg_minio leg_keycloak leg_camunda 2>/dev/null || true
docker rm leg_postgres leg_redis leg_minio leg_keycloak leg_camunda 2>/dev/null || true

# Criar rede Docker
docker network create leg-net 2>/dev/null || true

# PostgreSQL
info "Iniciando PostgreSQL..."
docker run -d \
  --name leg_postgres \
  --network leg-net \
  --restart unless-stopped \
  -p 5432:5432 \
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
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass "${REDIS_PASSWORD}" --appendonly yes 2>&1 | tail -1

# MinIO
info "Iniciando MinIO..."
docker run -d \
  --name leg_minio \
  --network leg-net \
  --restart unless-stopped \
  -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=legislativo" \
  -e "MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}" \
  -v leg_minio_data:/data \
  minio/minio server /data --console-address ":9001" 2>&1 | tail -1

ok "PostgreSQL, Redis e MinIO iniciando..."

# Aguardar PostgreSQL
info "Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  docker exec leg_postgres pg_isready -U legislativo &>/dev/null && { ok "PostgreSQL pronto!"; break; }
  [[ $i -eq 30 ]] && { warn "PostgreSQL demorou — continuando..."; break; }
  sleep 2; echo -n "."
done
echo ""

# Keycloak (em background — demora ~2min na primeira vez)
info "Iniciando Keycloak (async)..."
docker run -d \
  --name leg_keycloak \
  --network leg-net \
  --restart unless-stopped \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e "KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}" \
  quay.io/keycloak/keycloak:24.0 start-dev 2>&1 | tail -1

# Camunda (em background)
info "Iniciando Camunda (async)..."
docker run -d \
  --name leg_camunda \
  --network leg-net \
  --restart unless-stopped \
  -p 8085:8080 \
  camunda/camunda-bpm-platform:run-7.21.0 2>&1 | tail -1

ok "Keycloak e Camunda iniciando em background (2-3min)..."

# =============================================================================
# ETAPA 5 — BUILD DA API
# =============================================================================
step "5/10 BUILD DA API"

cd "$APP_DIR"
info "Instalando dependências..."
pnpm install --frozen-lockfile 2>&1 | tail -3
ok "Dependências instaladas"

info "Gerando Prisma client..."
pnpm --filter @legislativo/api exec prisma generate 2>&1 | tail -2
ok "Prisma client gerado"

info "Executando migrations..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -3 || \
  pnpm --filter @legislativo/api exec prisma db push --accept-data-loss 2>&1 | tail -3
ok "Banco de dados migrado"

info "Populando dados iniciais..."
pnpm --filter @legislativo/api exec tsx prisma/seed.ts 2>&1 | tail -10
ok "Dados iniciais criados"

info "Compilando TypeScript da API..."
pnpm --filter @legislativo/api build 2>&1 | tail -5
ok "API compilada"

# =============================================================================
# ETAPA 6 — BUILD DO FRONTEND
# =============================================================================
step "6/10 BUILD DO FRONTEND"

cd "$APP_DIR"
info "Compilando frontend Next.js..."
NEXT_PUBLIC_API_URL="http://${SERVER_IP}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -8
ok "Frontend compilado"

# =============================================================================
# ETAPA 7 — PM2: GERENCIADOR DE PROCESSOS
# =============================================================================
step "7/10 PM2 — GERENCIADOR DE PROCESSOS"

# Parar processos PM2 antigos
pm2 delete leg-api leg-web 2>/dev/null || true

# ecosystem.config.js para PM2
cat > "$APP_DIR/ecosystem.config.js" << 'PM2'
module.exports = {
  apps: [
    {
      name: 'leg-api',
      script: 'dist/server.js',
      cwd: '/opt/legislativo/apps/api',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '/opt/legislativo/apps/api/.env',
      error_file: '/var/log/legislativo/api-error.log',
      out_file: '/var/log/legislativo/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 8000,
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

# Iniciar com PM2
info "Iniciando API com PM2 (cluster de 2 instâncias)..."
pm2 start "$APP_DIR/ecosystem.config.js" --only leg-api 2>&1 | tail -5

info "Iniciando Frontend com PM2..."
pm2 start "$APP_DIR/ecosystem.config.js" --only leg-web 2>&1 | tail -5

# Configurar PM2 startup (reiniciar ao reboot)
info "Configurando PM2 startup..."
pm2 save --force 2>&1 | tail -2
pm2 startup systemd -u root --hp /root 2>&1 | tail -3
ok "PM2 configurado para iniciar no boot"

# Aguardar serviços
sleep 5
info "Verificando serviços..."
if curl -sf "http://localhost:${APP_PORT}/health" &>/dev/null; then
  ok "API respondendo na porta ${APP_PORT}"
else
  warn "API ainda iniciando..."
  pm2 logs leg-api --lines 20 --nostream 2>&1 | tail -10
fi

if curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; then
  ok "Frontend respondendo na porta ${WEB_PORT}"
else
  warn "Frontend ainda iniciando..."
fi

# =============================================================================
# ETAPA 8 — NGINX: PROXY REVERSO
# =============================================================================
step "8/10 NGINX — PROXY REVERSO"

# Remover site default do Nginx
rm -f /etc/nginx/sites-enabled/default

# Configuração Nginx completa
cat > /etc/nginx/sites-available/legislativo << NGINX
# Sistema Legislativo Municipal
# Gerado em: $(date)

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

# Upstream servers
upstream leg_api {
    server 127.0.0.1:${APP_PORT};
    keepalive 32;
}

upstream leg_web {
    server 127.0.0.1:${WEB_PORT};
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_IP} _;

    # Logs
    access_log /var/log/legislativo/nginx-access.log;
    error_log  /var/log/legislativo/nginx-error.log;

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Tamanho máximo de upload (documentos legislativos)
    client_max_body_size 50M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout    60s;
    proxy_read_timeout    60s;

    # ── API REST ──────────────────────────────────────────────
    location /api/ {
        limit_req zone=api burst=50 nodelay;

        proxy_pass http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # CORS headers para a API
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    # ── Health check da API ───────────────────────────────────
    location /health {
        proxy_pass http://leg_api/health;
        proxy_set_header Host \$host;
        access_log off;
    }

    # ── Swagger/Docs da API ───────────────────────────────────
    location /docs {
        proxy_pass http://leg_api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # ── Autenticação ──────────────────────────────────────────
    location /auth/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://leg_api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # ── MinIO (uploads) ───────────────────────────────────────
    location /storage/ {
        proxy_pass http://localhost:9000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        client_max_body_size 50M;
    }

    # ── Frontend Next.js ──────────────────────────────────────
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
        proxy_cache_bypass \$http_upgrade;
    }

    # ── Arquivos estáticos Next.js (cache agressivo) ──────────
    location /_next/static/ {
        proxy_pass http://leg_web;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location /favicon.ico {
        proxy_pass http://leg_web;
        access_log off;
    }
}
NGINX

# Habilitar site e testar
ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo

info "Testando configuração do Nginx..."
nginx -t 2>&1
ok "Nginx configurado com sucesso"

info "Reiniciando Nginx..."
systemctl reload nginx
ok "Nginx ativo e configurado"

# =============================================================================
# ETAPA 9 — FIREWALL E SEGURANÇA
# =============================================================================
step "9/10 FIREWALL E SEGURANÇA"

# Configurar UFW
ufw --force reset 2>/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh        # SSH
ufw allow 80/tcp     # HTTP (Nginx)
ufw allow 443/tcp    # HTTPS (futuro)
ufw allow 8080/tcp   # Keycloak (acesso temporário)
ufw allow 8085/tcp   # Camunda (acesso temporário)
ufw allow 9001/tcp   # MinIO Console (acesso temporário)
# Portas internas (3000, 3001, 5432, 6379, 9000) apenas localhost
ufw --force enable
ok "Firewall configurado"

# PM2 startup garantido
systemctl enable nginx --quiet
ok "Nginx configurado para iniciar no boot"

# =============================================================================
# ETAPA 10 — SCRIPT DE DEPLOY CONTÍNUO + CI/CD
# =============================================================================
step "10/10 AUTOMAÇÃO DE DEPLOY"

# Script de re-deploy rápido
cat > /usr/local/bin/leg-deploy << 'REDEPLOY'
#!/usr/bin/env bash
# Redeploy rápido do Sistema Legislativo Municipal
set -euo pipefail
APP_DIR="/opt/legislativo"
G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
ok()   { echo -e "${G}✔${N} $1"; }
info() { echo -e "${B}→${N} $1"; }

echo ""
info "Iniciando redeploy..."

cd "$APP_DIR"
info "Atualizando código do GitHub..."
git pull origin main 2>&1 | tail -3

info "Instalando dependências..."
pnpm install --frozen-lockfile 2>&1 | tail -2

info "Rodando migrations..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -2

info "Compilando API..."
pnpm --filter @legislativo/api build 2>&1 | tail -3

info "Compilando Frontend..."
pnpm --filter @legislativo/web build 2>&1 | tail -5

info "Reiniciando com PM2..."
pm2 reload ecosystem.config.js --update-env 2>&1 | tail -5
pm2 save --force 2>&1 | tail -1

info "Recarregando Nginx..."
nginx -t && systemctl reload nginx

echo ""
ok "Redeploy concluído! $(date)"
echo ""
pm2 list
REDEPLOY

chmod +x /usr/local/bin/leg-deploy
ok "Script leg-deploy instalado (/usr/local/bin/leg-deploy)"

# Verificação final completa
sleep 5

# =============================================================================
# RELATÓRIO FINAL
# =============================================================================
echo ""
echo -e "${BOLD}${G}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║           ✅  DEPLOY CONCLUÍDO COM SUCESSO!              ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${N}"
echo ""
echo -e "${BOLD}🌐 URLS DE ACESSO:${N}"
echo "   Sistema Legislativo:  http://${SERVER_IP}"
echo "   API REST:             http://${SERVER_IP}/api/v1"
echo "   Health Check:         http://${SERVER_IP}/health"
echo "   Swagger/Docs:         http://${SERVER_IP}/docs"
echo "   Keycloak Admin:       http://${SERVER_IP}:8080  (ainda iniciando ~2min)"
echo "   Camunda Cockpit:      http://${SERVER_IP}:8085/camunda"
echo "   MinIO Console:        http://${SERVER_IP}:9001"
echo ""
echo -e "${BOLD}🔑 LOGIN PARA TESTES:${N}"
echo "   Email:    admin@legislativo.gov.br"
echo "   Senha:    Admin@2024"
echo ""
echo -e "${BOLD}📦 GITHUB:${N}"
echo "   https://github.com/${GH_USER}/${GH_REPO}"
echo ""
echo -e "${BOLD}📊 STATUS DOS SERVIÇOS:${N}"

# PM2
echo -e "\n   ${BOLD}PM2:${N}"
pm2 list 2>/dev/null | grep -E "name|leg-" | head -10

# Docker
echo -e "\n   ${BOLD}Docker:${N}"
docker ps --format "   {{.Names}}: {{.Status}}" 2>/dev/null

# Nginx
echo -e "\n   ${BOLD}Nginx:${N}"
systemctl is-active nginx &>/dev/null && echo "   nginx: ✅ ativo" || echo "   nginx: ❌ inativo"

# API health check
echo -e "\n   ${BOLD}Health Check da API:${N}"
sleep 3
if curl -sf "http://localhost/health" &>/dev/null; then
  echo "   API via Nginx:  ✅ respondendo"
  curl -s "http://localhost/health" | python3 -m json.tool 2>/dev/null | head -8 | sed 's/^/   /'
else
  echo "   API via Nginx:  ⏳ ainda iniciando (normal até 30s)"
fi

if curl -sf "http://localhost" &>/dev/null; then
  echo "   Frontend:       ✅ respondendo"
else
  echo "   Frontend:       ⏳ ainda iniciando"
fi

echo ""
echo -e "${BOLD}📋 CREDENCIAIS COMPLETAS:${N} /root/.legislativo-secrets"
echo ""
echo -e "${BOLD}🔧 COMANDOS ÚTEIS:${N}"
echo "   Redeploy:       leg-deploy"
echo "   Logs API:       pm2 logs leg-api"
echo "   Logs Web:       pm2 logs leg-web"
echo "   Status PM2:     pm2 status"
echo "   Nginx reload:   systemctl reload nginx"
echo "   Docker status:  docker ps"
echo ""
echo -e "${BOLD}📁 ESTRUTURA:${N}"
echo "   App:      $APP_DIR"
echo "   Logs:     $LOG_DIR"
echo "   Nginx:    /etc/nginx/sites-available/legislativo"
echo "   PM2:      $APP_DIR/ecosystem.config.js"
echo ""

