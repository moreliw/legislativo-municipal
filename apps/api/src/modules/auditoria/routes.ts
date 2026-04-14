import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { auditoriaService } from '../../plugins/auditoria'

export async function auditoriaRoutes(app: FastifyInstance) {

  app.get('/', {
    preHandler: [requireAuth, requirePermission('auditoria:listar')],
  }, async (req: FastifyRequest<{ Querystring: {
    entidade?: string; entidadeId?: string; usuarioId?: string
    de?: string; ate?: string; page?: string; pageSize?: string
  } }>, reply) => {
    const { entidade, entidadeId, usuarioId, de, ate, page, pageSize } = req.query
    return auditoriaService.listar({
      entidade,
      entidadeId,
      usuarioId,
      de: de ? new Date(de) : undefined,
      ate: ate ? new Date(ate) : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
    })
  })

  app.get('/exportar', {
    preHandler: [requireAuth, requirePermission('auditoria:exportar')],
  }, async (req: FastifyRequest<{ Querystring: { entidade?: string; de?: string; ate?: string } }>, reply) => {
    const csv = await auditoriaService.exportar({
      entidade: req.query.entidade,
      de: req.query.de ? new Date(req.query.de) : undefined,
      ate: req.query.ate ? new Date(req.query.ate) : undefined,
    })

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="auditoria-${Date.now()}.csv"`)
    return reply.send(csv)
  })
}
