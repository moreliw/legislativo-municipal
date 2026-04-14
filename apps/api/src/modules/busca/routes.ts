import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient, Prisma } from '@prisma/client'
import { requireAuth } from '../../plugins/auth'

const prisma = new PrismaClient()

export async function buscaRoutes(app: FastifyInstance) {

  /**
   * Busca global — proposições, sessões, documentos
   * Usado pelo command palette e pela busca avançada
   */
  app.get('/global', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2 },
          tipos: { type: 'string' },
          limit: { type: 'integer', default: 10 },
        },
        required: ['q'],
      },
    },
  }, async (req: FastifyRequest<{
    Querystring: { q: string; tipos?: string; limit?: number }
  }>, reply) => {
    const { q, tipos, limit = 10 } = req.query
    const tiposFiltro = tipos?.split(',') ?? ['proposicao', 'sessao', 'documento']
    const resultados: unknown[] = []

    // Busca proposições
    if (tiposFiltro.includes('proposicao')) {
      const proposicoes = await prisma.proposicao.findMany({
        where: {
          casaId: req.user.casaId,
          OR: [
            { numero: { contains: q, mode: 'insensitive' } },
            { ementa: { contains: q, mode: 'insensitive' } },
            { assunto: { contains: q, mode: 'insensitive' } },
            { autorExterno: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { atualizadoEm: 'desc' },
        select: {
          id: true, numero: true, ementa: true, status: true,
          tipoMateria: { select: { sigla: true } },
          autor: { select: { nome: true } },
        },
      })
      resultados.push(...proposicoes.map(p => ({
        id: p.id,
        tipo: 'proposicao',
        titulo: p.ementa,
        subtitulo: `${p.status.replace(/_/g, ' ')} · ${p.autor?.nome ?? ''}`,
        numero: p.numero,
        href: `/proposicoes/${p.id}`,
        status: p.status,
      })))
    }

    // Busca sessões
    if (tiposFiltro.includes('sessao')) {
      const sessoes = await prisma.sessaoLegislativa.findMany({
        where: {
          casaId: req.user.casaId,
          OR: [
            { numero: { contains: q, mode: 'insensitive' } },
            { local: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: Math.floor(limit / 2),
        orderBy: { data: 'desc' },
        select: { id: true, numero: true, tipo: true, data: true, status: true },
      })
      resultados.push(...sessoes.map(s => ({
        id: s.id,
        tipo: 'sessao',
        titulo: `Sessão ${s.tipo} ${s.numero}`,
        subtitulo: `${new Date(s.data).toLocaleDateString('pt-BR')} · ${s.status}`,
        href: `/sessoes/${s.id}`,
      })))
    }

    // Busca documentos
    if (tiposFiltro.includes('documento')) {
      const documentos = await prisma.documento.findMany({
        where: {
          nome: { contains: q, mode: 'insensitive' },
          proposicao: { casaId: req.user.casaId },
        },
        take: Math.floor(limit / 2),
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true, nome: true, tipo: true, status: true,
          proposicao: { select: { numero: true, id: true } },
        },
      })
      resultados.push(...documentos.map(d => ({
        id: d.id,
        tipo: 'documento',
        titulo: d.nome,
        subtitulo: `${d.proposicao?.numero ?? 'Avulso'} · ${d.tipo}`,
        href: d.proposicao ? `/proposicoes/${d.proposicao.id}/documentos` : '/documentos',
      })))
    }

    return {
      query: q,
      total: resultados.length,
      resultados,
    }
  })
}
