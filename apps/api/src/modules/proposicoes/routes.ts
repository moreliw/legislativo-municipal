import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { PrismaClient, StatusProposicao, Prisma } from '@prisma/client'
import { TramitacaoService } from '../tramitacao/tramitacao.service'
import { CamundaService } from '../processos/camunda.service'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { numeracaoService } from '../admin/numeracao.service'

const prisma = new PrismaClient()

const createProposicaoSchema = z.object({
  tipoMateriaId: z.string().cuid(),
  ementa: z.string().min(20).max(2000),
  textoCompleto: z.string().optional(),
  origem: z.enum(['VEREADOR', 'MESA_DIRETORA', 'COMISSAO', 'PREFEITURA', 'POPULAR', 'EXTERNA']),
  regime: z.enum(['ORDINARIO', 'URGENTE', 'URGENCIA_ESPECIAL', 'SUMARIO']).default('ORDINARIO'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  autorExterno: z.string().optional(),
  palavrasChave: z.array(z.string()).optional(),
  assunto: z.string().optional(),
  observacoes: z.string().optional(),
})

const listProposicaoSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(StatusProposicao).optional(),
  tipoMateriaId: z.string().optional(),
  autorId: z.string().optional(),
  orgaoDestinoId: z.string().optional(),
  busca: z.string().optional(),
  de: z.string().datetime().optional(),
  ate: z.string().datetime().optional(),
  orderBy: z.enum(['criadoEm', 'atualizadoEm', 'numero']).default('criadoEm'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export async function proposicoesRoutes(app: FastifyInstance) {
  // ── LISTAR ──────────────────────────────────────────────────────
  app.get('/', {
    preHandler: [requireAuth],
    schema: { querystring: listProposicaoSchema },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = listProposicaoSchema.parse(req.query)

    const where: Prisma.ProposicaoWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tipoMateriaId ? { tipoMateriaId: query.tipoMateriaId } : {}),
      ...(query.autorId ? { autorId: query.autorId } : {}),
      ...(query.orgaoDestinoId ? { orgaoDestinoId: query.orgaoDestinoId } : {}),
      ...(query.busca
        ? {
            OR: [
              { numero: { contains: query.busca, mode: 'insensitive' } },
              { ementa: { contains: query.busca, mode: 'insensitive' } },
              { assunto: { contains: query.busca, mode: 'insensitive' } },
              { palavrasChave: { has: query.busca } },
            ],
          }
        : {}),
      ...(query.de || query.ate
        ? {
            criadoEm: {
              ...(query.de ? { gte: new Date(query.de) } : {}),
              ...(query.ate ? { lte: new Date(query.ate) } : {}),
            },
          }
        : {}),
    }

    const [total, items] = await Promise.all([
      prisma.proposicao.count({ where }),
      prisma.proposicao.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.orderBy]: query.order },
        include: {
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true, cargo: true } },
          orgaoDestino: { select: { nome: true, sigla: true } },
          _count: {
            select: { tramitacoes: true, documentos: true },
          },
        },
      }),
    ])

    return {
      data: items,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  })

  // ── DETALHE ──────────────────────────────────────────────────────
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: req.params.id },
      include: {
        tipoMateria: true,
        autor: { select: { id: true, nome: true, cargo: true, avatar: true } },
        orgaoDestino: true,
        documentos: {
          include: { versoes: true },
          orderBy: { criadoEm: 'desc' },
        },
        tramitacoes: {
          orderBy: { sequencia: 'asc' },
          include: {
            usuario: { select: { id: true, nome: true, cargo: true, avatar: true } },
            orgaoOrigem: { select: { id: true, nome: true, sigla: true } },
            documentosGerados: {
              include: { documento: { select: { id: true, nome: true, tipo: true } } },
            },
          },
        },
        instanciaProcesso: {
          include: {
            tarefas: {
              where: { status: 'PENDENTE' },
              orderBy: { criadoEm: 'desc' },
            },
          },
        },
        pautas: {
          include: { sessao: { select: { id: true, numero: true, data: true, tipo: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 5,
        },
        publicacoes: { orderBy: { criadoEm: 'desc' } },
      },
    })

    if (!proposicao) return reply.status(404).send({ error: 'Proposição não encontrada' })

    // Auditoria de leitura
    await req.auditoria?.registrar({
      entidade: 'Proposicao',
      entidadeId: proposicao.id,
      acao: 'LER',
    })

    return proposicao
  })

  // ── CRIAR ─────────────────────────────────────────────────────────
  app.post('/', {
    preHandler: [requireAuth, requirePermission('proposicoes:criar')],
  }, async (req: FastifyRequest, reply) => {
    const body = createProposicaoSchema.parse(req.body)
    const usuarioId = req.user.id
    const casaId = req.user.casaId

    const tipoMateria = await prisma.tipoMateria.findUnique({
      where: { id: body.tipoMateriaId },
    })
    if (!tipoMateria) return reply.status(400).send({ error: 'Tipo de matéria não encontrado' })

    const numero = await numeracaoService.gerarNumero(casaId, tipoMateria.prefixoNumero)

    const proposicao = await prisma.proposicao.create({
      data: {
        casaId,
        numero,
        ano: new Date().getFullYear(),
        tipoMateriaId: body.tipoMateriaId,
        autorId: usuarioId,
        autorExterno: body.autorExterno,
        ementa: body.ementa,
        textoCompleto: body.textoCompleto,
        origem: body.origem,
        regime: body.regime,
        prioridade: body.prioridade,
        palavrasChave: body.palavrasChave || [],
        assunto: body.assunto,
        observacoes: body.observacoes,
        status: 'RASCUNHO',
      },
    })

    return reply.status(201).send(proposicao)
  })

  // ── PROTOCOLAR ────────────────────────────────────────────────────
  app.post('/:id/protocolar', {
    preHandler: [requireAuth, requirePermission('proposicoes:protocolar')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService,
    )

    const evento = await tramitacaoSvc.registrarEvento({
      proposicaoId: req.params.id,
      tipo: 'PROTOCOLO',
      descricao: 'Proposição protocolada e recebida pelo setor de protocolo',
      usuarioId: req.user.id,
      novoStatus: 'PROTOCOLADO',
    }, req.user.id)

    // Iniciar processo no Camunda
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: req.params.id },
      include: { tipoMateria: true },
    })

    if (proposicao) {
      try {
        const instance = await req.server.camundaService.startProcess({
          processDefinitionKey: 'tramitacao_proposicao_basica',
          businessKey: proposicao.numero,
          variables: {
            proposicaoId: { value: proposicao.id, type: 'String' },
            tipoMateria: { value: proposicao.tipoMateria.sigla, type: 'String' },
            origem: { value: proposicao.origem, type: 'String' },
            regime: { value: proposicao.regime, type: 'String' },
          },
        })

        await prisma.instanciaProcesso.create({
          data: {
            proposicaoId: proposicao.id,
            fluxoProcessoId: 'default', // referência ao fluxo ativo
            camundaInstanceId: instance.id,
            camundaStatus: 'ACTIVE',
            etapaAtual: 'task_analise_inicial',
          },
        })
      } catch (err) {
        req.log.error({ err }, 'Falha ao iniciar processo no Camunda')
      }
    }

    return reply.status(201).send(evento)
  })

  // ── ENCAMINHAR ────────────────────────────────────────────────────
  app.post('/:id/encaminhar', {
    preHandler: [requireAuth, requirePermission('tramitacao:encaminhar')],
  }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { orgaoDestinoId: string; observacao: string } }>,
    reply,
  ) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService,
    )
    const { orgaoDestinoId, observacao } = req.body as { orgaoDestinoId: string; observacao: string }
    const evento = await tramitacaoSvc.encaminhar(req.params.id, orgaoDestinoId, observacao, req.user.id)
    return reply.status(201).send(evento)
  })

  // ── DEVOLVER ──────────────────────────────────────────────────────
  app.post('/:id/devolver', {
    preHandler: [requireAuth, requirePermission('tramitacao:devolver')],
  }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { motivo: string } }>,
    reply,
  ) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService,
    )
    const { motivo } = req.body as { motivo: string }
    const evento = await tramitacaoSvc.devolver(req.params.id, motivo, req.user.id)
    return reply.status(201).send(evento)
  })

  // ── HISTÓRICO ─────────────────────────────────────────────────────
  app.get('/:id/historico', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService,
    )
    const historico = await tramitacaoSvc.buscarHistorico({ proposicaoId: req.params.id })
    return historico
  })

  // ── ARQUIVAR ──────────────────────────────────────────────────────
  app.post('/:id/arquivar', {
    preHandler: [requireAuth, requirePermission('tramitacao:arquivar')],
  }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { motivo: string } }>,
    reply,
  ) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService,
    )
    const { motivo } = req.body as { motivo: string }
    const evento = await tramitacaoSvc.arquivar(req.params.id, motivo, req.user.id)
    return reply.status(201).send(evento)
  })
}
