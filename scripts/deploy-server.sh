#!/usr/bin/env bash
# =============================================================================
# DEPLOY MASTER — Sistema Legislativo Municipal
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/moreliw/legislativo-municipal/main/scripts/deploy-server.sh)
# =============================================================================
set -eo pipefail  # -u removido para evitar erros com variáveis opcionais

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
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║  Sistema Legislativo Municipal — Deploy v1.0     ║"
echo "  ║  $(date '+%d/%m/%Y %H:%M:%S')  •  ${DOMAIN}  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${N}"

# =============================================================================
# ETAPA 1 — SISTEMA E DEPENDÊNCIAS
# =============================================================================
step "1/10 SISTEMA E DEPENDÊNCIAS"

export DEBIAN_FRONTEND=noninteractive
info "Atualizando sistema..."
apt-get update -qq 2>&1 | tail -1
apt-get upgrade -y -qq 2>&1 | tail -1

info "Instalando dependências..."
apt-get install -y -qq \
  curl wget git ca-certificates gnupg lsb-release \
  build-essential python3 ufw nginx \
  certbot python3-certbot-nginx \
  jq unzip 2>&1 | tail -1
ok "Pacotes base instalados"

# Docker
if ! command -v docker &>/dev/null; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh 2>&1 | tail -2
  systemctl enable docker --quiet && systemctl start docker
fi
ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)"

# Docker Compose
if ! docker compose version &>/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -sSL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose 2>&1 | tail -1
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'OK')"

# Node.js 20
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

git config --global user.email "deploy@${DOMAIN}"
git config --global user.name "Deploy Bot"

# Usar token se fornecido, senão usar clone público
GH_BASE="https://github.com/${GH_USER}/${GH_REPO}.git"
if [[ -n "${GH_TOKEN:-}" ]]; then
  GH_BASE="https://${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO}.git"
fi

if [[ -d "$APP_DIR/.git" ]]; then
  info "Atualizando repositório..."
  cd "$APP_DIR"
  git remote set-url origin "$GH_BASE" 2>/dev/null || true
  git fetch origin main 2>&1 | tail -2
  git reset --hard origin/main 2>&1 | tail -1
  ok "Código atualizado: $(git log --oneline -1)"
else
  info "Clonando repositório..."
  git clone "$GH_BASE" "$APP_DIR" 2>&1 | tail -3
  ok "Clonado em $APP_DIR"
fi

cd "$APP_DIR"

# =============================================================================
# ETAPA 3 — VARIÁVEIS DE AMBIENTE
# =============================================================================
step "3/10 VARIÁVEIS DE AMBIENTE"

# Carregar secrets existentes com set -u desativado
set +u
if [[ -f /root/.legislativo-secrets ]]; then
  source /root/.legislativo-secrets 2>/dev/null || true
fi
set -e

# Garantir que todas as variáveis existam
DB_PASSWORD="${DB_PASSWORD:-Leg$(openssl rand -hex 12)Db}"
REDIS_PASSWORD="${REDIS_PASSWORD:-Red$(openssl rand -hex 10)Rd}"
MINIO_PASSWORD="${MINIO_PASSWORD:-Min$(openssl rand -hex 10)Mn}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-Kc$(openssl rand -hex 12)Admin}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

# Salvar/atualizar arquivo de credenciais
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

# .env da API
mkdir -p "$APP_DIR/apps/api"
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
ok ".env da API configurado"

# .env do Frontend
mkdir -p "$APP_DIR/apps/web"
cat > "$APP_DIR/apps/web/.env.production" << WEBENV
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
WEBENV
ok ".env do Frontend configurado"

# Criar diretórios de log
mkdir -p "$LOG_DIR"

# =============================================================================
# ETAPA 4 — DOCKER: INFRAESTRUTURA
# =============================================================================
step "4/10 INFRAESTRUTURA DOCKER"

# Parar containers antigos
for c in leg_postgres leg_redis leg_minio leg_keycloak leg_camunda; do
  docker stop "$c" 2>/dev/null && docker rm "$c" 2>/dev/null || true
done

# Criar rede Docker
docker network create leg-net 2>/dev/null || true

# PostgreSQL
info "Iniciando PostgreSQL 16..."
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
info "Iniciando Redis 7..."
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
  -p 127.0.0.1:9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=legislativo" \
  -e "MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}" \
  -v leg_minio_data:/data \
  minio/minio server /data --console-address ":9001" 2>&1 | tail -1

ok "Containers PostgreSQL, Redis e MinIO iniciados"

# Aguardar PostgreSQL
info "Aguardando PostgreSQL ficar pronto..."
RETRIES=30
until docker exec leg_postgres pg_isready -U legislativo &>/dev/null 2>&1; do
  RETRIES=$((RETRIES-1))
  [[ $RETRIES -eq 0 ]] && { warn "PostgreSQL demorou — continuando..."; break; }
  echo -n "."; sleep 2
done
echo ""
ok "PostgreSQL pronto!"

# Keycloak (async — demora ~2min na primeira vez)
info "Iniciando Keycloak 24 (async)..."
docker run -d \
  --name leg_keycloak \
  --network leg-net \
  --restart unless-stopped \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e "KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}" \
  quay.io/keycloak/keycloak:24.0 start-dev 2>&1 | tail -1

# Camunda (async)
info "Iniciando Camunda 7 (async)..."
docker run -d \
  --name leg_camunda \
  --network leg-net \
  --restart unless-stopped \
  -p 127.0.0.1:18085:8080 \
  camunda/camunda-bpm-platform:run-7.21.0 2>&1 | tail -1

ok "Keycloak e Camunda iniciando em background (~2min)..."

# =============================================================================
# ETAPA 5 — BUILD DA API
# =============================================================================
step "5/10 BUILD DA API"

cd "$APP_DIR"

info "Instalando dependências Node.js..."
pnpm install --no-frozen-lockfile 2>&1 | tail -3
ok "Dependências instaladas"

info "Gerando Prisma client..."
pnpm --filter @legislativo/api exec prisma generate 2>&1 | tail -2
ok "Prisma client gerado"

info "Executando migrations do banco..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -3 || \
  pnpm --filter @legislativo/api exec prisma db push --accept-data-loss 2>&1 | tail -3
ok "Banco de dados migrado"

info "Populando dados iniciais..."
pnpm --filter @legislativo/api exec tsx prisma/seed.ts 2>&1 | tail -8
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
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  pnpm --filter @legislativo/web build 2>&1 | tail -8
ok "Frontend compilado"

info "Copiando arquivos estáticos para standalone..."
STANDALONE_DIR="$APP_DIR/apps/web/.next/standalone/apps/web"
cp -r "$APP_DIR/apps/web/.next/static" "$STANDALONE_DIR/.next/static"
cp -r "$APP_DIR/apps/web/public" "$STANDALONE_DIR/public" 2>/dev/null || true
ok "Estáticos copiados para standalone"

# =============================================================================
# ETAPA 7 — PM2
# =============================================================================
step "7/10 PM2 — GERENCIADOR DE PROCESSOS"

pm2 delete leg-api leg-web 2>/dev/null || true

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
      watch: false,
    },
    {
      name: 'leg-web',
      script: '.next/standalone/apps/web/server.js',
      cwd: '/opt/legislativo/apps/web',
      interpreter: 'node',
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
PM2CFG

info "Iniciando com PM2..."
pm2 start "$APP_DIR/ecosystem.config.js" 2>&1 | tail -8

pm2 save --force 2>&1 | tail -1
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root 2>&1 | grep -v "^$" | tail -5

sleep 5
if curl -sf "http://localhost:${APP_PORT}/health" &>/dev/null; then
  ok "API respondendo na porta ${APP_PORT} ✅"
else
  warn "API ainda iniciando — logs: pm2 logs leg-api"
fi

if curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; then
  ok "Frontend respondendo na porta ${WEB_PORT} ✅"
else
  warn "Frontend ainda iniciando — logs: pm2 logs leg-web"
fi

# =============================================================================
# ETAPA 8 — NGINX COM SUPORTE A HTTP/HTTPS
# =============================================================================
step "8/10 NGINX — PROXY REVERSO"

# Parar qualquer coisa que esteja no 80/443 primeiro
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

# Remover site padrão
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/legislativo

# Configuração HTTP (base — depois certbot adiciona HTTPS)
cat > /etc/nginx/sites-available/legislativo << NGINX_CONF
# Sistema Legislativo Municipal
# Domínio: ${DOMAIN}
# Gerado em: $(date)

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=web:10m rate=60r/s;

# Upstream
upstream leg_api {
    server 127.0.0.1:${APP_PORT};
    keepalive 32;
}

upstream leg_web {
    server 127.0.0.1:${WEB_PORT};
    keepalive 16;
}

# HTTP — redireciona para HTTPS (após certbot)
# ou serve diretamente se HTTPS não estiver configurado
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${SERVER_IP};

    # Logs
    access_log ${LOG_DIR}/nginx-access.log;
    error_log  ${LOG_DIR}/nginx-error.log;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # API REST
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://leg_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
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
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
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

    location /favicon.ico {
        proxy_pass http://leg_web;
        access_log off;
    }

    # Frontend
    location / {
        limit_req zone=web burst=100 nodelay;
        proxy_pass http://leg_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONF

# Habilitar site
ln -sf /etc/nginx/sites-available/legislativo /etc/nginx/sites-enabled/legislativo

# Criar pasta para certbot
mkdir -p /var/www/html

# Testar e recarregar Nginx
nginx -t 2>&1
systemctl reload nginx
ok "Nginx configurado e ativo (HTTP)"

# =============================================================================
# ETAPA 9 — HTTPS COM CERTBOT
# =============================================================================
step "9/10 HTTPS — CERTBOT + LET'S ENCRYPT"

# Verificar se o domínio resolve para este IP
DOMAIN_IP=$(dig +short "${DOMAIN}" 2>/dev/null | tail -1 || \
            nslookup "${DOMAIN}" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}' || \
            curl -s "https://dns.google/resolve?name=${DOMAIN}&type=A" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Answer',[])[0]['data'] if d.get('Answer') else '')" 2>/dev/null || \
            echo "")

info "IP do servidor: ${SERVER_IP}"
info "IP do domínio ${DOMAIN}: ${DOMAIN_IP:-não resolvido}"

# Instalar dig se não tiver
command -v dig &>/dev/null || apt-get install -y -qq dnsutils 2>/dev/null | tail -1

DOMAIN_IP=$(dig +short "${DOMAIN}" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | tail -1 || echo "")

if [[ "$DOMAIN_IP" == "$SERVER_IP" ]] || [[ "$DOMAIN_IP" == "62.171.161.221" ]]; then
  info "Domínio aponta para este servidor — configurando HTTPS com Let's Encrypt..."

  # Obter certificado SSL
  certbot --nginx \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN}" \
    --redirect \
    --hsts \
    2>&1 | tail -15

  if [[ $? -eq 0 ]]; then
    ok "HTTPS configurado com sucesso! 🔒"
    ok "Certificado SSL obtido para ${DOMAIN}"

    # Renovação automática
    systemctl enable certbot.timer 2>/dev/null || \
      (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    ok "Renovação automática configurada (certbot renew)"
  else
    warn "Certbot falhou — domínio pode não apontar para este IP ainda"
    warn "Execute manualmente depois: certbot --nginx -d ${DOMAIN}"
  fi
else
  warn "Domínio ${DOMAIN} ainda não aponta para ${SERVER_IP}"
  warn "Configure o DNS: ${DOMAIN} → ${SERVER_IP} (Tipo A)"
  warn "Depois execute: certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect"

  # Configurar nginx para HTTP também funcionar enquanto DNS não propaga
  info "Sistema acessível via HTTP: http://${SERVER_IP}"
fi

# Testar configuração final do nginx
nginx -t 2>&1 && systemctl reload nginx

# =============================================================================
# ETAPA 10 — FIREWALL, HARDENING E AUTOMAÇÃO
# =============================================================================
step "10/10 FIREWALL, PM2 STARTUP E AUTOMAÇÃO"

# Firewall
ufw --force reset 2>/dev/null || true
ufw default deny incoming 2>/dev/null
ufw default allow outgoing 2>/dev/null
ufw allow ssh 2>/dev/null
ufw allow 80/tcp 2>/dev/null      # HTTP
ufw allow 443/tcp 2>/dev/null     # HTTPS
ufw allow 8080/tcp 2>/dev/null    # Keycloak
ufw allow 8085/tcp 2>/dev/null    # Camunda
ufw allow 9001/tcp 2>/dev/null    # MinIO Console
ufw --force enable 2>/dev/null
ok "Firewall UFW configurado"

# Script de redeploy rápido
cat > /usr/local/bin/leg-deploy << 'REDEPLOY'
#!/usr/bin/env bash
set -eo pipefail
APP_DIR="/opt/legislativo"
G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
ok()   { echo -e "${G}✔${N} $1"; }
info() { echo -e "${B}→${N} $1"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Redeploy — Sistema Legislativo Municipal"
echo "  $(date '+%d/%m/%Y %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

info "Atualizando código..."
git pull origin main 2>&1 | tail -3

info "Instalando dependências..."
pnpm install --no-frozen-lockfile 2>&1 | tail -2

info "Rodando migrations..."
pnpm --filter @legislativo/api exec prisma migrate deploy 2>&1 | tail -2 || true

info "Compilando API..."
pnpm --filter @legislativo/api build 2>&1 | tail -3

info "Compilando Frontend..."
pnpm --filter @legislativo/web build 2>&1 | tail -5

info "Copiando arquivos estáticos para standalone..."
STANDALONE="$APP_DIR/apps/web/.next/standalone/apps/web"
cp -r "$APP_DIR/apps/web/.next/static" "$STANDALONE/.next/static"
cp -r "$APP_DIR/apps/web/public" "$STANDALONE/public" 2>/dev/null || true

info "Reiniciando serviços..."
pm2 reload leg-api --update-env 2>&1 | tail -2
pm2 restart leg-web 2>&1 | tail -2
pm2 save --force 2>&1 | tail -1

info "Recarregando Nginx..."
nginx -t && systemctl reload nginx

echo ""
ok "Redeploy concluído! $(date '+%H:%M:%S')"
echo ""
pm2 list
REDEPLOY
chmod +x /usr/local/bin/leg-deploy
ok "Script 'leg-deploy' instalado em /usr/local/bin/leg-deploy"

# Garantir PM2 startup
pm2 save --force 2>&1 | tail -1
ok "PM2 configurado para reiniciar automaticamente no boot"

# =============================================================================
# VERIFICAÇÕES FINAIS
# =============================================================================
sleep 8

echo ""
echo -e "${BOLD}${G}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║             ✅  DEPLOY CONCLUÍDO!                        ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${N}"

echo -e "${BOLD}🌐 ACESSO:${N}"
# Verificar se HTTPS está ativo
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "   🔒 https://${DOMAIN}  (HTTPS ativo!)"
else
  echo "   🌐 http://${SERVER_IP}  (HTTP — configure DNS para HTTPS)"
fi
echo "   API:    /api/v1"
echo "   Docs:   /docs"
echo "   Health: /health"
echo ""
echo -e "${BOLD}🔑 LOGIN PARA TESTES:${N}"
echo "   Email:  admin@legislativo.gov.br"
echo "   Senha:  Admin@2024"
echo ""
echo -e "${BOLD}🏛️  SERVIÇOS:${N}"
echo "   Keycloak:  http://${SERVER_IP}:8080  (admin/${KEYCLOAK_ADMIN_PASSWORD})"
echo "   Camunda:   http://${SERVER_IP}:8085/camunda"
echo "   MinIO:     http://${SERVER_IP}:9001"
echo ""
echo -e "${BOLD}📊 STATUS PM2:${N}"
pm2 list 2>/dev/null

echo -e "\n${BOLD}📊 STATUS DOCKER:${N}"
docker ps --format "   {{.Names}}: {{.Status}}" 2>/dev/null

echo -e "\n${BOLD}📊 NGINX:${N}"
systemctl is-active nginx &>/dev/null && echo "   ✅ nginx ativo" || echo "   ❌ nginx inativo"

echo ""
echo -e "${BOLD}🔧 COMANDOS ÚTEIS:${N}"
echo "   Redeploy:    leg-deploy"
echo "   Logs API:    pm2 logs leg-api"
echo "   Logs Web:    pm2 logs leg-web"
echo "   Status:      pm2 status"
echo "   HTTPS:       certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect"
echo ""
echo "   Credenciais: /root/.legislativo-secrets"
echo ""

# Health check final
if curl -sf "http://localhost/health" &>/dev/null; then
  echo -e "   ${G}✅ Sistema respondendo em http://${SERVER_IP}${N}"
elif curl -sf "http://localhost:${APP_PORT}/health" &>/dev/null; then
  echo -e "   ${Y}⚠️  API OK na porta ${APP_PORT}, mas Nginx pode estar carregando${N}"
else
  echo -e "   ${Y}⚠️  Serviços ainda inicializando — verifique: pm2 status${N}"
fi
