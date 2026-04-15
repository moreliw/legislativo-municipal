import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

declare module 'fastify' {
  interface FastifyRequest {
    auditoria: {
      registrar: (data: {
        entidade: string
        entidadeId: string
        acao: string
        dadosAntes?: unknown
        dadosDepois?: unknown
      }) => Promise<void>
    }
  }
}

export async function auditoriaPlugin(app: FastifyInstance) {
  // Registrar decorator de auditoria apenas se não existir
  if (!app.hasDecorator('auditoria')) {
    app.decorateRequest('auditoria', null)
  }
  app.addHook('onRequest', async (req: FastifyRequest) => {
    req.auditoria = {
      registrar: async ({ entidade, entidadeId, acao, dadosAntes, dadosDepois }) => {
        try {
          await prisma.auditoriaLog.create({
            data: {
              entidade,
              entidadeId,
              acao,
              usuarioId: req.user?.id ?? null,
              ip:        req.ip,
              endpoint:  `${req.method} ${req.url}`,
              dadosAntes:   dadosAntes  ? (dadosAntes  as any) : undefined,
              dadosDepois:  dadosDepois ? (dadosDepois as any) : undefined,
            },
          })
        } catch {
          // Falha de auditoria nunca deve quebrar o fluxo principal
        }
      },
    }
  })
}

// Serviço de auditoria para uso direto nos módulos
export class AuditoriaService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async registrar(data: {
    entidade: string
    entidadeId: string
    acao: string
    usuarioId?: string
    ip?: string
    endpoint?: string
    dadosAntes?: unknown
    dadosDepois?: unknown
  }) {
    try {
      await this.prisma.auditoriaLog.create({ data: data as any })
    } catch {
      // Falha silenciosa — auditoria nunca quebra o fluxo
    }
  }

  async listar(filtros: {
    entidade?: string
    entidadeId?: string
    usuarioId?: string
    de?: Date
    ate?: Date
    page?: number
    pageSize?: number
  }) {
    const { entidade, entidadeId, usuarioId, de, ate, page = 1, pageSize = 50 } = filtros
    const where: any = {}
    if (entidade)   where.entidade   = entidade
    if (entidadeId) where.entidadeId = entidadeId
    if (usuarioId)  where.usuarioId  = usuarioId
    if (de || ate)  where.criadoEm   = { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) }

    const [total, data] = await Promise.all([
      this.prisma.auditoriaLog.count({ where }),
      this.prisma.auditoriaLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
        include: { usuario: { select: { nome: true, email: true } } },
      }),
    ])
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
  }
}

export const auditoriaService = new AuditoriaService()
