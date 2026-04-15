#!/usr/bin/env bash
set -euo pipefail
source /root/.legislativo-secrets

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}[✔]${N} $1"; }
info() { echo -e "${B}[→]${N} $1"; }
warn() { echo -e "${Y}[!]${N} $1"; }

DB_PORT="${DB_PORT:-5433}"
DB_PASSWORD="${DB_PASSWORD}"
SERVER_IP="62.171.161.221"

echo ""
echo -e "${BOLD}  Configurando acesso externo ao PostgreSQL${N}"
echo ""

# ── 1. Recriar container exposto em 0.0.0.0 ─────────────────────
info "Reconfigurando container PostgreSQL para acesso externo..."
docker stop leg_postgres 2>/dev/null || true
docker rm   leg_postgres 2>/dev/null || true

docker run -d \
  --name leg_postgres \
  --restart unless-stopped \
  -p 0.0.0.0:${DB_PORT}:5432 \
  -e POSTGRES_DB=legislativo \
  -e POSTGRES_USER=legislativo \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -v leg_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

sleep 5
ok "PostgreSQL reiniciado com binding 0.0.0.0:${DB_PORT}"

# ── 2. Aguardar banco subir ──────────────────────────────────────
info "Aguardando banco ficar pronto..."
for i in $(seq 1 20); do
  docker exec leg_postgres pg_isready -U legislativo &>/dev/null && break
  sleep 2
done
ok "Banco pronto"

# ── 3. Abrir firewall ────────────────────────────────────────────
info "Configurando firewall (UFW)..."
ufw allow ${DB_PORT}/tcp comment "PostgreSQL Legislativo" 2>/dev/null || true
ufw reload 2>/dev/null || true
ok "Porta ${DB_PORT} liberada no firewall"

# ── 4. Configurar pg_hba.conf para aceitar conexões externas ────
info "Configurando pg_hba.conf para conexões externas..."
docker exec leg_postgres sh -c "
cat >> /var/lib/postgresql/data/pg_hba.conf << 'HBA'
# Acesso externo com senha
host  all  all  0.0.0.0/0  scram-sha-256
HBA
"
docker exec leg_postgres sh -c "
cat >> /var/lib/postgresql/data/postgresql.conf << 'PGCONF'
listen_addresses = '*'
PGCONF
"
docker restart leg_postgres
sleep 5
ok "PostgreSQL configurado para aceitar conexões externas"

# ── 5. Gerar Prisma client ───────────────────────────────────────
info "Gerando Prisma client..."
cd /opt/legislativo/apps/api
DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo" \
  npx prisma generate 2>&1 | tail -2

# ── 6. Aplicar schema ────────────────────────────────────────────
info "Aplicando schema no banco..."
printf "y\n" | DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo" \
  npx prisma db push --accept-data-loss 2>&1 | tail -5
ok "Schema aplicado"

# ── 7. Criar tabela de menus e popular ───────────────────────────
info "Criando e populando tabela de menus..."
DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo" \
  npx tsx /opt/legislativo/apps/api/prisma/seed-menus.ts 2>&1 | tail -20

# ── 8. Criar superadmin ──────────────────────────────────────────
info "Criando superadmin..."
DATABASE_URL="postgresql://legislativo:${DB_PASSWORD}@localhost:${DB_PORT}/legislativo" \
  npx tsx /opt/legislativo/apps/api/prisma/seed-superadmin.ts 2>&1 | tail -10

# ── 9. Resultado ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${N}"
echo -e "${BOLD}║         ACESSO AO BANCO DE DADOS                      ║${N}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════╣${N}"
echo   "║                                                        ║"
echo   "║  Host:     ${SERVER_IP}                                ║"
echo   "║  Porta:    ${DB_PORT}                                  ║"
echo   "║  Banco:    legislativo                                  ║"
echo   "║  Usuário:  legislativo                                  ║"
echo   "║  Senha:    ${DB_PASSWORD}"
echo   "║                                                        ║"
echo   "║  Connection String:                                     ║"
echo   "║  postgresql://legislativo:${DB_PASSWORD}@${SERVER_IP}:${DB_PORT}/legislativo"
echo   "║                                                        ║"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════╣${N}"
echo   "║  FERRAMENTAS RECOMENDADAS:                              ║"
echo   "║  • TablePlus: tableplus.com (melhor GUI)                ║"
echo   "║  • DBeaver:   dbeaver.io (gratuito)                     ║"
echo   "║  • pgAdmin:   pgadmin.org (web)                         ║"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${N}"
echo ""

# Teste de conexão
if docker exec leg_postgres psql -U legislativo -d legislativo -c "SELECT COUNT(*) as tabelas FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | grep -q "[0-9]"; then
  ok "Conexão local: FUNCIONANDO"
  TABLE_COUNT=$(docker exec leg_postgres psql -U legislativo -d legislativo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
  ok "Tabelas no banco: ${TABLE_COUNT}"
else
  warn "Teste de conexão falhou"
fi

echo ""
