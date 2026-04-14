import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../plugins/auth'
import { gerarDespacho, gerarPautaSessao, gerarRelatorioProposicoes } from '../../lib/pdf.service'

const prisma = new PrismaClient()

export async function pdfRoutes(app: FastifyInstance) {

  // ── Gerar PDF de despacho ────────────────────────────────────────
  app.get('/despacho/:eventoId', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { eventoId: string } }>, reply) => {
    const evento = await prisma.tramitacaoEvento.findUnique({
      where: { id: req.params.eventoId },
      include: {
        proposicao: { include: { tipoMateria: true } },
        usuario: { select: { nome: true, cargo: true } },
      },
    })

    if (!evento) return reply.status(404).send({ error: 'Evento não encontrado' })

    const casa = await prisma.casaLegislativa.findUnique({
      where: { id: req.user.casaId },
    })

    const pdfBuffer = await gerarDespacho({
      proposicao: {
        numero: evento.proposicao.numero,
        ementa: evento.proposicao.ementa,
        tipoMateria: { nome: evento.proposicao.tipoMateria.nome, sigla: evento.proposicao.tipoMateria.sigla },
      },
      texto: evento.observacao ?? evento.descricao,
      autorNome: evento.usuario?.nome ?? 'Secretaria',
      autorCargo: evento.usuario?.cargo ?? '',
      nomeCamara: casa?.nome ?? 'Câmara Municipal',
      municipio: casa?.municipio ?? '',
      data: new Date(evento.criadoEm),
    })

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="despacho-${evento.proposicao.numero.replace('/', '-')}.pdf"`)
    return reply.send(pdfBuffer)
  })

  // ── Gerar pauta de sessão ─────────────────────────────────────────
  app.get('/pauta/:sessaoId', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { sessaoId: string } }>, reply) => {
    const sessao = await prisma.sessaoLegislativa.findUnique({
      where: { id: req.params.sessaoId },
      include: {
        pauta: {
          orderBy: { ordem: 'asc' },
          include: {
            proposicao: {
              include: {
                autor: { select: { nome: true } },
              },
            },
          },
        },
        casa: { select: { nome: true, municipio: true } },
      },
    })

    if (!sessao) return reply.status(404).send({ error: 'Sessão não encontrada' })

    const pdfBuffer = await gerarPautaSessao({
      sessao: {
        numero: sessao.numero,
        tipo: sessao.tipo as any,
        data: sessao.data.toISOString(),
        horaInicio: sessao.horaInicio ?? undefined,
        local: sessao.local ?? undefined,
      },
      itens: sessao.pauta.map(item => ({
        ordem: item.ordem,
        tipo: item.tipo,
        proposicao: {
          numero: item.proposicao.numero,
          ementa: item.proposicao.ementa,
          autor: item.proposicao.autor,
        },
      })),
      nomeCamara: sessao.casa?.nome ?? 'Câmara Municipal',
      municipio: sessao.casa?.municipio ?? '',
    })

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="pauta-sessao-${sessao.numero.replace('/', '-')}.pdf"`)
    return reply.send(pdfBuffer)
  })

  // ── Gerar relatório de proposições ────────────────────────────────
  app.get('/relatorio/proposicoes', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Querystring: { status?: string; tipoMateriaId?: string; de?: string; ate?: string }
  }>, reply) => {
    const where: any = { casaId: req.user.casaId }
    if (req.query.status) where.status = req.query.status
    if (req.query.tipoMateriaId) where.tipoMateriaId = req.query.tipoMateriaId
    if (req.query.de || req.query.ate) {
      where.criadoEm = {
        ...(req.query.de ? { gte: new Date(req.query.de) } : {}),
        ...(req.query.ate ? { lte: new Date(req.query.ate) } : {}),
      }
    }

    const [proposicoes, casa] = await Promise.all([
      prisma.proposicao.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        include: {
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true } },
        },
        take: 500,
      }),
      prisma.casaLegislativa.findUnique({ where: { id: req.user.casaId } }),
    ])

    const pdfBuffer = await gerarRelatorioProposicoes({
      proposicoes: proposicoes.map(p => ({
        numero: p.numero,
        ementa: p.ementa,
        status: p.status,
        criadoEm: p.criadoEm.toISOString(),
        tipoMateria: p.tipoMateria,
        autor: p.autor,
      })),
      filtros: req.query as Record<string, string>,
      nomeCamara: casa?.nome ?? 'Câmara Municipal',
      municipio: casa?.municipio ?? '',
    })

    const dataStr = new Date().toISOString().slice(0, 10)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="relatorio-proposicoes-${dataStr}.pdf"`)
    return reply.send(pdfBuffer)
  })
}
