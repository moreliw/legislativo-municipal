import { describe, it, expect, vi, beforeEach } from 'vitest'
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

    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }
    ;(axios.create as any).mockReturnValue(mockClient)

    const { CamundaService } = await import('../src/modules/processos/camunda.service')
    service = new CamundaService({ baseUrl: 'http://localhost:8085' })
  })

  describe('startProcess', () => {
    it('deve iniciar processo com businessKey e variáveis', async () => {
      const instanceMock = {
        id: 'instance-abc123',
        definitionId: 'tramitacao_proposicao_basica:1:xxx',
        businessKey: 'PL-001/2024',
        ended: false,
      }
      mockClient.post.mockResolvedValue({ data: instanceMock })

      const result = await service.startProcess({
        processDefinitionKey: 'tramitacao_proposicao_basica',
        businessKey: 'PL-001/2024',
        variables: {
          proposicaoId: { value: 'prop_001', type: 'String' },
          tipoMateria: { value: 'PL', type: 'String' },
          regime: { value: 'ORDINARIO', type: 'String' },
        },
      })

      expect(mockClient.post).toHaveBeenCalledWith(
        '/process-definition/key/tramitacao_proposicao_basica/start',
        expect.objectContaining({
          businessKey: 'PL-001/2024',
          variables: expect.objectContaining({
            proposicaoId: { value: 'prop_001', type: 'String' },
            tipoMateria: { value: 'PL', type: 'String' },
          }),
        }),
      )
      expect(result.id).toBe('instance-abc123')
      expect(result.businessKey).toBe('PL-001/2024')
    })
  })

  describe('completeTask', () => {
    it('deve completar tarefa com variáveis formatadas', async () => {
      mockClient.post.mockResolvedValue({ data: {} })

      await service.completeTask('task-xyz', {
        conforme: { value: true, type: 'Boolean' },
        observacaoAnalise: { value: 'OK', type: 'String' },
      })

      expect(mockClient.post).toHaveBeenCalledWith(
        '/task/task-xyz/complete',
        expect.objectContaining({
          workerId: expect.any(String),
          variables: {
            conforme: { value: true, type: 'Boolean' },
            observacaoAnalise: { value: 'OK', type: 'String' },
          },
        }),
      )
    })
  })

  describe('getUserTasks', () => {
    it('deve buscar tarefas por grupos candidatos', async () => {
      const tarefasMock = [
        { id: 't1', name: 'Análise em Comissão', processInstanceId: 'inst1', candidateGroups: ['COMISSAO_PERMANENTE'] },
      ]
      mockClient.get.mockResolvedValue({ data: tarefasMock })

      const result = await service.getUserTasks(['COMISSAO_PERMANENTE', 'MESA_DIRETORA'])

      expect(mockClient.get).toHaveBeenCalledWith('/task', {
        params: { candidateGroups: 'COMISSAO_PERMANENTE,MESA_DIRETORA' },
      })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Análise em Comissão')
    })

    it('deve incluir assignee quando fornecido', async () => {
      mockClient.get.mockResolvedValue({ data: [] })

      await service.getUserTasks([], 'user-001')

      expect(mockClient.get).toHaveBeenCalledWith('/task', {
        params: { assignee: 'user-001' },
      })
    })
  })

  describe('evaluateDecision', () => {
    it('deve avaliar DMN e retornar array de resultados', async () => {
      const resultadoMock = [
        {
          exigeParecerJuridico: { value: true, type: 'Boolean' },
          comissaoResponsavel: { value: 'COMISSAO_LEGISLACAO', type: 'String' },
          prazoDias: { value: 40, type: 'Integer' },
        },
      ]
      mockClient.post.mockResolvedValue({ data: resultadoMock })

      const result = await service.evaluateDecision('decisao_roteamento_proposicao', {
        tipoMateria: { value: 'PL', type: 'String' },
        origem: { value: 'VEREADOR', type: 'String' },
        regime: { value: 'ORDINARIO', type: 'String' },
      })

      expect(mockClient.post).toHaveBeenCalledWith(
        '/decision-definition/key/decisao_roteamento_proposicao/evaluate',
        expect.any(Object),
      )
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
    })
  })

  describe('cancelProcess', () => {
    it('deve cancelar instância com motivo', async () => {
      mockClient.delete.mockResolvedValue({ data: {} })

      await service.cancelProcess('instance-001', 'Retirada pela autoria')

      expect(mockClient.delete).toHaveBeenCalledWith(
        '/process-instance/instance-001',
        { data: { deleteReason: 'Retirada pela autoria' } },
      )
    })
  })

  describe('getActivityHistory', () => {
    it('deve retornar histórico de atividades de uma instância', async () => {
      const historicoMock = [
        { id: 'act1', activityId: 'task_analise_inicial', activityName: 'Análise Inicial', activityType: 'userTask', startTime: '2024-03-10T09:00:00Z', endTime: '2024-03-11T08:00:00Z', durationInMillis: 82800000 },
      ]
      mockClient.get.mockResolvedValue({ data: historicoMock })

      const result = await service.getActivityHistory('instance-001')

      expect(mockClient.get).toHaveBeenCalledWith('/history/activity-instance', {
        params: { processInstanceId: 'instance-001' },
      })
      expect(result).toHaveLength(1)
      expect(result[0].activityId).toBe('task_analise_inicial')
    })
  })

  describe('formatVariables (private — testado indiretamente)', () => {
    it('deve serializar variáveis do tipo Json como string', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'i1', businessKey: 'test', ended: false, definitionId: 'x' } })

      await service.startProcess({
        processDefinitionKey: 'test',
        businessKey: 'test',
        variables: {
          jsonData: { value: { chave: 'valor' }, type: 'Json' },
        },
      })

      const callArgs = mockClient.post.mock.calls[0][1]
      expect(callArgs.variables.jsonData.value).toBe('{"chave":"valor"}')
      expect(callArgs.variables.jsonData.type).toBe('Json')
    })
  })
})
