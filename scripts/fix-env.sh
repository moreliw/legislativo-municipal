#!/usr/bin/env bash
set -euo pipefail
source /root/.legislativo-secrets

G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }

DB_PORT="${DB_PORT:-5433}"
DB_PASSWORD="${DB_PASSWORD}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
REDIS_PASSWORD="${REDIS_PASSWORD:-$(openssl rand -hex 16)}"
REDIS_PORT="${REDIS_PORT:-6380}"
DOMAIN="${DOMAIN:-pleno.morelidev.com}"

ENV_FILE="/opt/legislativo/apps/api/.env"

info "Verificando .env da API..."
if [[ -f "$ENV_FILE" ]]; then
  echo "  Conteúdo atual:"
  grep "DATABASE_URL\|JWT_SECRET" "$ENV_FILE" | sed 's/=.*/=***/' | head -5
fi

info "Recriando .env com credenciais corretas..."
cat > "$ENV_FILE" << ENVFILE
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

DATABASE_URL=postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:${REDIS_PORT}

JWT_SECRET=${JWT_SECRET}

CORS_ORIGIN=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
ENVFILE

ok ".env recriado"
echo "  DATABASE_URL: postgresql://legislativo:****@localhost:${DB_PORT}/legislativo"
echo "  JWT_SECRET: ${#JWT_SECRET} caracteres"

# Reiniciar API
info "Reiniciando API..."
pm2 restart leg-api --update-env 2>&1 | tail -3
sleep 4

# Testar
info "Testando conexão com banco..."
if curl -sf http://localhost:3001/health >/dev/null; then
  ok "API online"

  # Testar login
  HTTP=$(curl -s -o /tmp/lr.json -w "%{http_code}" \
    -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}')

  if [[ "$HTTP" == "200" ]]; then
    ok "Login funcionando! ✅"
    python3 -c "
import json
d=json.load(open('/tmp/lr.json'))
u=d['usuario']
print(f'  Nome: {u[\"nome\"]}')
print(f'  Email: {u[\"email\"]}')
print(f'  Câmara: {u[\"casaNome\"]}')
print(f'  Perfis: {u[\"perfis\"]}')
"
  else
    echo "  Login HTTP $HTTP: $(cat /tmp/lr.json | head -c 300)"
  fi
else
  echo "  ❌ API offline"
  pm2 logs leg-api --lines 10 --nostream | tail -15
fi
