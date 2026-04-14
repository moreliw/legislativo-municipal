import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { FastifyInstance } from 'fastify'

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_SWAGGER) {
    return // Desabilitado em produção por padrão
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Sistema Legislativo Municipal — API',
        description: `
## API REST do Sistema Legislativo Municipal

Plataforma de gestão legislativa e documental para câmaras municipais.
Cobre o ciclo completo de proposições: protocolo, tramitação, sessões, votação, publicação.

### Autenticação
Todas as rotas (exceto \`/health\` e \`/api/v1/publicacao/portal\`) requerem JWT Bearer token.
O token é obtido pelo fluxo OIDC do Keycloak.

### Permissões
Cada endpoint requer uma permissão específica no formato \`modulo:acao\`.
Exemplo: \`proposicoes:criar\`, \`tramitacao:encaminhar\`, \`sessoes:votar\`.

### Codes de status
- \`200\` — OK
- \`201\` — Criado
- \`400\` — Validação inválida
- \`401\` — Não autenticado
- \`403\` — Sem permissão
- \`404\` — Não encontrado
- \`422\` — Lógica de negócio violada (ex: transição de estado inválida)
- \`500\` — Erro interno
        `,
        version: '1.0.0',
        contact: {
          name: 'Suporte Técnico',
          email: 'suporte@camaramunicipal.gov.br',
        },
        license: {
          name: 'MIT',
        },
      },
      externalDocs: {
        description: 'Documentação completa',
        url: 'https://github.com/sua-org/legislativo-municipal',
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Desenvolvimento' },
        { url: 'https://api.seudominio.gov.br', description: 'Produção' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido via Keycloak OIDC',
          },
        },
        schemas: {
          Proposicao: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'cuid', example: 'clxxxxxxxx' },
              numero: { type: 'string', example: 'PL-024/2024' },
              ano: { type: 'integer', example: 2024 },
              ementa: { type: 'string', example: 'Dispõe sobre o programa de energia solar...' },
              status: {
                type: 'string',
                enum: [
                  'RASCUNHO', 'EM_ELABORACAO', 'PROTOCOLADO', 'EM_ANALISE',
                  'EM_COMISSAO', 'AGUARDANDO_PARECER_JURIDICO', 'EM_PAUTA',
                  'EM_VOTACAO', 'APROVADO', 'REJEITADO', 'DEVOLVIDO',
                  'PUBLICADO', 'ARQUIVADO', 'SUSPENSO', 'RETIRADO',
                ],
              },
              origem: { type: 'string', enum: ['VEREADOR', 'MESA_DIRETORA', 'COMISSAO', 'PREFEITURA', 'POPULAR', 'EXTERNA'] },
              regime: { type: 'string', enum: ['ORDINARIO', 'URGENTE', 'URGENCIA_ESPECIAL', 'SUMARIO'] },
              criadoEm: { type: 'string', format: 'date-time' },
              atualizadoEm: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'numero', 'ementa', 'status'],
          },
          TramitacaoEvento: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sequencia: { type: 'integer', example: 1 },
              tipo: {
                type: 'string',
                enum: [
                  'PROTOCOLO', 'DISTRIBUICAO', 'ENCAMINHAMENTO', 'DESPACHO',
                  'PARECER_JURIDICO', 'PARECER_COMISSAO', 'INCLUSAO_PAUTA',
                  'VOTACAO', 'APROVACAO', 'REJEICAO', 'DEVOLUCAO', 'SUSPENSAO',
                  'REATIVACAO', 'REDACAO_FINAL', 'ASSINATURA', 'PUBLICACAO', 'ARQUIVAMENTO',
                ],
              },
              descricao: { type: 'string' },
              statusAntes: { type: 'string' },
              statusDepois: { type: 'string' },
              criadoEm: { type: 'string', format: 'date-time' },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'ValidationError' },
              message: { type: 'string', example: 'Dados inválidos' },
              statusCode: { type: 'integer', example: 400 },
            },
          },
          PaginatedResponse: {
            type: 'object',
            properties: {
              data: { type: 'array', items: {} },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Proposições', description: 'Gestão de proposições e tramitação' },
        { name: 'Tramitação', description: 'Eventos e histórico de tramitação' },
        { name: 'Sessões', description: 'Sessões legislativas, pauta e votações' },
        { name: 'Documentos', description: 'Gestão de documentos e arquivos' },
        { name: 'PDF', description: 'Geração de documentos PDF' },
        { name: 'Processos', description: 'Motor de processos Camunda' },
        { name: 'Publicação', description: 'Portal de transparência' },
        { name: 'Notificações', description: 'Central de notificações' },
        { name: 'Auditoria', description: 'Logs e trilhas de auditoria' },
        { name: 'Busca', description: 'Busca global' },
        { name: 'Admin', description: 'Configurações e administração' },
        { name: 'Usuários', description: 'Perfil e tarefas do usuário' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: true,
      filter: true,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  })

  app.log.info('Swagger UI disponível em /docs')
})
