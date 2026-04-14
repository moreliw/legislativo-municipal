# 🏛️ Sistema Legislativo Municipal

Plataforma completa de gestão legislativa para câmaras municipais brasileiras.

[![Deploy Status](https://github.com/moreliw/legislativo-municipal/actions/workflows/deploy.yml/badge.svg)](https://github.com/moreliw/legislativo-municipal/actions/workflows/deploy.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://typescriptlang.org)

## 🌐 Acesso em Produção

| Serviço | URL |
|---------|-----|
| **Frontend** | http://62.171.161.221 |
| **API REST** | http://62.171.161.221/api/v1 |
| **Swagger** | http://62.171.161.221/docs |
| **Health Check** | http://62.171.161.221/health |
| **Keycloak** | http://62.171.161.221:8080 |
| **Camunda** | http://62.171.161.221:8085/camunda |
| **MinIO** | http://62.171.161.221:9001 |

### 🔑 Login para Testes
```
Email: admin@legislativo.gov.br
Senha: Admin@2024
```

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (porta 80)                         │
│    /          → Next.js (porta 3000)                        │
│    /api/*     → Fastify API (porta 3001)                    │
│    /docs      → Swagger UI                                  │
│    /health    → Health Check                                │
└─────────────────────────────────────────────────────────────┘
         │                        │
    ┌────┴────┐              ┌────┴────┐
    │ PM2     │              │ PM2     │
    │ leg-web │              │ leg-api │
    │ (fork)  │              │(cluster)│
    └─────────┘              └────┬────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
         ┌────┴────┐        ┌─────┴────┐        ┌────┴───┐
         │Postgres │        │  Redis   │        │ MinIO  │
         │ Docker  │        │  Docker  │        │ Docker │
         └─────────┘        └──────────┘        └────────┘
```

## 🚀 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Fastify + TypeScript + Prisma |
| Banco de dados | PostgreSQL 16 |
| Cache | Redis 7 |
| Storage | MinIO (S3-compatible) |
| Auth | Keycloak 24 (OIDC) |
| Motor BPM | Camunda 7 (BPMN/DMN) |
| Monorepo | Turborepo + pnpm |
| Process Manager | PM2 |
| Proxy Reverso | Nginx |
| CI/CD | GitHub Actions |

## 📦 Deploy

### Deploy Inicial (apenas uma vez)
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/moreliw/legislativo-municipal/main/scripts/deploy-server.sh)
```

### Redeploy Rápido (após push)
```bash
leg-deploy
```

### CI/CD Automático
Todo `git push` na branch `main` dispara o deploy automático via GitHub Actions.

**Secrets necessários no GitHub:**
- `SERVER_HOST` = 62.171.161.221
- `SERVER_USER` = root
- `SERVER_PASSWORD` = (senha do servidor)

## 📁 Estrutura do Projeto

```
legislativo-municipal/
├── apps/
│   ├── api/                    # API Fastify (TypeScript)
│   │   ├── prisma/             # Schema, migrations, seeds
│   │   └── src/
│   │       ├── modules/        # Módulos de domínio
│   │       ├── plugins/        # Auth, Auditoria, LGPD, Swagger
│   │       └── lib/            # Serviços compartilhados
│   └── web/                    # Frontend Next.js 14
│       ├── app/                # App Router (21 páginas)
│       ├── components/         # Componentes React
│       └── lib/                # Hooks, API client
├── infra/
│   ├── docker/                 # Docker Compose (dev + prod)
│   ├── camunda/                # BPMNs e DMNs
│   └── keycloak/               # Realm configuration
├── packages/
│   └── types/                  # Tipos TypeScript compartilhados
├── scripts/
│   ├── deploy-server.sh        # Deploy completo (1 comando)
│   ├── health-check.sh         # Verificação de saúde
│   ├── deploy-camunda.sh       # Deploy de fluxos BPMN
│   └── setup.sh                # Setup ambiente dev
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD automático
```

## 🔧 Desenvolvimento Local

```bash
# Clonar
git clone https://github.com/moreliw/legislativo-municipal.git
cd legislativo-municipal

# Setup completo (Docker + deps + DB + seed)
bash scripts/setup.sh

# Iniciar em modo dev
pnpm dev
```

## 📋 Módulos do Sistema

| Módulo | Descrição |
|--------|-----------|
| **Proposições** | Cadastro, tramitação, numeração automática |
| **Sessões** | Plenárias, votação ao vivo, presença |
| **Tramitação** | Histórico imutável, 22 tipos de evento |
| **Documentos** | Upload, versionamento, assinaturas |
| **Processos** | Motor Camunda BPMN/DMN |
| **Notificações** | Alertas internos, email, Telegram, WhatsApp |
| **Auditoria** | Log imutável de todas as operações (LGPD) |
| **Portal Público** | Transparência legislativa |
| **Admin** | Usuários, regras, fluxos, configurações |

## 📊 Testes

```bash
# Todos os testes
pnpm test

# Com cobertura
pnpm --filter @legislativo/api test:coverage
```

**Cobertura atual:** 14 suítes, ~120 casos de teste

## 📄 Licença

MIT — Câmara Municipal de São Francisco, MG
