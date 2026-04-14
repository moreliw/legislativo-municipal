#!/usr/bin/env bash
# scripts/health-check.sh — Verificação de saúde de todos os serviços
# Uso: bash scripts/health-check.sh [URL_BASE]

set -euo pipefail

BASE_URL="${1:-http://localhost}"
API_URL="${BASE_URL}:3001"
WEB_URL="${BASE_URL}:3000"
CAMUNDA_URL="${BASE_URL}:8085"
KEYCLOAK_URL="${BASE_URL}:8080"
MINIO_URL="${BASE_URL}:9000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}~${NC} $1"; }

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  if code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null); then
    if [[ "$code" == "$expected" ]]; then
      pass "$name ($code)"
      return 0
    else
      fail "$name (HTTP $code, esperado $expected)"
      return 1
    fi
  else
    fail "$name (conexão recusada)"
    return 1
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sistema Legislativo — Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FALHAS=0

echo ""
echo "Aplicação:"
check "API health"           "$API_URL/health"          200 || ((FALHAS++))
check "Web frontend"         "$WEB_URL"                 200 || ((FALHAS++))

echo ""
echo "Infraestrutura:"
check "Camunda (engine)"     "$CAMUNDA_URL/engine-rest/engine" 200 || ((FALHAS++))
check "Keycloak (realm)"     "$KEYCLOAK_URL/realms/legislativo" 200 || ((FALHAS++))
check "MinIO (health)"       "$MINIO_URL/minio/health/live" 200 || ((FALHAS++))

echo ""
echo "Banco de dados (via API):"
API_HEALTH=$(curl -s "$API_URL/health" 2>/dev/null || echo '{}')
if echo "$API_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('status')=='ok' else 1)" 2>/dev/null; then
  pass "PostgreSQL (via API health)"
  VERSION=$(echo "$API_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version','?'))" 2>/dev/null || echo "?")
  UPTIME=$(echo "$API_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uptime','?'))" 2>/dev/null || echo "?")
  echo "    Versão API: $VERSION · Uptime: ${UPTIME}s"
else
  fail "PostgreSQL (API não respondeu corretamente)" && ((FALHAS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $FALHAS -eq 0 ]]; then
  echo -e "${GREEN}  Todos os serviços estão saudáveis! ✓${NC}"
else
  echo -e "${RED}  $FALHAS serviço(s) com problema!${NC}"
  echo "  Verifique os logs: docker-compose logs [serviço]"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FALHAS
