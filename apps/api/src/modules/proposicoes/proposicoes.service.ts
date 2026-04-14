import { PrismaClient, StatusProposicao, Prisma } from '@prisma/client'
import { AppError, NotFoundError, ConflictError } from '../../lib/errors'
import { numeracaoService } from '../admin/numeracao.service'
import { cacheGet, cacheSet, cacheDel } from '../../lib/redis'
import { logger } from '../../lib/logger'

const prisma = new PrismaClient()

export interface CriarProposicaoInput {
  casaId: string
  tipoMateriaId: string
  ementa: string
  textoCompleto?: string
  origem: string
  regime?: string
  prioridade?: string
  autorId?: string
  autorExterno?: string
  palavrasChave?: string[]
  assunto?: string
  observacoes?: string
}

export class ProposicoesService {

  /**
   * Cria uma nova proposição com numeração automática
   */
  async criar(input: CriarProposicaoInput) {
    const tipoMateria = await prisma.tipoMateria.findUnique({
      where: { id: input.tipoMateriaId },
    })
    if (!tipoMateria) throw new NotFoundError('TipoMateria', input.tipoMateriaId)

    const numero = await numeracaoService.gerarNumero(input.casaId, tipoMateria.prefixoNumero)

    // Verificar se o número já foi gerado (race condition)
    const existente = await prisma.proposicao.findUnique({ where: { numero } })
    if (existente) throw new ConflictError(`Número ${numero} já existe`)

    const proposicao = await prisma.proposicao.create({
      data: {
        casaId: input.casaId,
        numero,
        ano: new Date().getFullYear(),
        tipoMateriaId: input.tipoMateriaId,
        autorId: input.autorId,
        autorExterno: input.autorExterno,
        ementa: input.ementa,
        textoCompleto: input.textoCompleto,
        origem: input.origem as any,
        regime: (input.regime ?? 'ORDINARIO') as any,
        prioridade: (input.prioridade ?? 'NORMAL') as any,
        palavrasChave: input.palavrasChave ?? [],
        assunto: input.assunto,
        observacoes: input.observacoes,
        status: 'RASCUNHO',
      },
    })

    logger.info({ proposicaoId: proposicao.id, numero }, 'Proposição criada')
    return proposicao
  }

  /**
   * Busca proposição por ID com cache Redis (30s)
   */
  async buscarPorId(id: string) {
    const cacheKey = `proposicao:${id}`
    const cached = await cacheGet<Prisma.ProposicaoGetPayload<{ include: { tipoMateria: true } }>>(cacheKey)
    if (cached) return cached

    const proposicao = await prisma.proposicao.findUnique({
      where: { id },
      include: {
        tipoMateria: true,
        autor: { select: { id: true, nome: true, cargo: true, avatar: true } },
        orgaoDestino: true,
        documentos: {
          include: { versoes: { take: 1, orderBy: { versao: 'desc' } } },
          orderBy: { criadoEm: 'desc' },
        },
        tramitacoes: {
          orderBy: { sequencia: 'asc' },
          include: {
            usuario: { select: { id: true, nome: true, cargo: true } },
            orgaoOrigem: { select: { id: true, nome: true, sigla: true } },
            documentosGerados: {
              include: { documento: { select: { id: true, nome: true, tipo: true } } },
            },
          },
        },
        instanciaProcesso: {
          include: { tarefas: { where: { status: 'PENDENTE' }, take: 5 } },
        },
        pautas: {
          include: { sessao: { select: { id: true, numero: true, data: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 3,
        },
        publicacoes: { orderBy: { data: 'desc' }, take: 1 },
      },
    })

    if (!proposicao) throw new NotFoundError('Proposicao', id)

    await cacheSet(cacheKey, proposicao, 30)
    return proposicao
  }

  /**
   * Invalida cache de uma proposição (após atualização)
   */
  async invalidarCache(id: string) {
    await cacheDel(`proposicao:${id}`)
  }

  /**
   * Listar com filtros e paginação
   */
  async listar(params: {
    casaId: string
    page?: number
    pageSize?: number
    status?: StatusProposicao
    tipoMateriaId?: string
    autorId?: string
    orgaoDestinoId?: string
    busca?: string
    de?: Date
    ate?: Date
    orderBy?: 'criadoEm' | 'atualizadoEm' | 'numero'
    order?: 'asc' | 'desc'
  }) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20

    const where: Prisma.ProposicaoWhereInput = {
      casaId: params.casaId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tipoMateriaId ? { tipoMateriaId: params.tipoMateriaId } : {}),
      ...(params.autorId ? { autorId: params.autorId } : {}),
      ...(params.orgaoDestinoId ? { orgaoDestinoId: params.orgaoDestinoId } : {}),
      ...(params.busca ? {
        OR: [
          { numero: { contains: params.busca, mode: 'insensitive' } },
          { ementa: { contains: params.busca, mode: 'insensitive' } },
          { assunto: { contains: params.busca, mode: 'insensitive' } },
        ],
      } : {}),
      ...(params.de || params.ate ? {
        criadoEm: {
          ...(params.de ? { gte: params.de } : {}),
          ...(params.ate ? { lte: params.ate } : {}),
        },
      } : {}),
    }

    const [total, items] = await Promise.all([
      prisma.proposicao.count({ where }),
      prisma.proposicao.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [params.orderBy ?? 'criadoEm']: params.order ?? 'desc' },
        include: {
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true, cargo: true } },
          orgaoDestino: { select: { nome: true, sigla: true } },
          _count: { select: { tramitacoes: true, documentos: true } },
        },
      }),
    ])

    return {
      data: items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Estatísticas de produção legislativa
   */
  async estatisticas(casaId: string, ano?: number) {
    const anoRef = ano ?? new Date().getFullYear()
    const inicioAno = new Date(anoRef, 0, 1)
    const fimAno = new Date(anoRef, 11, 31, 23, 59, 59)

    const [
      totalAno,
      aprovadas,
      rejeitadas,
      emTramitacao,
      porTipo,
      porMes,
    ] = await Promise.all([
      prisma.proposicao.count({ where: { casaId, criadoEm: { gte: inicioAno, lte: fimAno } } }),
      prisma.proposicao.count({ where: { casaId, status: 'APROVADO', criadoEm: { gte: inicioAno } } }),
      prisma.proposicao.count({ where: { casaId, status: 'REJEITADO', criadoEm: { gte: inicioAno } } }),
      prisma.proposicao.count({ where: { casaId, status: { notIn: ['ARQUIVADO', 'PUBLICADO', 'REJEITADO'] } } }),
      prisma.proposicao.groupBy({
        by: ['tipoMateriaId'],
        where: { casaId, criadoEm: { gte: inicioAno, lte: fimAno } },
        _count: true,
      }),
      // Proposições por mês
      prisma.$queryRaw<Array<{ mes: number; total: bigint }>>`
        SELECT EXTRACT(MONTH FROM "criadoEm")::int as mes, COUNT(*)::bigint as total
        FROM proposicoes
        WHERE "casaId" = ${casaId}
          AND "criadoEm" >= ${inicioAno}
          AND "criadoEm" <= ${fimAno}
        GROUP BY mes
        ORDER BY mes
      `,
    ])

    return {
      ano: anoRef,
      totalAno,
      aprovadas,
      rejeitadas,
      emTramitacao,
      taxaAprovacao: totalAno > 0 ? Math.round((aprovadas / totalAno) * 100) : 0,
      porMes: Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        total: Number(porMes.find(m => m.mes === i + 1)?.total ?? 0),
      })),
    }
  }
}

export const proposicoesService = new ProposicoesService()
