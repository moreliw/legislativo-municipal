import { FastifyInstance } from 'fastify'
import { camundaService } from '../../services/camunda.service'
import { requirePermission } from '../../plugins/auth'

function isCamundaUnavailable(err: any): boolean {
  return err?.code === 'ECONNREFUSED' || err?.code === 'ECONNABORTED' || err?.code === 'ERR_CANCELED'
}

export async function camundaRoutes(app: FastifyInstance) {
  app.get('/definitions', { preHandler: [requirePermission('processos:ler')] }, async (req, reply) => {
    try {
      const definitions = await camundaService.listProcessDefinitions()
      return reply.send(definitions)
    } catch (err: any) {
      if (isCamundaUnavailable(err)) return reply.send([])
      return reply.status(500).send({ error: 'Erro ao listar processos', message: err.message })
    }
  })

  app.post('/deploy', { preHandler: [requirePermission('processos:criar')] }, async (req, reply) => {
    try {
      const { bpmnXml, name } = req.body as { bpmnXml: string; name: string }
      const result = await camundaService.deployProcess(bpmnXml, name)
      return reply.send(result)
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao fazer deploy', message: err.message })
    }
  })

  app.post('/start/:processKey', { preHandler: [requirePermission('processos:criar')] }, async (req, reply) => {
    try {
      const { processKey } = req.params as { processKey: string }
      const { variables } = req.body as { variables?: Record<string, any> }
      const instance = await camundaService.startProcess(processKey, variables || {})
      return reply.send(instance)
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao iniciar processo', message: err.message })
    }
  })

  app.get('/instances', { preHandler: [requirePermission('processos:ler')] }, async (req, reply) => {
    try {
      const { processKey } = req.query as { processKey?: string }
      const instances = await camundaService.listProcessInstances(processKey)
      return reply.send(instances)
    } catch (err: any) {
      if (isCamundaUnavailable(err)) return reply.send([])
      return reply.status(500).send({ error: 'Erro ao listar instâncias', message: err.message })
    }
  })

  app.get('/tasks', { preHandler: [requirePermission('processos:ler')] }, async (req, reply) => {
    try {
      const { processInstanceId } = req.query as { processInstanceId?: string }
      const tasks = await camundaService.listTasks(processInstanceId)
      return reply.send(tasks)
    } catch (err: any) {
      if (isCamundaUnavailable(err)) return reply.send([])
      return reply.status(500).send({ error: 'Erro ao listar tarefas', message: err.message })
    }
  })

  app.post('/tasks/:taskId/complete', { preHandler: [requirePermission('processos:editar')] }, async (req, reply) => {
    try {
      const { taskId } = req.params as { taskId: string }
      const { variables } = req.body as { variables?: Record<string, any> }
      await camundaService.completeTask(taskId, variables || {})
      return reply.send({ success: true })
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao completar tarefa', message: err.message })
    }
  })
}
