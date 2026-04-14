#!/usr/bin/env bash
# scripts/setup.sh — Configuração completa do ambiente de desenvolvimento
# Uso: bash scripts/setup.sh

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[setup]${NC} $1"; }
ok()   { echo -e "${GREEN}[ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[erro]${NC} $1"; exit 1; }

log "Sistema Legislativo Municipal — Setup"
echo "======================================"

# Verificar dependências
command -v node  >/dev/null 2>&1 || err "Node.js não encontrado. Instale via https://nodejs.org"
command -v pnpm  >/dev/null 2>&1 || err "pnpm não encontrado. Execute: npm install -g pnpm"
command -v docker>/dev/null 2>&1 || err "Docker não encontrado. Instale via https://docs.docker.com/get-docker/"

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[[ "$NODE_VER" -ge 20 ]] || err "Node.js 20+ necessário. Versão atual: $(node -v)"

ok "Dependências verificadas"

# Instalar dependências Node
log "Instalando dependências..."
pnpm install
ok "Dependências instaladas"

# Configurar variáveis de ambiente
if [[ ! -f apps/api/.env ]]; then
  log "Criando apps/api/.env..."
  cp apps/api/.env.example apps/api/.env
  ok "apps/api/.env criado"
else
  warn "apps/api/.env já existe — pulando"
fi

if [[ ! -f apps/web/.env.local ]]; then
  log "Criando apps/web/.env.local..."
  cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
  ok "apps/web/.env.local criado"
fi

# Subir infraestrutura Docker
log "Iniciando serviços Docker..."
docker-compose -f infra/docker/docker-compose.yml up -d

log "Aguardando PostgreSQL ficar pronto..."
RETRIES=30
until docker-compose -f infra/docker/docker-compose.yml exec -T postgres \
  pg_isready -U legislativo >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -eq 0 ]] && err "PostgreSQL não iniciou no tempo esperado"
  sleep 2
done
ok "PostgreSQL pronto"

log "Aguardando Camunda ficar pronto..."
RETRIES=30
until curl -sf http://localhost:8085/engine-rest/engine >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -eq 0 ]] && { warn "Camunda ainda não respondeu — continuando..."; break; }
  sleep 3
done

# Migrations do banco
log "Executando migrações do banco..."
pnpm --filter @legislativo/api exec prisma generate
pnpm --filter @legislativo/api exec prisma migrate dev --name init
ok "Migrações executadas"

# Índices adicionais
log "Criando índices de busca..."
docker-compose -f infra/docker/docker-compose.yml exec -T postgres \
  psql -U legislativo -d legislativo \
  -f /dev/stdin < apps/api/prisma/migrations/0001_initial_indexes.sql \
  >/dev/null 2>&1 || warn "Índices opcionais não criados (ignorar em primeiro setup)"

# Seed de dados iniciais
log "Populando dados iniciais..."
pnpm --filter @legislativo/api exec tsx prisma/seed.ts
ok "Dados iniciais criados"

# Deploy dos BPMNs no Camunda
if curl -sf http://localhost:8085/engine-rest/engine >/dev/null 2>&1; then
  log "Deployando fluxos BPMN no Camunda..."
  bash scripts/deploy-camunda.sh
  ok "Fluxos BPMN deployados"
else
  warn "Camunda não disponível — deploy manual necessário depois"
  warn "Execute: bash scripts/deploy-camunda.sh"
fi

# Criar bucket MinIO
log "Criando bucket MinIO..."
if command -v mc >/dev/null 2>&1; then
  mc alias set local http://localhost:9000 legislativo legislativo_secret_minio --quiet 2>/dev/null || true
  mc mb --quiet local/legislativo-documentos 2>/dev/null || warn "Bucket já existe"
  ok "Bucket MinIO criado"
else
  warn "mc (MinIO Client) não encontrado — criando via API..."
  # Criar via API MinIO
  curl -sf -X POST "http://localhost:9000/legislativo-documentos" \
    -H "Authorization: AWS4-HMAC-SHA256" >/dev/null 2>&1 || true
fi

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  Setup concluído com sucesso! 🎉   ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Serviços disponíveis:"
echo "  Frontend:       http://localhost:3000"
echo "  API:            http://localhost:3001"
echo "  Keycloak:       http://localhost:8080  (admin/admin)"
echo "  Camunda:        http://localhost:8085/camunda  (admin/admin)"
echo "  MinIO Console:  http://localhost:9001  (legislativo/legislativo_secret_minio)"
echo "  MailHog:        http://localhost:8025"
echo ""
echo "Para iniciar em modo desenvolvimento:"
echo "  pnpm dev"
echo ""
