import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { camundaService, CamundaVariableInput } from './camunda.service'
import { TramitacaoService } from '../tramitacao/tramitacao.service'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { auditoriaService } from '../../plugins/auditoria'

const prisma = new PrismaClient()

const deploySchema = z.object({
  fluxoId: z.string().min(1),
})

const startProcessSchema = z.object({
  fluxoId: z.string().min(1),
  businessKey: z.string().min(1),
  proposicaoId: z.string().min(1).optional(),
  variaveis: z.record(z.unknown()).default({}),
})

const listInstanciasSchema = z.object({
  status: z.string().optional(),
  fluxoId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const listPendingTasksSchema = z.object({
  fluxoId: z.string().optional(),
  instanciaId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

function isLikelyBpmnXml(xml: string): boolean {
  const hasDefinitionsOpenTag = /<\s*(bpmn:)?definitions\b/i.test(xml)
  const hasDefinitionsCloseTag = /<\/\s*(bpmn:)?definitions\s*>/i.test(xml)
  const hasProcessTag = /<\s*(bpmn:)?process\b/i.test(xml)
  return hasDefinitionsOpenTag && hasDefinitionsCloseTag && hasProcessTag
}

function extractProcessDefinitionKey(xml: string): string | null {
  const regexes = [
    /<\s*bpmn:process[^>]*\sid="([^"]+)"/i,
    /<\s*process[^>]*\sid="([^"]+)"/i,
  ]
  for (const regex of regexes) {
    const match = xml.match(regex)
    if (match?.[1]) return match[1]
  }
  return null
}

function toCamundaVariables(variaveis: Record<string, unknown>): Record<string, CamundaVariableInput> {
  const normalized: Record<string, CamundaVariableInput> = {}

  for (const [key, value] of Object.entries(variaveis)) {
    const type: CamundaVariableInput['type'] =
      typeof value === 'boolean'
        ? 'Boolean'
        : typeof value === 'number'
          ? (Number.isInteger(value) ? 'Long' : 'Double')
          : value !== null && typeof value === 'object'
            ? 'Json'
            : 'String'

    normalized[key] = { value, type }
  }

  return normalized
}

function isCamundaUnavailable(err: unknown): boolean {
  const code = (err as any)?.code
  return code === 'ECONNREFUSED' || code === 'ECONNABORTED' || code === 'ERR_CANCELED'
}

export async function processosRoutes(app: FastifyInstance) {
  app.get('/camunda/diagnostico', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async () => {
    return camundaService.getEngineHealth()
  })

  app.get('/fluxos', {
    preHandler: [requireAuth],
  }, async () => {
    const [fluxos, ativas] = await Promise.all([
      prisma.fluxoProcesso.findMany({
        include: {
          tipoMateria: { select: { id: true, nome: true, sigla: true } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.instanciaProcesso.groupBy({
        by: ['fluxoProcessoId'],
        where: { camundaStatus: { in: ['ACTIVE', 'RUNNING'] } },
        _count: { _all: true },
      }),
    ])

    const activeByFluxo = new Map(ativas.map((item) => [item.fluxoProcessoId, item._count._all]))

    return fluxos.map((fluxo) => ({
      ...fluxo,
      instanciasAtivas: activeByFluxo.get(fluxo.id) ?? 0,
      deployed: Boolean(fluxo.camundaKey && fluxo.camundaVersion),
    }))
  })

  app.get('/fluxos/:id/bpmn', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const fluxo = await prisma.fluxoProcesso.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nome: true,
        bpmnXml: true,
        camundaKey: true,
        camundaVersion: true,
        status: true,
        atualizadoEm: true,
      },
    })

    if (!fluxo) return reply.status(404).send({ error: 'Fluxo não encontrado' })
    return fluxo
  })

  app.get('/definicoes', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest, reply) => {
    try {
      return await camundaService.listProcessDefinitions()
    } catch {
      return reply.status(503).send({ error: 'Camunda indisponível' })
    }
  })

  app.post('/deploy', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest<{ Body: { fluxoId: string } }>, reply) => {
    const body = deploySchema.parse(req.body)

    const fluxo = await prisma.fluxoProcesso.findUnique({ where: { id: body.fluxoId } })
    if (!fluxo) return reply.status(404).send({ error: 'Fluxo não encontrado' })

    if (!isLikelyBpmnXml(fluxo.bpmnXml)) {
      return reply.status(422).send({ error: 'BPMN XML inválido ou incompleto' })
    }

    const fallbackProcessKey = extractProcessDefinitionKey(fluxo.bpmnXml)

    try {
      const deploy = await camundaService.deployProcess(fluxo.nome, fluxo.bpmnXml)
      const processDefinitionKey = deploy.processDefinitionKey ?? fallbackProcessKey

      if (!processDefinitionKey) {
        return reply.status(502).send({
          error: 'Deploy concluído sem processDefinitionKey retornada pelo Camunda',
        })
      }

      const camundaVersion = deploy.processDefinitionVersion ?? fluxo.camundaVersion ?? 1

      const atualizado = await prisma.fluxoProcesso.update({
        where: { id: body.fluxoId },
        data: {
          camundaKey: processDefinitionKey,
          camundaVersion,
          status: 'ATIVO',
          publicadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      })

      return {
        ok: true,
        deploy,
        fluxo: {
          id: atualizado.id,
          camundaKey: atualizado.camundaKey,
          camundaVersion: atualizado.camundaVersion,
          status: atualizado.status,
          publicadoEm: atualizado.publicadoEm,
        },
      }
    } catch (err: any) {
      req.log.error({ err, fluxoId: body.fluxoId }, 'Falha ao fazer deploy no Camunda')
      if (isCamundaUnavailable(err)) {
        return reply.status(503).send({ error: 'Camunda indisponível' })
      }

      const camundaMessage = err?.response?.data?.message ?? err?.message
      return reply.status(502).send({ error: 'Falha no deploy BPMN', message: camundaMessage })
    }
  })

  const startProcessHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = startProcessSchema.parse(req.body)

    const fluxo = await prisma.fluxoProcesso.findUnique({ where: { id: body.fluxoId } })
    if (!fluxo) return reply.status(404).send({ error: 'Fluxo não encontrado' })

    const processDefinitionKey = fluxo.camundaKey || extractProcessDefinitionKey(fluxo.bpmnXml)
    if (!processDefinitionKey) {
      return reply.status(422).send({
        error: 'Fluxo sem processDefinitionKey. Faça o deploy no Camunda antes de iniciar.',
      })
    }

    const variables = toCamundaVariables(body.variaveis)

    try {
      const instance = await camundaService.startProcess({
        processDefinitionKey,
        businessKey: body.businessKey,
        variables,
      })

      let instanciaLocalId: string | null = null
      if (body.proposicaoId) {
        const existente = await prisma.instanciaProcesso.findUnique({
          where: { proposicaoId: body.proposicaoId },
          select: { id: true },
        })

        if (existente) {
          return reply.status(409).send({
            error: 'Já existe instância de processo vinculada a esta proposição',
          })
        }

        const instanciaLocal = await prisma.instanciaProcesso.create({
          data: {
            proposicaoId: body.proposicaoId,
            fluxoProcessoId: fluxo.id,
            camundaInstanceId: instance.id,
            camundaStatus: instance.ended ? 'COMPLETED' : 'ACTIVE',
            variaveis: body.variaveis,
          },
        })

        instanciaLocalId = instanciaLocal.id
      }

      return {
        ok: true,
        processDefinitionKey,
        instanceId: instance.id,
        businessKey: body.businessKey,
        instanciaLocalId,
      }
    } catch (err: any) {
      req.log.error({ err, fluxoId: body.fluxoId }, 'Falha ao iniciar instância no Camunda')
      if (isCamundaUnavailable(err)) {
        return reply.status(503).send({ error: 'Camunda indisponível' })
      }
      return reply.status(502).send({
        error: 'Falha ao iniciar processo no Camunda',
        message: err?.response?.data?.message ?? err?.message,
      })
    }
  }

  app.post('/start', {
    preHandler: [requireAuth, requirePermission('processos:criar')],
  }, startProcessHandler)

  app.post('/process/start', {
    preHandler: [requireAuth, requirePermission('processos:criar')],
  }, startProcessHandler)

  app.get('/instancias', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest, reply) => {
    const query = listInstanciasSchema.parse(req.query)

    const where: any = {}
    if (query.fluxoId) where.fluxoProcessoId = query.fluxoId
    if (query.status) where.camundaStatus = query.status

    const [total, instancias] = await Promise.all([
      prisma.instanciaProcesso.count({ where }),
      prisma.instanciaProcesso.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { criadoEm: 'desc' },
        include: {
          proposicao: { select: { id: true, numero: true, ementa: true, status: true } },
          fluxoProcesso: { select: { id: true, nome: true, camundaKey: true } },
          tarefas: {
            where: { status: 'PENDENTE' },
            select: { id: true, camundaTaskId: true, nome: true, tipo: true, prazo: true, status: true },
          },
        },
      }),
    ])

    return { data: instancias, meta: { total, page: query.page, pageSize: query.pageSize } }
  })

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

    let camundaData = null
    if (instancia.camundaInstanceId) {
      try {
        const [instance, historico] = await Promise.all([
          camundaService.getProcessInstance(instancia.camundaInstanceId),
          camundaService.getActivityHistory(instancia.camundaInstanceId),
        ])
        camundaData = { instance, historico }
      } catch {
        camundaData = null
      }
    }

    return { instancia, camundaData }
  })

  app.get('/instancias/:id/status', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const instancia = await prisma.instanciaProcesso.findUnique({
      where: { id: req.params.id },
      include: {
        tarefas: { where: { status: 'PENDENTE' }, select: { id: true, nome: true, tipo: true, prazo: true } },
      },
    })

    if (!instancia) return reply.status(404).send({ error: 'Instância não encontrada' })

    let camundaRuntimeStatus: 'ACTIVE' | 'COMPLETED' | 'UNKNOWN' = 'UNKNOWN'
    if (instancia.camundaInstanceId) {
      try {
        const runtime = await camundaService.getProcessInstance(instancia.camundaInstanceId)
        camundaRuntimeStatus = runtime.ended ? 'COMPLETED' : 'ACTIVE'
      } catch {
        camundaRuntimeStatus = 'UNKNOWN'
      }
    }

    return {
      id: instancia.id,
      camundaInstanceId: instancia.camundaInstanceId,
      camundaStatus: instancia.camundaStatus,
      runtimeStatus: camundaRuntimeStatus,
      etapaAtual: instancia.etapaAtual,
      tarefasPendentes: instancia.tarefas,
      atualizadoEm: instancia.atualizadoEm,
    }
  })

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

  app.get('/tarefas/pendentes', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest, reply) => {
    const query = listPendingTasksSchema.parse(req.query)

    const where: any = { status: 'PENDENTE' }
    if (query.instanciaId) where.instanciaId = query.instanciaId
    if (query.fluxoId) where.instancia = { fluxoProcessoId: query.fluxoId }

    const [total, tarefas] = await Promise.all([
      prisma.tarefaProcesso.count({ where }),
      prisma.tarefaProcesso.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
        include: {
          instancia: {
            select: {
              id: true,
              camundaInstanceId: true,
              fluxoProcesso: { select: { id: true, nome: true, camundaKey: true } },
              proposicao: { select: { id: true, numero: true, ementa: true, status: true } },
            },
          },
        },
      }),
    ])

    return { data: tarefas, meta: { total, page: query.page, pageSize: query.pageSize } }
  })

  app.get('/tarefas/minhas', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest) => {
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

    if (tarefa.atribuidoAId && tarefa.atribuidoAId !== req.user.id) {
      const userOrgaos: string[] = (req.user as any).orgaos ?? []
      if (!tarefa.atribuidoAOrgaoId || !userOrgaos.includes(tarefa.atribuidoAOrgaoId)) {
        return reply.status(403).send({ error: 'Sem permissão para completar esta tarefa' })
      }
    }

    const camundaVars = toCamundaVariables(variaveis)

    try {
      await camundaService.completeTask(taskId, camundaVars)
    } catch (err) {
      req.log.error({ err, taskId }, 'Falha ao completar tarefa no Camunda')
      return reply.status(502).send({ error: 'Falha ao comunicar com Camunda' })
    }

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

  app.post('/avaliar-decisao', {
    preHandler: [requireAuth, requirePermission('processos:ler')],
  }, async (req: FastifyRequest<{
    Body: { decisionKey: string; variaveis: Record<string, unknown> }
  }>, reply) => {
    const { decisionKey, variaveis } = req.body as {
      decisionKey: string
      variaveis: Record<string, unknown>
    }

    if (!decisionKey || !/^[a-zA-Z0-9_-]+$/.test(decisionKey)) {
      return reply.status(400).send({ error: 'decisionKey inválida' })
    }

    const camundaVars = toCamundaVariables(variaveis)
    const resultado = await camundaService.evaluateDecision(decisionKey, camundaVars as any)
    return { resultado }
  })
}
