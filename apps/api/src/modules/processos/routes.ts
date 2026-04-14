import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { camundaService } from './camunda.service'

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
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{
    Body: { decisionKey: string; variaveis: Record<string, unknown> }
  }>, reply) => {
    const { decisionKey, variaveis } = req.body as {
      decisionKey: string
      variaveis: Record<string, unknown>
    }

    const camundaVars: Record<string, { value: unknown; type: string }> = {}
    for (const [key, val] of Object.entries(variaveis)) {
      camundaVars[key] = { value: val, type: typeof val === 'boolean' ? 'Boolean' : 'String' }
    }

    const resultado = await camundaService.evaluateDecision(decisionKey, camundaVars as any)
    return { resultado }
  })
}
