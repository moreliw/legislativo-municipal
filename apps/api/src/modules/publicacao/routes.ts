import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../../plugins/auth'

const prisma = new PrismaClient()

export async function publicacaoRoutes(app: FastifyInstance) {

  // ── PUBLICAR PROPOSIÇÃO ─────────────────────────────────────────
  app.post('/:proposicaoId', {
    preHandler: [requireAuth, requirePermission('publicacao:publicar')],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string }; Body: { tipo: string; numero?: string } }>, reply) => {
    const { tipo, numero } = req.body as { tipo: string; numero?: string }
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: req.params.proposicaoId },
      include: { tipoMateria: true, autor: { select: { nome: true } } },
    })

    if (!proposicao) return reply.status(404).send({ error: 'Proposição não encontrada' })
    if (proposicao.status !== 'APROVADO') {
      return reply.status(422).send({ error: 'Somente proposições aprovadas podem ser publicadas' })
    }

    const conteudo = `${proposicao.tipoMateria.nome} N° ${proposicao.numero}\n\n${proposicao.ementa}\n\nPublicado em: ${new Date().toLocaleDateString('pt-BR')}`

    const publicacao = await prisma.publicacaoOficial.create({
      data: {
        proposicaoId: proposicao.id,
        tipo: tipo as any,
        numero,
        data: new Date(),
        conteudo,
        status: 'PUBLICADO',
      },
    })

    await prisma.proposicao.update({
      where: { id: proposicao.id },
      data: { status: 'PUBLICADO' },
    })

    return reply.status(201).send(publicacao)
  })

  // ── PORTAL PÚBLICO ──────────────────────────────────────────────
  app.get('/portal', async (req: FastifyRequest<{
    Querystring: { busca?: string; tipo?: string; page?: string }
  }>, reply) => {
    const page = parseInt(req.query.page || '1')
    const pageSize = 20
    const busca = req.query.busca

    const [total, publicacoes] = await Promise.all([
      prisma.publicacaoOficial.count({
        where: {
          status: 'PUBLICADO',
          proposicao: {
            ...(busca ? {
              OR: [
                { numero: { contains: busca, mode: 'insensitive' } },
                { ementa: { contains: busca, mode: 'insensitive' } },
              ],
            } : {}),
          },
        },
      }),
      prisma.publicacaoOficial.findMany({
        where: {
          status: 'PUBLICADO',
          proposicao: {
            ...(busca ? {
              OR: [
                { numero: { contains: busca, mode: 'insensitive' } },
                { ementa: { contains: busca, mode: 'insensitive' } },
              ],
            } : {}),
          },
        },
        include: {
          proposicao: {
            select: { numero: true, ementa: true, tipoMateria: { select: { nome: true, sigla: true } } },
          },
        },
        orderBy: { data: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return { data: publicacoes, meta: { total, page, pageSize } }
  })

  // ── HISTÓRICO DE PUBLICAÇÕES ────────────────────────────────────
  app.get('/:proposicaoId/historico', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string } }>, reply) => {
    return prisma.publicacaoOficial.findMany({
      where: { proposicaoId: req.params.proposicaoId },
      orderBy: { data: 'desc' },
    })
  })
}
