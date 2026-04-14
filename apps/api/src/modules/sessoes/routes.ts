import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { TramitacaoService } from '../tramitacao/tramitacao.service'
import { camundaService } from '../processos/camunda.service'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { auditoriaService } from '../../plugins/auditoria'

const prisma = new PrismaClient()

const criarSessaoSchema = z.object({
  numero: z.string(),
  tipo: z.enum(['ORDINARIA', 'EXTRAORDINARIA', 'ESPECIAL', 'SOLENE', 'SECRETA']),
  data: z.string().datetime(),
  horaInicio: z.string().optional(),
  local: z.string().optional(),
  quorumMinimo: z.number().int().min(1).optional(),
  observacoes: z.string().optional(),
})

const registrarVotoSchema = z.object({
  proposicaoId: z.string().cuid(),
  votos: z.array(z.object({
    vereadorId: z.string().cuid(),
    voto: z.enum(['SIM', 'NAO', 'ABSTENCAO', 'AUSENTE']),
    justificativa: z.string().optional(),
  })),
})

export async function sessoesRoutes(app: FastifyInstance) {

  // ── LISTAR SESSÕES ────────────────────────────────────────────────
  app.get('/', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Querystring: { status?: string; tipo?: string; de?: string; ate?: string } }>, reply) => {
      const { status, tipo, de, ate } = req.query

      const sessoes = await prisma.sessaoLegislativa.findMany({
        where: {
          casaId: req.user.casaId,
          ...(status ? { status: status as any } : {}),
          ...(tipo ? { tipo: tipo as any } : {}),
          ...(de || ate ? { data: { gte: de ? new Date(de) : undefined, lte: ate ? new Date(ate) : undefined } } : {}),
        },
        orderBy: { data: 'desc' },
        include: {
          _count: { select: { pauta: true, presencas: true, votos: true } },
        },
      })
      return sessoes
    },
  )

  // ── CRIAR SESSÃO ──────────────────────────────────────────────────
  app.post('/', {
    preHandler: [requireAuth, requirePermission('sessoes:criar')],
  }, async (req: FastifyRequest, reply) => {
    const body = criarSessaoSchema.parse(req.body)

    const sessao = await prisma.sessaoLegislativa.create({
      data: {
        casaId: req.user.casaId,
        numero: body.numero,
        tipo: body.tipo,
        data: new Date(body.data),
        horaInicio: body.horaInicio,
        local: body.local,
        quorumMinimo: body.quorumMinimo,
        observacoes: body.observacoes,
        status: 'AGENDADA',
      },
    })

    return reply.status(201).send(sessao)
  })

  // ── DETALHE DA SESSÃO ─────────────────────────────────────────────
  app.get('/:id', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const sessao = await prisma.sessaoLegislativa.findUnique({
        where: { id: req.params.id },
        include: {
          pauta: {
            orderBy: { ordem: 'asc' },
            include: {
              proposicao: {
                include: {
                  tipoMateria: { select: { nome: true, sigla: true } },
                  autor: { select: { nome: true } },
                },
              },
            },
          },
          presencas: true,
          votos: {
            include: {
              proposicao: { select: { numero: true, ementa: true } },
            },
          },
        },
      })

      if (!sessao) return reply.status(404).send({ error: 'Sessão não encontrada' })
      return sessao
    },
  )

  // ── ADICIONAR ITEM À PAUTA ────────────────────────────────────────
  app.post('/:id/pauta', {
    preHandler: [requireAuth, requirePermission('sessoes:pauta')],
  }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { proposicaoId: string; tipo: string } }>,
    reply,
  ) => {
    const { proposicaoId, tipo } = req.body as { proposicaoId: string; tipo: string }

    // Verificar se proposição está em estado adequado para pauta
    const proposicao = await prisma.proposicao.findUnique({ where: { id: proposicaoId } })
    if (!proposicao) return reply.status(404).send({ error: 'Proposição não encontrada' })

    const statusPermitidosPauta = ['EM_COMISSAO', 'EM_ANALISE', 'EM_PAUTA']
    if (!statusPermitidosPauta.includes(proposicao.status)) {
      return reply.status(422).send({
        error: 'Status inválido',
        message: `Proposição com status ${proposicao.status} não pode ser incluída em pauta`,
      })
    }

    // Calcular próxima ordem
    const maxOrdem = await prisma.itemPauta.aggregate({
      where: { sessaoId: req.params.id },
      _max: { ordem: true },
    })
    const ordem = (maxOrdem._max.ordem ?? 0) + 1

    const item = await prisma.itemPauta.create({
      data: { sessaoId: req.params.id, proposicaoId, tipo: tipo as any, ordem },
    })

    // Atualizar status da proposição
    await prisma.proposicao.update({
      where: { id: proposicaoId },
      data: { status: 'EM_PAUTA' },
    })

    const tramitacaoSvc = new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService)
    await tramitacaoSvc.registrarEvento({
      proposicaoId,
      tipo: 'INCLUSAO_PAUTA',
      descricao: `Incluído na pauta da sessão ${req.params.id}`,
      usuarioId: req.user.id,
      novoStatus: 'EM_PAUTA',
      dadosAdicionais: { sessaoId: req.params.id, ordem, tipoPauta: tipo },
    }, req.user.id)

    return reply.status(201).send(item)
  })

  // ── ABRIR SESSÃO ──────────────────────────────────────────────────
  app.post('/:id/abrir', {
    preHandler: [requireAuth, requirePermission('sessoes:conduzir')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const sessao = await prisma.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { status: 'ABERTA' },
    })
    return sessao
  })

  // ── REGISTRAR PRESENÇA ────────────────────────────────────────────
  app.post('/:id/presencas', {
    preHandler: [requireAuth, requirePermission('sessoes:conduzir')],
  }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { presencas: Array<{ vereadorId: string; presente: boolean; justificativa?: string }> } }>,
    reply,
  ) => {
    const { presencas } = req.body as { presencas: Array<{ vereadorId: string; presente: boolean; justificativa?: string }> }

    // Upsert todas as presenças
    const ops = presencas.map(p =>
      prisma.presencaSessao.upsert({
        where: { sessaoId_vereadorId: { sessaoId: req.params.id, vereadorId: p.vereadorId } },
        create: { sessaoId: req.params.id, vereadorId: p.vereadorId, presente: p.presente, justificativa: p.justificativa },
        update: { presente: p.presente, justificativa: p.justificativa },
      }),
    )

    const resultado = await prisma.$transaction(ops)

    // Atualizar contagem de presentes
    const presentes = presencas.filter(p => p.presente).length
    await prisma.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { presentes },
    })

    return { presentes, total: presencas.length, registros: resultado }
  })

  // ── REGISTRAR VOTAÇÃO ─────────────────────────────────────────────
  app.post('/:id/votar', {
    preHandler: [requireAuth, requirePermission('sessoes:votar')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const body = registrarVotoSchema.parse(req.body)

    const sessao = await prisma.sessaoLegislativa.findUnique({
      where: { id: req.params.id },
      include: { presencas: { where: { presente: true } } },
    })

    if (!sessao) return reply.status(404).send({ error: 'Sessão não encontrada' })
    if (sessao.status !== 'ABERTA') return reply.status(422).send({ error: 'Sessão não está aberta' })

    // Verificar quórum
    const presentes = sessao.presencas.length
    if (sessao.quorumMinimo && presentes < sessao.quorumMinimo) {
      return reply.status(422).send({
        error: 'Quórum insuficiente',
        message: `Presentes: ${presentes}. Mínimo: ${sessao.quorumMinimo}`,
      })
    }

    // Registrar votos (upsert para permitir retificação)
    const ops = body.votos.map(v =>
      prisma.votoRegistrado.upsert({
        where: { sessaoId_proposicaoId_vereadorId: {
          sessaoId: req.params.id,
          proposicaoId: body.proposicaoId,
          vereadorId: v.vereadorId,
        } },
        create: { sessaoId: req.params.id, proposicaoId: body.proposicaoId, vereadorId: v.vereadorId, voto: v.voto, justificativa: v.justificativa },
        update: { voto: v.voto, justificativa: v.justificativa },
      }),
    )

    const votosRegistrados = await prisma.$transaction(ops)

    // Apurar resultado
    const sim = body.votos.filter(v => v.voto === 'SIM').length
    const nao = body.votos.filter(v => v.voto === 'NAO').length
    const abstencao = body.votos.filter(v => v.voto === 'ABSTENCAO').length
    const aprovado = sim > nao

    // Atualizar status da proposição
    const tramitacaoSvc = new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService)

    await tramitacaoSvc.registrarEvento({
      proposicaoId: body.proposicaoId,
      tipo: 'VOTACAO',
      descricao: `Votação realizada na sessão ${sessao.numero}: ${aprovado ? 'APROVADO' : 'REJEITADO'} (${sim} × ${nao})`,
      usuarioId: req.user.id,
      novoStatus: aprovado ? 'APROVADO' : 'REJEITADO',
      dadosAdicionais: { sim, nao, abstencao, aprovado, sessaoId: req.params.id, presentes },
    }, req.user.id)

    // Atualizar item da pauta
    await prisma.itemPauta.updateMany({
      where: { sessaoId: req.params.id, proposicaoId: body.proposicaoId },
      data: { situacao: 'VOTADO' },
    })

    return {
      resultado: aprovado ? 'APROVADO' : 'REJEITADO',
      sim, nao, abstencao, presentes,
      votos: votosRegistrados,
    }
  })

  // ── ENCERRAR SESSÃO ───────────────────────────────────────────────
  app.post('/:id/encerrar', {
    preHandler: [requireAuth, requirePermission('sessoes:conduzir')],
  }, async (req: FastifyRequest<{ Params: { id: string }; Body: { ata?: string } }>, reply) => {
    const { ata } = req.body as { ata?: string }

    const sessao = await prisma.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { status: 'ENCERRADA', ata },
    })

    return sessao
  })

  // ── RESULTADO DA VOTAÇÃO POR PROPOSIÇÃO ───────────────────────────
  app.get('/:id/resultado/:proposicaoId', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string; proposicaoId: string } }>, reply) => {
    const votos = await prisma.votoRegistrado.findMany({
      where: { sessaoId: req.params.id, proposicaoId: req.params.proposicaoId },
    })

    const sim = votos.filter(v => v.voto === 'SIM').length
    const nao = votos.filter(v => v.voto === 'NAO').length
    const abstencao = votos.filter(v => v.voto === 'ABSTENCAO').length
    const ausente = votos.filter(v => v.voto === 'AUSENTE').length

    return { votos, resumo: { sim, nao, abstencao, ausente, total: votos.length } }
  })
}
