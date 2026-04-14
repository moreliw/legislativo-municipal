import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../plugins/auth'
import { NotificacaoService } from './notificacao.service'

const prisma = new PrismaClient()
const notificacaoService = new NotificacaoService()

export async function notificacoesRoutes(app: FastifyInstance) {
  // Listar notificações do usuário
  app.get('/', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Querystring: { lida?: string; page?: string } }>, reply) => {
      const page = parseInt(req.query.page || '1')
      const pageSize = 20
      const where = {
        usuarioId: req.user.id,
        ...(req.query.lida !== undefined ? { lida: req.query.lida === 'true' } : {}),
      }
      const [total, notificacoes] = await Promise.all([
        prisma.notificacao.count({ where }),
        prisma.notificacao.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { proposicao: { select: { numero: true, ementa: true } } },
        }),
      ])
      const naoLidas = await prisma.notificacao.count({ where: { usuarioId: req.user.id, lida: false } })
      return { data: notificacoes, meta: { total, page, pageSize, naoLidas } }
    },
  )

  // Marcar como lida
  app.patch('/:id/lida', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      await notificacaoService.marcarLida(req.params.id, req.user.id)
      return { ok: true }
    },
  )

  // Marcar todas como lidas
  app.patch('/todas/lidas', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      await notificacaoService.marcarTodasLidas(req.user.id)
      return { ok: true }
    },
  )
}
