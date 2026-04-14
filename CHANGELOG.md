# Changelog — Sistema Legislativo Municipal

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

Formato: [Semantic Versioning](https://semver.org/lang/pt-BR/)

---

## [1.0.0] — 2024-04-25

### Adicionado

#### Módulo de Proposições
- Cadastro completo com numeração automática (`PL-001/2024`)
- 15 estados de tramitação com transições validadas
- Múltiplas origens: vereador, prefeitura, popular, etc.
- Regimes: ordinário, urgente, urgência especial, sumário
- Palavras-chave e classificação por assunto

#### Módulo de Tramitação
- Histórico imutável append-only com rastreabilidade total
- 22 tipos de evento (protocolo, despacho, encaminhamento, etc.)
- Timeline visual com alternância esquerda/direita
- Filtros por tipo de evento
- Transições de estado validadas com regras de negócio

#### Módulo de Processos (Camunda)
- Integração REST com Camunda 7
- Deploy dinâmico de BPMNs via API
- Workers externos para tarefas automáticas
- BPMN: tramitação básica (PL/PDL) com 12 tarefas e 4 gateways
- BPMN: tramitação urgente (caminho simplificado)
- DMN: roteamento de proposição (7 regras)
- DMN: quórum necessário por tipo de votação
- Monitoramento de instâncias ativas
- Avaliação de decisões DMN

#### Módulo de Sessões
- Sessões: ordinária, extraordinária, especial, solene
- Gestão de pauta com ordenação
- Registro de presença e controle de quórum
- Votação nominal (sim, não, abstenção, ausente)
- Apuração em tempo real
- Geração de ata
- Controle de status (agendada → aberta → encerrada)

#### Módulo de Documentos
- Upload para MinIO com hash SHA-256
- Controle de versões com histórico de alterações
- 13 tipos de documento
- Trilhas de assinatura digital
- URLs pré-assinadas para download seguro
- Drag-and-drop na interface

#### Geração de PDFs
- Despachos com assinatura
- Pauta de sessão com itens
- Relatório de proposições (paisagem)
- Templates com cabeçalho da câmara

#### Módulo de Notificações
- Notificações internas no painel
- Envio de e-mail via SMTP
- Alertas de prazo (48h e no dia)
- Filas assíncronas com BullMQ
- Notificação por usuário, órgão e perfil

#### Módulo de Auditoria
- Log imutável de todas as operações
- Dados antes/depois para atualizações
- Exportação em CSV
- Filtros por entidade, ação, usuário, período
- Conformidade LGPD

#### Módulo de Publicação
- Publicação no Diário Oficial
- Portal de transparência público
- Versões públicas com controle

#### Módulo Administrativo
- Gestão de usuários e perfis (7 perfis pré-definidos)
- Gestão de tipos de matéria
- Construtor de regras (6 tipos: roteamento, validação, prazo, etc.)
- Gestão de fluxos BPMN com deploy integrado
- Configurações da câmara
- Calendário e feriados

#### Autenticação e Autorização
- Integração Keycloak (OIDC/OAuth2)
- JWT RS256
- Permissões granulares por módulo:ação
- Suporte a wildcard (`*:*`, `proposicoes:*`)
- Realm Keycloak pré-configurado

#### Infraestrutura
- Docker Compose (dev): PostgreSQL, Redis, MinIO, Keycloak, Camunda, MailHog
- Docker Compose (prod): API + Web + Redis
- Dockerfiles otimizados com multi-stage build
- CI/CD GitHub Actions: lint, testes, cobertura, deploy
- Scripts de setup e deploy automatizados

#### Testes
- 8 arquivos de teste cobrindo domínios críticos
- Testes unitários: TramitacaoService, CamundaService, AuditoriaService, NumeracaoService
- Testes de integração: proposições, sessões (fluxo completo com votação)
- Testes E2E: ciclo completo de tramitação
- Testes frontend: componentes, filtros, validação de formulário
- Coverage mínimo: 70% statements, 60% branches

#### Frontend (Next.js 14)
- 16 páginas completas
- Command palette com ⌘K
- Timeline interativa de tramitação
- Dashboard com KPIs e métricas
- Formulário multi-step para nova proposição
- Sessão ao vivo com votação em tempo real
- Gráficos de produção legislativa
- Portal público de transparência

### Segurança
- Rate limiting: 200 req/min por usuário
- CORS configurável
- Sanitização de inputs com Zod
- Auditoria de todos os acessos
- Headers de segurança via Keycloak
- Senhas hasheadas (Keycloak)

---

## [Próximos lançamentos — Roadmap]

### [1.1.0] — Planejado
- [ ] Assinatura digital ICP-Brasil / Gov.br
- [ ] Editor rich text integrado para texto de proposições
- [ ] Busca full-text avançada (PostgreSQL FTS)
- [ ] Exportação para e-Legis / SABIO (formatos federais)
- [ ] App móvel (React Native) para vereadores
- [ ] Integração com e-mail institucional (IMAP/POP3)

### [1.2.0] — Planejado
- [ ] Módulo de contratos e convênios
- [ ] Painel de votação em tela grande (projeção no plenário)
- [ ] Portal de participação popular (proposição de pautas)
- [ ] Relatórios avançados com filtros dinâmicos
- [ ] Multi-câmara (SaaS multi-tenant)
- [ ] Integração com SIAFEM / SIOPS

---

## Arquitetura de decisões técnicas

### Por que Camunda?
BPMN como fonte de verdade para os fluxos garante que regras legislativas sejam configuráveis sem código. O administrador pode alterar o fluxo de tramitação sem deploy.

### Por que Fastify sobre Express?
Performance superior, tipagem nativa TypeScript, schema validation via plugins, e plugin ecosystem maduro.

### Por que PostgreSQL com Prisma?
Relações complexas entre entidades legislativas, FTS nativo, JSONB para dados flexíveis, e Prisma como type-safe ORM.

### Por que BullMQ para filas?
Persistência em Redis, retry automático, jobs agendados (cron), e monitoramento nativo — ideal para alertas de prazo e geração de PDFs.
