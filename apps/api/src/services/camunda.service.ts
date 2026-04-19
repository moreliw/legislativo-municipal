import axios from 'axios'

const CAMUNDA_API = process.env.CAMUNDA_URL || 'http://localhost:8080/engine-rest'

export interface ProcessDefinition {
  id: string
  key: string
  name: string
  version: number
  deploymentId: string
}

export interface ProcessInstance {
  id: string
  definitionId: string
  businessKey?: string
  suspended: boolean
}

export interface DeploymentResult {
  id: string
  name: string
  deploymentTime: string
}

export const camundaService = {
  async listProcessDefinitions() {
    const { data } = await axios.get<ProcessDefinition[]>(`${CAMUNDA_API}/process-definition`)
    return data
  },

  async deployProcess(bpmnXml: string, name: string) {
    const FormData = (await import('form-data')).default
    const formData = new FormData()
    formData.append('data', Buffer.from(bpmnXml), { filename: `${name}.bpmn`, contentType: 'application/xml' })
    formData.append('deployment-name', name)

    const { data } = await axios.post<DeploymentResult>(
      `${CAMUNDA_API}/deployment/create`,
      formData,
      { headers: formData.getHeaders() }
    )
    return data
  },

  async startProcess(processKey: string, variables: Record<string, any> = {}) {
    const payload = {
      variables: Object.entries(variables).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: { value }
      }), {})
    }

    const { data } = await axios.post<ProcessInstance>(
      `${CAMUNDA_API}/process-definition/key/${processKey}/start`,
      payload
    )
    return data
  },

  async listProcessInstances(processKey?: string) {
    const params = processKey ? { processDefinitionKey: processKey } : {}
    const { data } = await axios.get<ProcessInstance[]>(`${CAMUNDA_API}/process-instance`, { params })
    return data
  },

  async listTasks(processInstanceId?: string) {
    const params = processInstanceId ? { processInstanceId } : {}
    const { data } = await axios.get(`${CAMUNDA_API}/task`, { params })
    return data
  },

  async completeTask(taskId: string, variables: Record<string, any> = {}) {
    await axios.post(`${CAMUNDA_API}/task/${taskId}/complete`, {
      variables: Object.entries(variables).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: { value }
      }), {})
    })
  },
}
