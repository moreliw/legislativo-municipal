import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Rotas públicas — sem autenticação.
 * Expostas em /api/v1/publico para acesso do portal de transparência.
 */
export async function publicoRoutes(app: FastifyInstance) {

  // ── LISTAR PROPOSIÇÕES (público) ──────────────────────────────────
  app.get('/proposicoes', async (req: FastifyRequest<{
    Querystring: {
      page?: string
      pageSize?: string
      busca?: string
      status?: string
      ano?: string
      tipo?: string
    }
  }>, reply) => {
    const page = Math.max(1, parseInt(req.query.page || '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '20')))
    const { busca, status, ano, tipo } = req.query

    const STATUSES_PUBLICOS = [
      'PROTOCOLADO', 'EM_ANALISE', 'AGUARDANDO_PARECER_JURIDICO',
      'EM_COMISSAO', 'EM_PAUTA', 'EM_VOTACAO',
      'APROVADO', 'REJEITADO', 'PUBLICADO', 'ARQUIVADO', 'DEVOLVIDO', 'SUSPENSO',
    ]
    const statusFiltro = status && STATUSES_PUBLICOS.includes(status) ? status : undefined

    const where: any = {
      status: statusFiltro ?? { notIn: ['RASCUNHO', 'EM_ELABORACAO'] },
      ...(ano ? { ano: parseInt(ano) } : {}),
      ...(tipo ? { tipoMateria: { sigla: { equals: tipo, mode: 'insensitive' } } } : {}),
      ...(busca ? {
        OR: [
          { numero: { contains: busca, mode: 'insensitive' } },
          { ementa: { contains: busca, mode: 'insensitive' } },
          { assunto: { contains: busca, mode: 'insensitive' } },
          { palavrasChave: { has: busca } },
        ],
      } : {}),
    }

    const [total, items] = await Promise.all([
      prisma.proposicao.count({ where }),
      prisma.proposicao.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true,
          numero: true,
          ano: true,
          ementa: true,
          status: true,
          origem: true,
          regime: true,
          criadoEm: true,
          protocoladoEm: true,
          atualizadoEm: true,
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true, cargo: true } },
          autorExterno: true,
          _count: { select: { tramitacoes: true, documentos: true } },
        },
      }),
    ])

    return {
      data: items,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  })

  // ── DETALHE DA PROPOSIÇÃO (público) ──────────────────────────────
  app.get('/proposicoes/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        numero: true,
        ano: true,
        ementa: true,
        textoCompleto: true,
        status: true,
        origem: true,
        regime: true,
        prioridade: true,
        palavrasChave: true,
        assunto: true,
        criadoEm: true,
        protocoladoEm: true,
        atualizadoEm: true,
        arquivadoEm: true,
        tipoMateria: { select: { nome: true, sigla: true } },
        autor: { select: { nome: true, cargo: true } },
        autorExterno: true,
        orgaoDestino: { select: { nome: true, sigla: true } },
        publicacoes: {
          orderBy: { criadoEm: 'desc' },
          take: 3,
          select: { id: true, tipo: true, data: true, url: true, numero: true },
        },
        documentos: {
          where: { publico: true },
          orderBy: { criadoEm: 'desc' },
          select: {
            id: true, nome: true, tipo: true, criadoEm: true,
            versoes: { take: 1, orderBy: { versao: 'desc' }, select: { url: true } },
          },
        },
        _count: { select: { tramitacoes: true } },
      },
    })

    if (!proposicao) return reply.status(404).send({ error: 'Proposição não encontrada' })
    return proposicao
  })

  // ── HISTÓRICO DE TRAMITAÇÃO (público) ─────────────────────────────
  app.get('/proposicoes/:id/tramitacao', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    })
    if (!proposicao) return reply.status(404).send({ error: 'Proposição não encontrada' })

    const historico = await prisma.tramitacaoEvento.findMany({
      where: { proposicaoId: req.params.id },
      orderBy: { sequencia: 'asc' },
      select: {
        id: true,
        sequencia: true,
        tipo: true,
        descricao: true,
        statusAntes: true,
        statusDepois: true,
        observacao: true,
        criadoEm: true,
        usuario: { select: { nome: true, cargo: true } },
        orgaoOrigem: { select: { nome: true, sigla: true } },
        documentosGerados: {
          select: {
            documento: {
              select: { id: true, nome: true, tipo: true },
            },
          },
        },
      },
    })

    return historico
  })

  // ── ESTATÍSTICAS (público) ────────────────────────────────────────
  app.get('/estatisticas', async (req: FastifyRequest<{ Querystring: { ano?: string } }>, reply) => {
    const ano = parseInt(req.query.ano || String(new Date().getFullYear()))
    const inicio = new Date(ano, 0, 1)
    const fim = new Date(ano, 11, 31, 23, 59, 59)

    const [total, aprovadas, emTramitacao, publicadas, porMes] = await Promise.all([
      prisma.proposicao.count({
        where: { status: { notIn: ['RASCUNHO', 'EM_ELABORACAO'] }, criadoEm: { gte: inicio, lte: fim } },
      }),
      prisma.proposicao.count({ where: { status: 'APROVADO', criadoEm: { gte: inicio, lte: fim } } }),
      prisma.proposicao.count({
        where: {
          status: { notIn: ['RASCUNHO', 'EM_ELABORACAO', 'ARQUIVADO', 'PUBLICADO', 'REJEITADO'] },
        },
      }),
      prisma.proposicao.count({ where: { status: 'PUBLICADO', criadoEm: { gte: inicio, lte: fim } } }),
      prisma.$queryRaw<Array<{ mes: number; total: bigint }>>`
        SELECT EXTRACT(MONTH FROM "criadoEm")::int as mes, COUNT(*)::bigint as total
        FROM proposicoes
        WHERE status NOT IN ('RASCUNHO', 'EM_ELABORACAO')
          AND "criadoEm" >= ${inicio}
          AND "criadoEm" <= ${fim}
        GROUP BY mes ORDER BY mes
      `,
    ])

    return {
      ano,
      total,
      aprovadas,
      emTramitacao,
      publicadas,
      taxaAprovacao: total > 0 ? Math.round((aprovadas / total) * 100) : 0,
      porMes: Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        total: Number(porMes.find(m => m.mes === i + 1)?.total ?? 0),
      })),
    }
  })
}
