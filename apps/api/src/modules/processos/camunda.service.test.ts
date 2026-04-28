import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('CamundaService', () => {
  let service: any
  let mockClient: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }
    ;(axios.create as any).mockReturnValue(mockClient)

    const { CamundaService } = await import('./camunda.service')
    service = new CamundaService({ baseUrl: 'http://localhost:8085' })
  })

  it('deve extrair processDefinitionKey/version no deploy BPMN', async () => {
    mockClient.post.mockResolvedValue({
      data: {
        id: 'dep-1',
        name: 'Fluxo Teste',
        deploymentTime: '2026-04-28T18:00:00.000Z',
        deployedProcessDefinitions: {
          'proc:1:abc': {
            id: 'proc:1:abc',
            key: 'tramitacao_basica_v2',
            name: 'Tramitação Básica v2',
            version: 4,
            deploymentId: 'dep-1',
            resource: 'tramitacao_basica_v2.bpmn',
          },
        },
      },
    })

    const result = await service.deployProcess(
      'Tramitação Básica v2',
      '<definitions><process id="tramitacao_basica_v2" /></definitions>',
    )

    expect(result).toEqual({
      deploymentId: 'dep-1',
      deploymentName: 'Fluxo Teste',
      deploymentTime: '2026-04-28T18:00:00.000Z',
      processDefinitionId: 'proc:1:abc',
      processDefinitionKey: 'tramitacao_basica_v2',
      processDefinitionVersion: 4,
      processDefinitionResource: 'tramitacao_basica_v2.bpmn',
    })
  })

  it('deve iniciar e completar tarefa no fluxo completo', async () => {
    mockClient.post
      .mockResolvedValueOnce({
        data: {
          id: 'inst-001',
          definitionId: 'tramitacao_basica_v2:4:abc',
          businessKey: 'PL-024/2026',
          ended: false,
        },
      })
      .mockResolvedValueOnce({ data: {} })

    const instance = await service.startProcess({
      processDefinitionKey: 'tramitacao_basica_v2',
      businessKey: 'PL-024/2026',
      variables: {
        proposicaoId: { value: 'prop-1', type: 'String' },
        urgente: { value: false, type: 'Boolean' },
      },
    })

    await service.completeTask('task-001', {
      parecer: { value: 'OK', type: 'String' },
    })

    expect(instance.id).toBe('inst-001')
    expect(mockClient.post).toHaveBeenNthCalledWith(
      1,
      '/process-definition/key/tramitacao_basica_v2/start',
      expect.objectContaining({
        businessKey: 'PL-024/2026',
      }),
    )
    expect(mockClient.post).toHaveBeenNthCalledWith(
      2,
      '/task/task-001/complete',
      {
        variables: {
          parecer: { value: 'OK', type: 'String' },
        },
      },
    )
  })

  it('deve retornar diagnóstico saudável quando engine está acessível', async () => {
    mockClient.get.mockResolvedValueOnce({ data: { version: '7.24.2' } })

    const health = await service.getEngineHealth()

    expect(health.reachable).toBe(true)
    expect(health.authentication).toBe('ok')
    expect(health.platform).toBe('camunda7')
    expect(health.version).toBe('7.24.2')
    expect(health.restUrl).toContain('/engine-rest')
  })

  it('deve informar erro de autenticação no diagnóstico quando receber 401', async () => {
    mockClient.get.mockRejectedValueOnce({
      response: { status: 401 },
      message: 'Unauthorized',
    })

    const health = await service.getEngineHealth()

    expect(health.reachable).toBe(true)
    expect(health.authentication).toBe('unauthorized')
    expect(health.version).toBeNull()
  })
})
