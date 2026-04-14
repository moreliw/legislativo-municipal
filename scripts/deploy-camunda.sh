#!/usr/bin/env bash
# scripts/deploy-camunda.sh — Deploy automático de BPMNs e DMNs no Camunda
# Uso: bash scripts/deploy-camunda.sh [URL_CAMUNDA]

set -euo pipefail

CAMUNDA_URL="${1:-http://localhost:8085}/engine-rest"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[camunda]${NC} $1"; }
ok()   { echo -e "${GREEN}[ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[erro]${NC} $1"; exit 1; }

# Verificar que Camunda está acessível
log "Verificando conexão com Camunda em $CAMUNDA_URL..."
if ! curl -sf "$CAMUNDA_URL/engine" >/dev/null 2>&1; then
  err "Camunda não acessível em $CAMUNDA_URL"
fi
ok "Camunda conectado"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BPMN_DIR="$PROJECT_ROOT/infra/camunda/bpmn"
DMN_DIR="$PROJECT_ROOT/infra/camunda/dmn"

deploy_file() {
  local file="$1"
  local name
  name=$(basename "$file" | sed 's/\.[^.]*$//')
  local ext="${file##*.}"

  log "Deployando: $name.$ext"

  RESPONSE=$(curl -s -X POST "$CAMUNDA_URL/deployment/create" \
    -F "deployment-name=$name" \
    -F "enable-duplicate-filtering=true" \
    -F "deployment-source=legislativo-setup" \
    -F "$name.$ext=@$file")

  if echo "$RESPONSE" | grep -q '"id"'; then
    DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "OK")
    ok "$name deployado (id: $DEPLOY_ID)"
  else
    warn "Resposta inesperada para $name: $RESPONSE"
  fi
}

# Deploy BPMNs
log "=== Deployando BPMNs ==="
if [[ -d "$BPMN_DIR" ]]; then
  for bpmn in "$BPMN_DIR"/*.bpmn; do
    [[ -f "$bpmn" ]] && deploy_file "$bpmn"
  done
else
  warn "Diretório BPMN não encontrado: $BPMN_DIR"
fi

# Deploy DMNs
log "=== Deployando DMNs ==="
if [[ -d "$DMN_DIR" ]]; then
  for dmn in "$DMN_DIR"/*.dmn; do
    [[ -f "$dmn" ]] && deploy_file "$dmn"
  done
else
  warn "Diretório DMN não encontrado: $DMN_DIR"
fi

# Listar deployments realizados
log "=== Deployments no Camunda ==="
curl -s "$CAMUNDA_URL/deployment?sortBy=deploymentTime&sortOrder=desc&maxResults=10" \
  | python3 -c "
import sys, json
deps = json.load(sys.stdin)
for d in deps:
    print(f'  [{d[\"deploymentTime\"][:10]}] {d[\"name\"]} (id: {d[\"id\"][:8]}...)')
" 2>/dev/null || warn "Não foi possível listar deployments"

echo ""
echo -e "${GREEN}Deploy Camunda concluído!${NC}"
echo "Acesse o Cockpit: ${CAMUNDA_URL%/engine-rest}/camunda"
