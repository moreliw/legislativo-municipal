#!/usr/bin/env bash
# db-info.sh — Exibe informações de acesso ao banco de dados
set -euo pipefail

source /root/.legislativo-secrets 2>/dev/null || {
  echo "❌ Arquivo /root/.legislativo-secrets não encontrado"
  exit 1
}

SERVER_IP="62.171.161.221"
DB_PORT="${DB_PORT:-5433}"
DB_USER="legislativo"
DB_NAME="legislativo"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        ACESSO AO BANCO DE DADOS POSTGRESQL               ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Host:      ${SERVER_IP}                                  ║"
echo "║  Porta:     ${DB_PORT}                                    ║"
echo "║  Banco:     ${DB_NAME}                                    ║"
echo "║  Usuário:   ${DB_USER}                                    ║"
echo "║  Senha:     ${DB_PASSWORD}                                ║"
echo "║                                                           ║"
echo "║  Connection String:                                       ║"
echo "║  postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:${DB_PORT}/${DB_NAME}"
echo "║                                                           ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  FERRAMENTAS RECOMENDADAS:                                ║"
echo "║                                                           ║"
echo "║  1. TablePlus (GUI - Mac/Win/Linux) - RECOMENDADO         ║"
echo "║     tableplus.com — conexão direta, visual e rápida       ║"
echo "║                                                           ║"
echo "║  2. DBeaver (GUI - gratuito)                              ║"
echo "║     dbeaver.io — universal, open source                   ║"
echo "║                                                           ║"
echo "║  3. psql (CLI)                                            ║"
echo "║     psql -h ${SERVER_IP} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
echo "║                                                           ║"
echo "║  4. Prisma Studio (web local)                             ║"
echo "║     cd /opt/legislativo/apps/api && npx prisma studio     ║"
echo "║                                                           ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  STATUS:                                                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Verificar status do container
if docker ps | grep -q leg_postgres; then
  echo "  ✅ PostgreSQL: ONLINE (container leg_postgres)"
  docker exec leg_postgres psql -U legislativo -d legislativo -c "\dt" 2>/dev/null | \
    grep -v "^$\|Rows\|List\|Schema\|------" | wc -l | xargs -I{} echo "  📊 Tabelas: {} tabelas"
else
  echo "  ❌ PostgreSQL: OFFLINE"
  echo "  Execute: docker start leg_postgres"
fi

# Verificar se porta está acessível externamente
echo ""
echo "  Verificando acesso externo na porta ${DB_PORT}..."
if ss -tlnp | grep -q ":${DB_PORT}"; then
  echo "  ✅ Porta ${DB_PORT}: ESCUTANDO"
else
  echo "  ⚠️  Porta ${DB_PORT}: não exposta externamente"
  echo "  Para liberar acesso externo, execute o comando abaixo:"
fi

echo ""
echo "  ━━━━ LIBERAR ACESSO EXTERNO AO BANCO ━━━━"
echo "  # Expor porta do container na interface pública:"
echo "  docker stop leg_postgres"
echo "  docker rm leg_postgres"
echo "  docker run -d \\"
echo "    --name leg_postgres \\"
echo "    --restart unless-stopped \\"
echo "    -p ${SERVER_IP}:${DB_PORT}:5432 \\"
echo "    -e POSTGRES_DB=legislativo \\"
echo "    -e POSTGRES_USER=legislativo \\"
echo "    -e POSTGRES_PASSWORD=${DB_PASSWORD} \\"
echo "    -v leg_postgres_data:/var/lib/postgresql/data \\"
echo "    postgres:16-alpine"
echo ""
echo "  # Abrir porta no firewall (UFW):"
echo "  ufw allow from any to any port ${DB_PORT} proto tcp"
echo ""
