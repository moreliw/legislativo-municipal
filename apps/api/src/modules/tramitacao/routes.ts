import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { TramitacaoService } from './tramitacao.service'
import { camundaService } from '../processos/camunda.service'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { auditoriaService } from '../../plugins/auditoria'

const prisma = new PrismaClient()

const registrarEventoSchema = z.object({
  tipo: z.enum([
    'DESPACHO', 'ENCAMINHAMENTO', 'DEVOLUCAO', 'SUSPENSAO',
    'REATIVACAO', 'ANEXACAO', 'RETIFICACAO', 'COMPLEMENTACAO',
    'PARECER_JURIDICO', 'PARECER_COMISSAO',
  ]),
  descricao: z.string().min(5).max(500),
  observacao: z.string().max(2000).optional(),
  orgaoDestinoId: z.string().optional(),
  novoStatus: z.string().optional(),
  dadosAdicionais: z.record(z.unknown()).optional(),
})

export async function tramitacaoRoutes(app: FastifyInstance) {
  const getSvc = () =>
    new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService)

  // ── HISTÓRICO ──────────────────────────────────────────────────
  app.get('/:proposicaoId/historico', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Params: { proposicaoId: string }
    Querystring: { tipo?: string; de?: string; ate?: string }
  }>, reply) => {
    const { tipo, de, ate } = req.query
    const svc = getSvc()

    const historico = await svc.buscarHistorico({
      proposicaoId: req.params.proposicaoId,
      tipo: tipo as any,
      de: de ? new Date(de) : undefined,
      ate: ate ? new Date(ate) : undefined,
    })

    return historico
  })

  // ── REGISTRAR EVENTO MANUAL ──────────────────────────────────────
  app.post('/:proposicaoId/evento', {
    preHandler: [requireAuth, requirePermission('tramitacao:registrar')],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string } }>, reply) => {
    const body = registrarEventoSchema.parse(req.body)
    const svc = getSvc()

    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: body.tipo as any,
      descricao: body.descricao,
      usuarioId: req.user.id,
      orgaoDestinoId: body.orgaoDestinoId,
      observacao: body.observacao,
      novoStatus: body.novoStatus as any,
      dadosAdicionais: body.dadosAdicionais,
    }, req.user.id)

    return reply.status(201).send(evento)
  })

  // ── DESPACHAR ────────────────────────────────────────────────────
  app.post('/:proposicaoId/despachar', {
    preHandler: [requireAuth, requirePermission('tramitacao:despachar')],
  }, async (req: FastifyRequest<{
    Params: { proposicaoId: string }
    Body: { texto: string; orgaoDestinoId?: string }
  }>, reply) => {
    const { texto, orgaoDestinoId } = req.body as { texto: string; orgaoDestinoId?: string }
    const svc = getSvc()

    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: 'DESPACHO',
      descricao: `Despacho emitido`,
      usuarioId: req.user.id,
      orgaoDestinoId,
      observacao: texto,
      novoStatus: orgaoDestinoId ? 'EM_ANALISE' : undefined,
    }, req.user.id)

    return reply.status(201).send(evento)
  })

  // ── REATIVAR (sair da suspensão) ─────────────────────────────────
  app.post('/:proposicaoId/reativar', {
    preHandler: [requireAuth, requirePermission('tramitacao:reativar')],
  }, async (req: FastifyRequest<{
    Params: { proposicaoId: string }
    Body: { motivo: string }
  }>, reply) => {
    const { motivo } = req.body as { motivo: string }
    const svc = getSvc()

    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: 'REATIVACAO',
      descricao: 'Tramitação reativada',
      usuarioId: req.user.id,
      observacao: motivo,
      novoStatus: 'EM_ANALISE',
    }, req.user.id)

    return reply.status(201).send(evento)
  })

  // ── COMPLETAR TAREFA CAMUNDA ─────────────────────────────────────
  app.post('/:proposicaoId/completar-tarefa', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Params: { proposicaoId: string }
    Body: { taskId: string; variaveis: Record<string, unknown> }
  }>, reply) => {
    const { taskId, variaveis } = req.body as {
      taskId: string
      variaveis: Record<string, unknown>
    }

    // Converter variáveis para o formato Camunda
    const camundaVars: Record<string, { value: unknown; type: string }> = {}
    for (const [key, val] of Object.entries(variaveis)) {
      camundaVars[key] = {
        value: val,
        type:
          typeof val === 'boolean' ? 'Boolean'
          : typeof val === 'number' ? 'Long'
          : 'String',
      }
    }

    await camundaService.completeTask(taskId, camundaVars as any)

    // Atualizar tarefa no banco
    await prisma.tarefaProcesso.updateMany({
      where: { camundaTaskId: taskId },
      data: { status: 'CONCLUIDA', concluida: true, concluidaEm: new Date() },
    })

    return { ok: true }
  })

  // ── TAREFAS PENDENTES DA PROPOSIÇÃO ──────────────────────────────
  app.get('/:proposicaoId/tarefas', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string } }>, reply) => {
    const tarefas = await prisma.tarefaProcesso.findMany({
      where: {
        instancia: { proposicaoId: req.params.proposicaoId },
        status: 'PENDENTE',
      },
      orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
    })

    return tarefas
  })

  // ── STATUS DO PROCESSO CAMUNDA ───────────────────────────────────
  app.get('/:proposicaoId/processo', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string } }>, reply) => {
    const instancia = await prisma.instanciaProcesso.findUnique({
      where: { proposicaoId: req.params.proposicaoId },
      include: {
        fluxoProcesso: { select: { nome: true, camundaKey: true } },
        tarefas: { where: { status: 'PENDENTE' } },
      },
    })

    if (!instancia) return reply.status(404).send({ error: 'Processo não iniciado' })

    // Buscar histórico de atividades no Camunda
    let atividadesCamunda = []
    if (instancia.camundaInstanceId) {
      try {
        atividadesCamunda = await camundaService.getActivityHistory(instancia.camundaInstanceId)
      } catch {
        // Camunda indisponível — não bloquear
      }
    }

    return { instancia, atividadesCamunda }
  })
}
