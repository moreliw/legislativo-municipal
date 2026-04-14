import axios, { AxiosInstance } from 'axios'
import { logger } from '../../lib/logger'
import { AppError } from '../../lib/errors'

interface CamundaConfig {
  baseUrl: string
  engineName?: string
  authToken?: string
}

interface StartProcessInput {
  processDefinitionKey: string
  businessKey: string
  variables: Record<string, CamundaVariable>
}

interface CamundaVariable {
  value: unknown
  type: 'String' | 'Boolean' | 'Integer' | 'Long' | 'Double' | 'Json'
}

interface ProcessInstance {
  id: string
  definitionId: string
  businessKey: string
  ended: boolean
}

interface UserTask {
  id: string
  name: string
  processInstanceId: string
  processDefinitionKey: string
  assignee: string | null
  candidateGroups: string[]
  created: string
  due: string | null
  variables: Record<string, CamundaVariable>
}

/**
 * CamundaService
 * Abstração sobre a API REST do Camunda 7/8.
 * Trata deploy, execução, tarefas e histórico.
 */
export class CamundaService {
  private client: AxiosInstance
  private engineName: string

  constructor(config: CamundaConfig) {
    this.engineName = config.engineName || 'default'
    this.client = axios.create({
      baseURL: `${config.baseUrl}/engine-rest`,
      headers: {
        'Content-Type': 'application/json',
        ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
      },
      timeout: 30000,
    })

    // Request/Response interceptors para logging
    this.client.interceptors.request.use((req) => {
      logger.debug({ method: req.method, url: req.url }, 'Camunda API request')
      return req
    })

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error(
          { status: err.response?.status, data: err.response?.data, url: err.config?.url },
          'Camunda API error',
        )
        throw err
      },
    )
  }

  /**
   * Deploy de um arquivo BPMN/DMN
   */
  async deployProcess(name: string, xmlContent: string, isDmn = false): Promise<{
    id: string
    name: string
    deploymentTime: string
  }> {
    const FormData = (await import('form-data')).default
    const form = new FormData()

    form.append('deployment-name', name)
    form.append('enable-duplicate-filtering', 'true')
    form.append('deployment-source', 'legislativo-api')
    form.append(
      isDmn ? `${name}.dmn` : `${name}.bpmn`,
      Buffer.from(xmlContent, 'utf-8'),
      { filename: isDmn ? `${name}.dmn` : `${name}.bpmn` },
    )

    const response = await this.client.post('/deployment/create', form, {
      headers: form.getHeaders(),
    })

    return {
      id: response.data.id,
      name: response.data.name,
      deploymentTime: response.data.deploymentTime,
    }
  }

  /**
   * Inicia uma instância de processo
   */
  async startProcess(input: StartProcessInput): Promise<ProcessInstance> {
    const response = await this.client.post(
      `/process-definition/key/${input.processDefinitionKey}/start`,
      {
        businessKey: input.businessKey,
        variables: this.formatVariables(input.variables),
      },
    )

    return response.data
  }

  /**
   * Busca instância de processo pelo ID
   */
  async getProcessInstance(instanceId: string): Promise<ProcessInstance> {
    const response = await this.client.get(`/process-instance/${instanceId}`)
    return response.data
  }

  /**
   * Lista tarefas do usuário por grupos
   */
  async getUserTasks(candidateGroups: string[], assigneeId?: string): Promise<UserTask[]> {
    const params: Record<string, string> = {}

    if (candidateGroups.length > 0) {
      params.candidateGroups = candidateGroups.join(',')
    }
    if (assigneeId) {
      params.assignee = assigneeId
    }

    const response = await this.client.get('/task', { params })
    return response.data
  }

  /**
   * Busca uma tarefa específica
   */
  async getTask(taskId: string): Promise<UserTask> {
    const response = await this.client.get(`/task/${taskId}`)
    return response.data
  }

  /**
   * Completa uma tarefa humana com variáveis
   */
  async completeTask(
    taskId: string,
    variables: Record<string, CamundaVariable>,
  ): Promise<void> {
    await this.client.post(`/task/${taskId}/complete`, {
      variables: this.formatVariables(variables),
    })
  }

  /**
   * Atribui uma tarefa a um usuário
   */
  async assignTask(taskId: string, userId: string): Promise<void> {
    await this.client.post(`/task/${taskId}/assignee`, { userId })
  }

  /**
   * Busca variáveis de uma instância
   */
  async getProcessVariables(
    instanceId: string,
  ): Promise<Record<string, CamundaVariable>> {
    const response = await this.client.get(
      `/process-instance/${instanceId}/variables`,
    )
    return response.data
  }

  /**
   * Atualiza variáveis de uma instância
   */
  async setProcessVariables(
    instanceId: string,
    variables: Record<string, CamundaVariable>,
  ): Promise<void> {
    await this.client.post(`/process-instance/${instanceId}/variables`, {
      modifications: this.formatVariables(variables),
    })
  }

  /**
   * Busca histórico de atividades de uma instância
   */
  async getActivityHistory(instanceId: string): Promise<
    Array<{
      id: string
      activityId: string
      activityName: string
      activityType: string
      startTime: string
      endTime: string | null
      durationInMillis: number | null
      assignee: string | null
    }>
  > {
    const response = await this.client.get(
      '/history/activity-instance',
      { params: { processInstanceId: instanceId } },
    )
    return response.data
  }

  /**
   * Cancela uma instância de processo
   */
  async cancelProcess(instanceId: string, reason: string): Promise<void> {
    await this.client.delete(`/process-instance/${instanceId}`, {
      data: { deleteReason: reason },
    })
  }

  /**
   * Avalia uma tabela DMN
   */
  async evaluateDecision(
    decisionKey: string,
    variables: Record<string, CamundaVariable>,
  ): Promise<Record<string, unknown>[]> {
    const response = await this.client.post(
      `/decision-definition/key/${decisionKey}/evaluate`,
      { variables: this.formatVariables(variables) },
    )
    return response.data
  }

  /**
   * Busca definições de processo disponíveis
   */
  async listProcessDefinitions(): Promise<
    Array<{
      id: string
      key: string
      name: string
      version: number
      resource: string
      deploymentId: string
    }>
  > {
    const response = await this.client.get('/process-definition', {
      params: { latestVersion: true },
    })
    return response.data
  }

  // Helper: formata variáveis para o formato Camunda
  private formatVariables(
    vars: Record<string, CamundaVariable>,
  ): Record<string, { value: unknown; type: string }> {
    const formatted: Record<string, { value: unknown; type: string }> = {}

    for (const [key, variable] of Object.entries(vars)) {
      formatted[key] = {
        value:
          variable.type === 'Json'
            ? JSON.stringify(variable.value)
            : variable.value,
        type: variable.type,
      }
    }

    return formatted
  }
}

// Singleton exportado
export const camundaService = new CamundaService({
  baseUrl: process.env.CAMUNDA_URL || 'http://localhost:8085',
  authToken: process.env.CAMUNDA_AUTH_TOKEN,
})
