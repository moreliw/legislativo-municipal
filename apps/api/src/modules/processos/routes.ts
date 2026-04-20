import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { camundaService } from './camunda.service'
import { TramitacaoService } from '../tramitacao/tramitacao.service'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { auditoriaService } from '../../plugins/auditoria'

const prisma = new PrismaClient()

export async function processosRoutes(app: FastifyInstance) {

  // ── DEFINIÇÕES DE PROCESSO ────────────────────────────────────────
  app.get('/definicoes', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest, reply) => {
    try {
      return await camundaService.listProcessDefinitions()
    } catch {
      return reply.status(503).send({ error: 'Camunda indisponível' })
    }
  })

  // ── INSTÂNCIAS ATIVAS ─────────────────────────────────────────────
  app.get('/instancias', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest<{
    Querystring: { status?: string; fluxoId?: string; page?: string }
  }>, reply) => {
    const page = parseInt(req.query.page || '1')
    const pageSize = 20

    const where: any = {}
    if (req.query.fluxoId) where.fluxoProcessoId = req.query.fluxoId
    if (req.query.status) where.camundaStatus = req.query.status

    const [total, instancias] = await Promise.all([
      prisma.instanciaProcesso.count({ where }),
      prisma.instanciaProcesso.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
        include: {
          proposicao: { select: { id: true, numero: true, ementa: true, status: true } },
          fluxoProcesso: { select: { nome: true } },
          tarefas: { where: { status: 'PENDENTE' }, select: { id: true, nome: true, prazo: true } },
        },
      }),
    ])

    return { data: instancias, meta: { total, page, pageSize } }
  })

  // ── DETALHE DA INSTÂNCIA ──────────────────────────────────────────
  app.get('/instancias/:id', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const instancia = await prisma.instanciaProcesso.findUnique({
      where: { id: req.params.id },
      include: {
        proposicao: true,
        fluxoProcesso: true,
        tarefas: { orderBy: { criadoEm: 'desc' } },
      },
    })

    if (!instancia) return reply.status(404).send({ error: 'Instância não encontrada' })

    // Enriquecer com dados do Camunda se disponível
    let camundaData = null
    if (instancia.camundaInstanceId) {
      try {
        const [instance, historico] = await Promise.all([
          camundaService.getProcessInstance(instancia.camundaInstanceId),
          camundaService.getActivityHistory(instancia.camundaInstanceId),
        ])
        camundaData = { instance, historico }
      } catch {
        // Camunda indisponível
      }
    }

    return { instancia, camundaData }
  })

  // ── CANCELAR INSTÂNCIA ────────────────────────────────────────────
  app.delete('/instancias/:id', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest<{
    Params: { id: string }
    Body: { motivo: string }
  }>, reply) => {
    const { motivo } = req.body as { motivo: string }

    const instancia = await prisma.instanciaProcesso.findUnique({
      where: { id: req.params.id },
    })
    if (!instancia) return reply.status(404).send({ error: 'Instância não encontrada' })

    if (instancia.camundaInstanceId) {
      try {
        await camundaService.cancelProcess(instancia.camundaInstanceId, motivo)
      } catch {
        req.log.warn('Falha ao cancelar no Camunda, prosseguindo com cancelamento local')
      }
    }

    await prisma.instanciaProcesso.update({
      where: { id: req.params.id },
      data: { camundaStatus: 'CANCELLED', atualizadoEm: new Date() },
    })

    return { ok: true }
  })

  // ── TAREFAS DISPONÍVEIS PARA O USUÁRIO ────────────────────────────
  app.get('/tarefas/minhas', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest, reply) => {
    // Buscar tarefas dos órgãos do usuário
    const tarefas = await prisma.tarefaProcesso.findMany({
      where: {
        status: 'PENDENTE',
        OR: [
          { atribuidoAId: req.user.id },
          { atribuidoAOrgaoId: { in: req.user.orgaos } },
        ],
      },
      include: {
        instancia: {
          include: {
            proposicao: {
              select: {
                id: true, numero: true, ementa: true, status: true,
                tipoMateria: { select: { nome: true, sigla: true } },
              },
            },
          },
        },
      },
      orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
    })

    return tarefas
  })

  // ── COMPLETAR TAREFA ──────────────────────────────────────────────
  app.post('/tarefas/:taskId/completar', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Params: { taskId: string }
    Body: {
      variaveis?: Record<string, unknown>
      tipoEvento?: string
      descricao?: string
      observacao?: string
      novoStatus?: string
    }
  }>, reply) => {
    const { taskId } = req.params
    const { variaveis = {}, tipoEvento, descricao, observacao, novoStatus } = req.body as {
      variaveis?: Record<string, unknown>
      tipoEvento?: string
      descricao?: string
      observacao?: string
      novoStatus?: string
    }

    const tarefa = await prisma.tarefaProcesso.findUnique({
      where: { camundaTaskId: taskId },
      include: {
        instancia: { include: { proposicao: true } },
      },
    })
    if (!tarefa) return reply.status(404).send({ error: 'Tarefa não encontrada' })

    // Verificar se o usuário tem permissão para esta tarefa
    if (tarefa.atribuidoAId && tarefa.atribuidoAId !== req.user.id) {
      const userOrgaos: string[] = (req.user as any).orgaos ?? []
      if (!tarefa.atribuidoAOrgaoId || !userOrgaos.includes(tarefa.atribuidoAOrgaoId)) {
        return reply.status(403).send({ error: 'Sem permissão para completar esta tarefa' })
      }
    }

    // Formatar variáveis para o Camunda
    const camundaVars: Record<string, { value: unknown; type: 'String' | 'Boolean' | 'Integer' | 'Long' | 'Double' | 'Json' }> = {}
    for (const [key, val] of Object.entries(variaveis)) {
      const type = typeof val === 'boolean' ? 'Boolean' : typeof val === 'number' ? 'Long' : 'String'
      camundaVars[key] = { value: val, type }
    }

    // Completar no Camunda
    try {
      await camundaService.completeTask(taskId, camundaVars)
    } catch (err) {
      req.log.error({ err, taskId }, 'Falha ao completar tarefa no Camunda')
      return reply.status(502).send({ error: 'Falha ao comunicar com Camunda' })
    }

    // Atualizar TarefaProcesso no banco
    await prisma.tarefaProcesso.update({
      where: { camundaTaskId: taskId },
      data: {
        status: 'CONCLUIDA',
        concluida: true,
        concluidaEm: new Date(),
        atualizadoEm: new Date(),
        variaveis: variaveis as any,
      },
    })

    // Registrar evento de tramitação se houver proposição vinculada
    if (tarefa.instancia?.proposicao) {
      const proposicaoId = tarefa.instancia.proposicao.id
      try {
        const tramitacaoSvc = new TramitacaoService(
          camundaService,
          new NotificacaoService(),
          auditoriaService,
        )
        await tramitacaoSvc.registrarEvento({
          proposicaoId,
          tipo: (tipoEvento as any) || 'DESPACHO',
          descricao: descricao || `Tarefa "${tarefa.nome}" concluída`,
          usuarioId: req.user.id,
          observacao,
          camundaTaskId: taskId,
          ...(novoStatus ? { novoStatus: novoStatus as any } : {}),
          dadosAdicionais: { variaveis, taskId },
        }, req.user.id)
      } catch (err) {
        req.log.warn({ err }, 'Falha ao registrar evento de tramitação')
      }
    }

    return { ok: true }
  })

  // ── ASSUMIR TAREFA ────────────────────────────────────────────────
  app.post('/tarefas/:taskId/assumir', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { taskId: string } }>, reply) => {
    const tarefa = await prisma.tarefaProcesso.findUnique({
      where: { camundaTaskId: req.params.taskId },
    })
    if (!tarefa) return reply.status(404).send({ error: 'Tarefa não encontrada' })

    await camundaService.assignTask(req.params.taskId, req.user.id)

    await prisma.tarefaProcesso.update({
      where: { camundaTaskId: req.params.taskId },
      data: { atribuidoAId: req.user.id, status: 'EM_ANDAMENTO' },
    })

    return { ok: true }
  })

  // ── DEPLOY DE FLUXO BPMN ─────────────────────────────────────────
  app.post('/deploy', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest<{
    Body: { fluxoId: string }
  }>, reply) => {
    const { fluxoId } = req.body as { fluxoId: string }

    const fluxo = await prisma.fluxoProcesso.findUnique({ where: { id: fluxoId } })
    if (!fluxo) return reply.status(404).send({ error: 'Fluxo não encontrado' })

    const deploy = await camundaService.deployProcess(fluxo.nome, fluxo.bpmnXml)

    await prisma.fluxoProcesso.update({
      where: { id: fluxoId },
      data: {
        camundaKey: deploy.id,
        status: 'ATIVO',
        publicadoEm: new Date(),
      },
    })

    return { ok: true, deploy }
  })

  // ── AVALIAR REGRA DMN ─────────────────────────────────────────────
  app.post('/avaliar-decisao', {
    preHandler: [requireAuth, requirePermission('processos:ler')],
  }, async (req: FastifyRequest<{
    Body: { decisionKey: string; variaveis: Record<string, unknown> }
  }>, reply) => {
    const { decisionKey, variaveis } = req.body as {
      decisionKey: string
      variaveis: Record<string, unknown>
    }

    // Allowlist — apenas chaves alfanuméricas/hífens são válidas
    if (!decisionKey || !/^[a-zA-Z0-9_-]+$/.test(decisionKey)) {
      return reply.status(400).send({ error: 'decisionKey inválida' })
    }

    const camundaVars: Record<string, { value: unknown; type: string }> = {}
    for (const [key, val] of Object.entries(variaveis)) {
      camundaVars[key] = { value: val, type: typeof val === 'boolean' ? 'Boolean' : 'String' }
    }

    const resultado = await camundaService.evaluateDecision(decisionKey, camundaVars as any)
    return { resultado }
  })
}
