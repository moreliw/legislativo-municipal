import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient, AcaoAuditoria } from '@prisma/client'

const prisma = new PrismaClient()

export const auditoriaPlugin = fp(async (app: FastifyInstance) => {
  if (!app.hasRequestDecorator('auditoria')) {
    app.decorateRequest('auditoria', null)
  }

  app.addHook('onRequest', async (req: FastifyRequest) => {
    req.auditoria = {
      registrar: async ({ entidade, entidadeId, acao, dadosAntes, dadosDepois }) => {
        try {
          await prisma.auditoriaLog.create({
            data: {
              usuarioId: req.user?.id ?? null,
              entidade,
              entidadeId,
              acao: acao as AcaoAuditoria,
              dadosAntes: dadosAntes ? JSON.parse(JSON.stringify(dadosAntes)) : undefined,
              dadosDepois: dadosDepois ? JSON.parse(JSON.stringify(dadosDepois)) : undefined,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              endpoint: `${req.method} ${req.url}`,
            },
          })
        } catch (err) {
          req.log.error({ err }, 'Falha ao registrar auditoria')
        }
      },
    }
  })
})

export class AuditoriaService {
  async registrar(data: {
    usuarioId?: string
    entidade: string
    entidadeId: string
    acao: string
    dadosAntes?: unknown
    dadosDepois?: unknown
    ip?: string
    endpoint?: string
  }) {
    return prisma.auditoriaLog.create({
      data: {
        usuarioId: data.usuarioId ?? null,
        entidade: data.entidade,
        entidadeId: data.entidadeId,
        acao: data.acao as AcaoAuditoria,
        dadosAntes: data.dadosAntes ? JSON.parse(JSON.stringify(data.dadosAntes)) : undefined,
        dadosDepois: data.dadosDepois ? JSON.parse(JSON.stringify(data.dadosDepois)) : undefined,
        ip: data.ip,
        endpoint: data.endpoint,
      },
    })
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
    const where = {
      ...(filtros.entidade ? { entidade: filtros.entidade } : {}),
      ...(filtros.entidadeId ? { entidadeId: filtros.entidadeId } : {}),
      ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      ...(filtros.de || filtros.ate
        ? { criadoEm: { gte: filtros.de, lte: filtros.ate } }
        : {}),
    }

    const page = filtros.page ?? 1
    const pageSize = filtros.pageSize ?? 50

    const [total, logs] = await Promise.all([
      prisma.auditoriaLog.count({ where }),
      prisma.auditoriaLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          usuario: { select: { nome: true, email: true } },
        },
      }),
    ])

    return { data: logs, meta: { total, page, pageSize } }
  }

  async exportar(filtros: { entidade?: string; de?: Date; ate?: Date }) {
    const logs = await prisma.auditoriaLog.findMany({
      where: {
        ...(filtros.entidade ? { entidade: filtros.entidade } : {}),
        ...(filtros.de || filtros.ate
          ? { criadoEm: { gte: filtros.de, lte: filtros.ate } }
          : {}),
      },
      orderBy: { criadoEm: 'asc' },
      include: { usuario: { select: { nome: true, email: true, cpf: true } } },
    })

    // Gera CSV
    const header = 'id,data,entidade,entidadeId,acao,usuario,email,ip,endpoint'
    const rows = logs.map(l =>
      [
        l.id,
        l.criadoEm.toISOString(),
        l.entidade,
        l.entidadeId,
        l.acao,
        l.usuario?.nome ?? '',
        l.usuario?.email ?? '',
        l.ip ?? '',
        l.endpoint ?? '',
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )

    return [header, ...rows].join('\n')
  }
}

export const auditoriaService = new AuditoriaService()
