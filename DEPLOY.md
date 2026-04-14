# 🚀 Guia de Implantação — Sistema Legislativo Municipal

## Índice

1. [Requisitos](#1-requisitos)
2. [Desenvolvimento local](#2-desenvolvimento-local)
3. [Configuração do Keycloak](#3-configuração-do-keycloak)
4. [Configuração do Camunda](#4-configuração-do-camunda)
5. [Configuração do MinIO](#5-configuração-do-minio)
6. [Deploy em produção](#6-deploy-em-produção)
7. [Checklist pré-go-live](#7-checklist-pré-go-live)
8. [Monitoramento e manutenção](#8-monitoramento-e-manutenção)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Requisitos

### Mínimos (desenvolvimento)
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Produção recomendada
- Servidor: 4 vCPU, 8 GB RAM
- Banco: PostgreSQL 16 gerenciado (RDS, Cloud SQL, Supabase)
- Cache: Redis 7 gerenciado (ElastiCache, Redis Cloud, Upstash)
- Storage: MinIO self-hosted ou AWS S3
- Auth: Keycloak 24 dedicado
- Processos: Camunda Run 7.x

---

## 2. Desenvolvimento local

### Passo a passo completo

```bash
# 1. Clonar repositório
git clone https://github.com/sua-org/legislativo-municipal.git
cd legislativo-municipal

# 2. Instalar dependências (monorepo)
pnpm install

# 3. Copiar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Subir toda a infraestrutura
pnpm docker:up

# Aguardar ~60s para todos os serviços iniciarem
# Verificar saúde:
docker-compose -f infra/docker/docker-compose.yml ps

# 5. Executar migrações do banco
pnpm db:migrate

# 6. Gerar client do Prisma
pnpm --filter @legislativo/api exec prisma generate

# 7. Popular dados iniciais
pnpm db:seed

# 8. Deploy dos BPMNs no Camunda
curl -X POST http://localhost:8085/engine-rest/deployment/create \
  -F "deployment-name=tramitacao-basica" \
  -F "enable-duplicate-filtering=true" \
  -F "tramitacao_proposicao_basica.bpmn=@infra/camunda/bpmn/tramitacao_proposicao_basica.bpmn"

curl -X POST http://localhost:8085/engine-rest/deployment/create \
  -F "deployment-name=tramitacao-urgente" \
  -F "enable-duplicate-filtering=true" \
  -F "tramitacao_urgente.bpmn=@infra/camunda/bpmn/tramitacao_urgente.bpmn"

# Deploy das decisões DMN
curl -X POST http://localhost:8085/engine-rest/deployment/create \
  -F "deployment-name=decisao-roteamento" \
  -F "enable-duplicate-filtering=true" \
  -F "decisao_roteamento_proposicao.dmn=@infra/camunda/dmn/decisao_roteamento_proposicao.dmn"

# 9. Iniciar em modo desenvolvimento (hot reload)
pnpm dev
```

### URLs de acesso (desenvolvimento)

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | — |
| API | http://localhost:3001 | — |
| API Health | http://localhost:3001/health | — |
| Keycloak Admin | http://localhost:8080 | admin / admin |
| Camunda Cockpit | http://localhost:8085/camunda | admin / admin |
| MinIO Console | http://localhost:9001 | legislativo / legislativo_secret_minio |
| MailHog (e-mail) | http://localhost:8025 | — |
| PostgreSQL | localhost:5432 | legislativo / legislativo_secret |
| Redis | localhost:6379 | — |

---

## 3. Configuração do Keycloak

### Criar Realm "legislativo"

1. Acessar http://localhost:8080 → Administration Console
2. Criar novo realm: `legislativo`
3. Ativar registro de usuários: **Off** (usuários criados pelo admin)

### Criar Client "legislativo-api"

```
Client ID: legislativo-api
Client Protocol: openid-connect
Access Type: bearer-only
```

### Criar Client "legislativo-web"

```
Client ID: legislativo-web
Client Protocol: openid-connect
Access Type: public
Valid Redirect URIs: http://localhost:3000/*
Web Origins: http://localhost:3000
```

### Obter Chave Pública RS256

```bash
# Copiar a chave para .env
curl http://localhost:8080/realms/legislativo \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['public_key'])"
```

Inserir no `.env` como:
```
KEYCLOAK_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIj...
```

### Criar usuário inicial

1. Keycloak → Manage → Users → Add user
2. Username: `admin@legislativo.gov.br`
3. Credentials: definir senha
4. Attributes: adicionar os perfis necessários

---

## 4. Configuração do Camunda

### Verificar que está rodando

```bash
curl http://localhost:8085/engine-rest/engine
# Resposta esperada: [{"name":"default"}]
```

### Deploy automático via API (script)

```bash
#!/bin/bash
# scripts/deploy-camunda.sh

CAMUNDA_URL="http://localhost:8085/engine-rest"

echo "Deployando BPMNs..."
for bpmn in infra/camunda/bpmn/*.bpmn; do
  name=$(basename "$bpmn" .bpmn)
  echo "  → $name"
  curl -s -X POST "$CAMUNDA_URL/deployment/create" \
    -F "deployment-name=$name" \
    -F "enable-duplicate-filtering=true" \
    -F "$name.bpmn=@$bpmn"
done

echo "Deployando DMNs..."
for dmn in infra/camunda/dmn/*.dmn; do
  name=$(basename "$dmn" .dmn)
  echo "  → $name"
  curl -s -X POST "$CAMUNDA_URL/deployment/create" \
    -F "deployment-name=$name" \
    -F "enable-duplicate-filtering=true" \
    -F "$name.dmn=@$dmn"
done

echo "Deploy concluído!"
```

---

## 5. Configuração do MinIO

### Criar bucket inicial

```bash
# Via CLI (mc)
mc alias set local http://localhost:9000 legislativo legislativo_secret_minio
mc mb local/legislativo-documentos
mc policy set download local/legislativo-documentos
```

### Via console web

1. Acessar http://localhost:9001
2. Login: `legislativo` / `legislativo_secret_minio`
3. Buckets → Create Bucket → `legislativo-documentos`
4. Configurar política de acesso adequada

---

## 6. Deploy em produção

### Build das imagens Docker

```bash
# API
docker build -f apps/api/Dockerfile -t legislativo-api:1.0.0 .

# Web
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.seudominio.gov.br \
  -f apps/web/Dockerfile \
  -t legislativo-web:1.0.0 .
```

### Deploy com Docker Compose (produção)

```bash
# Criar arquivo .env de produção
cat > infra/docker/.env.prod << EOF
DATABASE_URL=postgresql://legislativo:SENHA_FORTE@db-host:5432/legislativo
REDIS_URL=redis://:SENHA_REDIS@redis-host:6379
REDIS_PASSWORD=SENHA_REDIS
KEYCLOAK_URL=https://auth.seudominio.gov.br
KEYCLOAK_REALM=legislativo
KEYCLOAK_CLIENT_ID=legislativo-api
KEYCLOAK_ISSUER=https://auth.seudominio.gov.br/realms/legislativo
KEYCLOAK_PUBLIC_KEY=...chave_publica...
CAMUNDA_URL=https://bpm.seudominio.gov.br
MINIO_ENDPOINT=storage.seudominio.gov.br
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=legislativo-documentos
SMTP_HOST=smtp.seudominio.gov.br
SMTP_PORT=587
SMTP_FROM=noreply@camaramunicipal.gov.br
API_URL=https://api.seudominio.gov.br
FRONTEND_URL=https://app.seudominio.gov.br
EOF

# Subir produção
docker-compose -f infra/docker/docker-compose.prod.yml \
  --env-file infra/docker/.env.prod \
  up -d

# Executar migrações em produção
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx tsx prisma/seed.ts
```

### Nginx (reverse proxy)

```nginx
# /etc/nginx/sites-available/legislativo

# API
server {
    listen 443 ssl;
    server_name api.seudominio.gov.br;
    
    ssl_certificate /etc/letsencrypt/live/seudominio.gov.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.gov.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Upload de arquivos grandes
        client_max_body_size 50M;
    }
}

# Frontend
server {
    listen 443 ssl;
    server_name app.seudominio.gov.br;
    
    ssl_certificate /etc/letsencrypt/live/seudominio.gov.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.gov.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 7. Checklist pré-go-live

### Segurança
- [ ] Keycloak com HTTPS e certificado válido
- [ ] Senha admin do Keycloak alterada
- [ ] Senhas padrão do banco e Redis alteradas
- [ ] Variáveis de ambiente sensíveis em secrets manager (Vault, AWS Secrets Manager)
- [ ] Rate limiting configurado e testado
- [ ] CORS restrito ao domínio da câmara
- [ ] Headers de segurança (HSTS, CSP, X-Frame-Options)

### Dados
- [ ] Backup automático do PostgreSQL configurado
- [ ] Backup do MinIO configurado
- [ ] Seed de dados da câmara específica executado
- [ ] Tipos de matéria criados conforme Regimento Interno
- [ ] Fluxos BPMN deployados e testados
- [ ] Perfis e usuários iniciais criados

### Operação
- [ ] BPMNs deployados no Camunda
- [ ] Workers iniciados e monitorados
- [ ] E-mail SMTP testado (enviar e-mail de teste)
- [ ] MinIO com backup configurado
- [ ] Alertas de saúde configurados (uptime monitor)

### Funcional
- [ ] Fluxo completo testado: protocolo → aprovação → publicação
- [ ] Tramitação de urgência testada
- [ ] Upload e download de documentos funcionando
- [ ] Notificações de e-mail chegando corretamente
- [ ] Auditoria registrando todos os eventos

---

## 8. Monitoramento e manutenção

### Health check da API

```bash
curl https://api.seudominio.gov.br/health
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### Logs estruturados

```bash
# Logs da API em produção
docker-compose logs -f api | jq '.'

# Filtrar apenas erros
docker-compose logs api | grep '"level":50'

# Logs do Camunda
docker-compose logs camunda
```

### Backup do banco

```bash
# Backup manual
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automatizar com cron (diário às 2h)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/legislativo-$(date +\%Y\%m\%d).sql.gz
```

### Atualização do sistema

```bash
# Pull das alterações
git pull origin main

# Rebuild e redeploy
docker-compose -f infra/docker/docker-compose.prod.yml build
docker-compose -f infra/docker/docker-compose.prod.yml up -d

# Executar migrações se houver
docker-compose exec api npx prisma migrate deploy
```

---

## 9. Troubleshooting

### Camunda não conecta

```bash
# Verificar se está rodando
curl http://localhost:8085/engine-rest/engine

# Ver logs
docker-compose logs camunda

# Verificar banco de dados do Camunda
docker-compose exec postgres psql -U legislativo -c "\dt" | grep ACT_
```

### Prisma migration error

```bash
# Reset do banco (APENAS desenvolvimento)
pnpm --filter @legislativo/api exec prisma migrate reset

# Forçar aplicação das migrations
pnpm --filter @legislativo/api exec prisma migrate deploy
```

### Workers Camunda não processam

```bash
# Verificar tarefas pendentes
curl http://localhost:8085/engine-rest/external-task?maxResults=10

# Verificar se o tópico está correto no worker
# O tópico no worker deve bater com o topicName no BPMN:
# <serviceTask camunda:topic="publicacao-diario-oficial" ...>
```

### Upload de arquivos falha

```bash
# Verificar MinIO
curl http://localhost:9000/minio/health/live

# Verificar bucket existe
mc ls local/

# Criar bucket manualmente se necessário
mc mb local/legislativo-documentos
```

### Erro de autenticação JWT

```bash
# Verificar chave pública do Keycloak
curl http://localhost:8080/realms/legislativo | jq '.public_key'

# A chave deve estar no .env com prefixo/sufixo:
# -----BEGIN PUBLIC KEY-----
# <chave_base64>
# -----END PUBLIC KEY-----
```
