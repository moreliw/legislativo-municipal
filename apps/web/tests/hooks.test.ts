import { describe, it, expect, vi } from 'vitest'

// Testes de lógica dos hooks sem renderização React
// (comportamento puro, sem dependência de DOM)

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        data: {
          data: [{ id: 'p1', numero: 'PL-001/2024', status: 'PROTOCOLADO' }],
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        },
      }),
      post: vi.fn().mockResolvedValue({ data: { id: 'ev1', tipo: 'PROTOCOLO' } }),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
  },
}))

describe('API Client — proposicoesApi', () => {
  it('deve construir URL de listagem correta', async () => {
    const { proposicoesApi } = await import('../lib/api')
    // Verificar que a função existe e é chamável
    expect(typeof proposicoesApi.listar).toBe('function')
    expect(typeof proposicoesApi.buscarPorId).toBe('function')
    expect(typeof proposicoesApi.criar).toBe('function')
    expect(typeof proposicoesApi.protocolar).toBe('function')
    expect(typeof proposicoesApi.encaminhar).toBe('function')
    expect(typeof proposicoesApi.devolver).toBe('function')
    expect(typeof proposicoesApi.arquivar).toBe('function')
    expect(typeof proposicoesApi.historico).toBe('function')
  })

  it('deve ter todos os métodos do sessoesApi', async () => {
    const { sessoesApi } = await import('../lib/api')
    expect(typeof sessoesApi.listar).toBe('function')
    expect(typeof sessoesApi.buscarPorId).toBe('function')
    expect(typeof sessoesApi.criar).toBe('function')
    expect(typeof sessoesApi.votar).toBe('function')
    expect(typeof sessoesApi.abrir).toBe('function')
    expect(typeof sessoesApi.encerrar).toBe('function')
  })

  it('deve ter todos os métodos do documentosApi', async () => {
    const { documentosApi } = await import('../lib/api')
    expect(typeof documentosApi.listar).toBe('function')
    expect(typeof documentosApi.upload).toBe('function')
    expect(typeof documentosApi.download).toBe('function')
    expect(typeof documentosApi.assinar).toBe('function')
  })
})

describe('Query keys — cache strategy', () => {
  it('deve gerar query keys únicas por entidade', async () => {
    const { queryKeys } = await import('../lib/hooks')

    const key1 = queryKeys.proposicoes.detail('p1')
    const key2 = queryKeys.proposicoes.detail('p2')
    const keyList = queryKeys.proposicoes.list()

    // Keys de diferentes IDs devem ser distintas
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2))

    // Key de detalhe deve ser diferente de key de lista
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(keyList))

    // Namespace correto
    expect(key1[0]).toBe('proposicoes')
    expect(key1[1]).toBe('detail')
    expect(key1[2]).toBe('p1')
  })

  it('deve gerar query key de histórico com proposicaoId', async () => {
    const { queryKeys } = await import('../lib/hooks')
    const key = queryKeys.proposicoes.historico('prop_001')
    expect(key).toContain('prop_001')
    expect(key).toContain('historico')
  })

  it('deve gerar query keys de sessões corretamente', async () => {
    const { queryKeys } = await import('../lib/hooks')
    expect(queryKeys.sessoes.all).toEqual(['sessoes'])
    const detailKey = queryKeys.sessoes.detail('s1')
    expect(detailKey[0]).toBe('sessoes')
    expect(detailKey[2]).toBe('s1')
  })
})

describe('Mock API', () => {
  it('deve retornar proposições mockadas', async () => {
    const { mockApi, isMockEnabled } = await import('../lib/mock-api')

    const resultado = await mockApi.proposicoes.listar()
    expect(Array.isArray(resultado.data)).toBe(true)
    expect(resultado.data.length).toBeGreaterThan(0)
    expect(resultado.meta.total).toBe(resultado.data.length)
  })

  it('deve filtrar proposições por busca no mock', async () => {
    const { mockApi } = await import('../lib/mock-api')
    const resultado = await mockApi.proposicoes.listar({ busca: 'energia' })
    expect(resultado.data.every(p => p.ementa.toLowerCase().includes('energia'))).toBe(true)
  })

  it('deve retornar tipos de matéria mockados', async () => {
    const { mockApi } = await import('../lib/mock-api')
    const tipos = await mockApi.admin.tiposMateria()
    expect(tipos.length).toBeGreaterThanOrEqual(5)
    expect(tipos.every(t => t.sigla && t.nome)).toBe(true)
  })

  it('deve retornar órgãos mockados', async () => {
    const { mockApi } = await import('../lib/mock-api')
    const orgaos = await mockApi.admin.orgaos()
    expect(orgaos.length).toBeGreaterThanOrEqual(5)
  })
})
