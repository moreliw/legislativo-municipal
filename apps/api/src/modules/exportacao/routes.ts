import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { exportarProposicoes, exportarTramitacao, exportarPresencaSessoes } from '../../lib/export.service'
import { auditoriaService } from '../../plugins/auditoria'

export async function exportacaoRoutes(app: FastifyInstance) {

  // ── Exportar proposições ──────────────────────────────────────────
  app.get('/proposicoes', {
    preHandler: [requireAuth, requirePermission('relatorios:exportar')],
  }, async (req: FastifyRequest<{
    Querystring: { formato?: string; status?: string; de?: string; ate?: string }
  }>, reply) => {
    const formato = (req.query.formato ?? 'csv') as 'csv' | 'json'
    const { dados, mimeType, extensao } = await exportarProposicoes({
      formato,
      casaId: req.user.casaId,
      filtros: {
        status: req.query.status,
        de: req.query.de ? new Date(req.query.de) : undefined,
        ate: req.query.ate ? new Date(req.query.ate) : undefined,
      },
    })

    await auditoriaService.registrar({
      usuarioId: req.user.id,
      entidade: 'Proposicao',
      entidadeId: 'exportacao',
      acao: 'EXPORTAR',
      dadosDepois: { formato, filtros: req.query },
    })

    const dataStr = new Date().toISOString().slice(0, 10)
    reply.header('Content-Type', mimeType)
    reply.header('Content-Disposition', `attachment; filename="proposicoes-${dataStr}.${extensao}"`)
    return reply.send(dados)
  })

  // ── Exportar tramitação de proposição ────────────────────────────
  app.get('/tramitacao/:proposicaoId', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Params: { proposicaoId: string }
    Querystring: { formato?: string }
  }>, reply) => {
    const formato = (req.query.formato ?? 'csv') as 'csv' | 'json'
    const { dados, mimeType, extensao } = await exportarTramitacao(req.params.proposicaoId, formato)

    await auditoriaService.registrar({
      usuarioId: req.user.id,
      entidade: 'TramitacaoEvento',
      entidadeId: req.params.proposicaoId,
      acao: 'EXPORTAR',
    })

    reply.header('Content-Type', mimeType)
    reply.header('Content-Disposition', `attachment; filename="tramitacao-${req.params.proposicaoId}.${extensao}"`)
    return reply.send(dados)
  })

  // ── Exportar presença em sessões ──────────────────────────────────
  app.get('/sessoes/presencas', {
    preHandler: [requireAuth, requirePermission('relatorios:exportar')],
  }, async (req: FastifyRequest<{ Querystring: { formato?: string } }>, reply) => {
    const formato = (req.query.formato ?? 'csv') as 'csv' | 'json'
    const { dados, mimeType, extensao } = await exportarPresencaSessoes(req.user.casaId, formato)

    reply.header('Content-Type', mimeType)
    reply.header('Content-Disposition', `attachment; filename="presencas-sessoes.${extensao}"`)
    return reply.send(dados)
  })
}
