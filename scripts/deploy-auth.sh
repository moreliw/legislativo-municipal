#!/usr/bin/env bash
# deploy-auth.sh — Aplica o sistema de autenticação no servidor
set -euo pipefail
APP_DIR="/opt/legislativo"
API_DIR="$APP_DIR/apps/api"

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }

echo ""
echo -e "${BOLD}  Sistema de Autenticação — Deploy${N}"
echo -e "  Câmara Municipal de Rio Novo do Sul - ES"
echo ""

# 1. Atualizar código
info "Atualizando código do GitHub..."
cd "$APP_DIR"
git fetch origin 2>&1 | tail -1
git reset --hard origin/main 2>&1 | tail -1
ok "Código: $(git log --oneline -1 | cut -c1-60)"

# 2. Instalar dependências incluindo bcryptjs e @fastify/cookie
info "Instalando dependências..."
pnpm install --no-frozen-lockfile 2>&1 | tail -2
cd "$API_DIR"
pnpm install --no-frozen-lockfile 2>&1 | tail -2
ok "Dependências instaladas"

# 3. Gerar Prisma client
info "Gerando Prisma client..."
npx prisma generate 2>&1 | tail -2

# 4. Aplicar schema (novos modelos: CredencialUsuario, SessaoAuth, etc.)
info "Aplicando novos modelos no banco de dados..."
source /root/.legislativo-secrets
DB_PORT="${DB_PORT:-5432}"
DB_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo"

# Preparar banco: remover constraints antigas antes do db push
info "Preparando constraints do banco..."
docker exec leg_postgres psql -U legislativo -d legislativo   -c 'ALTER TABLE perfis DROP CONSTRAINT IF EXISTS perfis_nome_key;'   2>/dev/null || true
docker exec leg_postgres psql -U legislativo -d legislativo   -c 'ALTER TABLE perfis ADD COLUMN IF NOT EXISTS "casaId" TEXT;'   2>/dev/null || true
docker exec leg_postgres psql -U legislativo -d legislativo   -c 'UPDATE perfis SET "casaId" = (SELECT id FROM casas_legislativas LIMIT 1) WHERE "casaId" IS NULL;'   2>/dev/null || true

# Aplicar schema (piped com "y" para responder prompt de confirmação se houver)
printf "y
" | DATABASE_URL="$DB_URL" npx prisma db push --accept-data-loss 2>&1 | tail -8
ok "Schema atualizado (CredencialUsuario, SessaoAuth, TokenSeguranca, EventoAuth)"

# 5. Executar seed (Rio Novo do Sul)
info "Populando dados de Rio Novo do Sul..."
DATABASE_URL="$DB_URL" npx tsx prisma/seed.ts 2>&1 | tail -15
ok "Dados de Rio Novo do Sul criados"

# 6. Compilar API
info "Compilando API..."
node_modules/.bin/esbuild src/server.ts \
  --bundle --platform=node --target=node20 \
  --outfile=dist/server.js --packages=external \
  2>&1 | tail -2
ok "API compilada"

# 7. Compilar Frontend
info "Compilando Frontend Next.js..."
cd "$APP_DIR/apps/web"
if ! swapon --show 2>/dev/null | grep -q swap; then
  fallocate -l 2G /tmp/swap_auth 2>/dev/null || dd if=/dev/zero of=/tmp/swap_auth bs=1M count=2048 2>/dev/null
  chmod 600 /tmp/swap_auth && mkswap /tmp/swap_auth >/dev/null && swapon /tmp/swap_auth
fi
NODE_OPTIONS="--max-old-space-size=3072" \
  NEXT_PUBLIC_API_URL="https://pleno.morelidev.com/api" \
  npx next build 2>&1 | tail -8

SDIR=".next/standalone/apps/web"
[[ -d "$SDIR" ]] && cp -r .next/static "$SDIR/.next/static" 2>/dev/null || true
ok "Frontend compilado"
swapoff /tmp/swap_auth 2>/dev/null || true

# 8. Reiniciar PM2
info "Reiniciando serviços..."
cd "$APP_DIR"
pm2 reload all --update-env 2>&1 | tail -3
pm2 save --force >/dev/null
sleep 5

# 9. Reiniciar Nginx
nginx -t 2>/dev/null && systemctl reload nginx

# 10. Verificação final
echo ""
echo -e "${BOLD}══════════════════════════════════════════════${N}"
echo -e "${BOLD}  RESULTADO${N}"
echo -e "${BOLD}══════════════════════════════════════════════${N}"
echo ""

API_OK=false
WEB_OK=false
curl -sf "http://localhost:3001/health" &>/dev/null && API_OK=true || true
curl -sf "http://localhost:3000" &>/dev/null && WEB_OK=true || true

$API_OK && ok "API: ONLINE ✅" || echo "  ❌ API offline — pm2 logs leg-api"
$WEB_OK && ok "Frontend: ONLINE ✅" || echo "  ❌ Frontend offline"
curl -sf "http://localhost" &>/dev/null && ok "Nginx: ONLINE ✅" || echo "  ❌ Nginx"
echo ""
pm2 list 2>/dev/null | grep -E "name|leg-"
echo ""
echo -e "${BOLD}🔑 LOGINS DISPONÍVEIS:${N}"
echo ""
echo "  ADMINISTRADOR:"
echo "  admin@camararionovosul.es.gov.br / RioNovo@2024!"
echo ""
echo "  SECRETÁRIA LEGISLATIVA:"
echo "  secretaria@camararionovosul.es.gov.br / Secretaria@2024!"
echo ""
echo "  VEREADOR:"
echo "  joao.pereira@camararionovosul.es.gov.br / Vereador@2024!"
echo ""
echo "  ASSESSOR JURÍDICO:"
echo "  juridico@camararionovosul.es.gov.br / Juridico@2024!"
echo ""

source /root/.legislativo-secrets 2>/dev/null || source /root/.legislativo-secrets
DOMAIN="${DOMAIN:-pleno.morelidev.com}"
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] && \
  echo "  🌐 https://${DOMAIN}" || \
  echo "  🌐 http://62.171.161.221"
echo ""
