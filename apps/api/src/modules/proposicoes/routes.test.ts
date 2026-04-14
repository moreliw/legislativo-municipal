import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

// Mock completo das dependências externas
vi.mock('@prisma/client', () => {
  const mockProposicoes = [
    {
      id: 'p1', numero: 'PL-001/2024', ano: 2024, status: 'PROTOCOLADO',
      ementa: 'Projeto de lei de teste', casaId: 'casa1',
      tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
      autor: { nome: 'Ver. Teste', cargo: 'Vereador' },
      orgaoDestino: null,
      _count: { tramitacoes: 2, documentos: 1 },
    },
  ]

  return {
    PrismaClient: vi.fn(() => ({
      proposicao: {
        findMany: vi.fn().mockResolvedValue(mockProposicoes),
        findUnique: vi.fn().mockResolvedValue({
          ...mockProposicoes[0],
          documentos: [],
          tramitacoes: [],
          instanciaProcesso: null,
          pautas: [],
          publicacoes: [],
        }),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({ ...mockProposicoes[0], id: 'p_novo' }),
        update: vi.fn().mockResolvedValue(mockProposicoes[0]),
      },
      tipoMateria: {
        findUnique: vi.fn().mockResolvedValue({ id: 'tm1', nome: 'PL', sigla: 'PL', prefixoNumero: 'PL' }),
      },
      tramitacaoEvento: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'ev1', tipo: 'PROTOCOLO', sequencia: 1 }),
      },
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn({})),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    })),
    StatusProposicao: { RASCUNHO: 'RASCUNHO', PROTOCOLADO: 'PROTOCOLADO' },
    Prisma: {},
  }
})

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), on: vi.fn() })),
}))

// Mock auth — bypassar autenticação nos testes
const mockUser = {
  id: 'user_test',
  casaId: 'casa_test',
  nome: 'Usuário Teste',
  email: 'teste@test.com',
  perfis: ['GESTOR_LEGISLATIVO'],
  permissoes: ['*:*'],
  orgaos: [],
}

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Injetar usuário mock em todas as requisições
  app.addHook('onRequest', async (req) => {
    (req as any).user = mockUser
    ;(req as any).auditoria = {
      registrar: vi.fn().mockResolvedValue(undefined),
    }
  })

  // Registrar apenas as rotas de proposições
  const { proposicoesRoutes } = await import('../src/modules/proposicoes/routes')
  await app.register(proposicoesRoutes, { prefix: '/api/v1/proposicoes' })

  return app
}

describe('GET /api/v1/proposicoes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve retornar lista paginada de proposições', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes',
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('meta')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta).toMatchObject({
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    })
  })

  it('deve aceitar parâmetro de busca', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes?busca=PL-001',
    })

    expect(response.statusCode).toBe(200)
  })

  it('deve aceitar filtro de status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes?status=PROTOCOLADO',
    })

    expect(response.statusCode).toBe(200)
  })

  it('deve rejeitar status inválido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes?status=STATUS_INEXISTENTE',
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/proposicoes/:id', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve retornar proposição existente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes/p1',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('numero')
    expect(body).toHaveProperty('ementa')
  })

  it('deve retornar 404 para proposição inexistente', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prismaInstance = new (PrismaClient as any)()
    prismaInstance.proposicao.findUnique.mockResolvedValueOnce(null)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/proposicoes/inexistente',
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('POST /api/v1/proposicoes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve criar proposição com dados válidos', async () => {
    const payload = {
      tipoMateriaId: 'cuid1234567890abcdef',
      ementa: 'Ementa válida com pelo menos vinte caracteres para o teste funcionar',
      origem: 'VEREADOR',
      regime: 'ORDINARIO',
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposicoes',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(response.statusCode).toBe(201)
  })

  it('deve rejeitar ementa muito curta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposicoes',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipoMateriaId: 'cuid1234567890abcdef',
        ementa: 'Curta', // menos de 20 caracteres
        origem: 'VEREADOR',
      }),
    })

    expect(response.statusCode).toBe(400)
  })

  it('deve rejeitar origem inválida', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposicoes',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipoMateriaId: 'cuid1234567890abcdef',
        ementa: 'Ementa com pelo menos vinte caracteres para validação',
        origem: 'ORIGEM_INVALIDA',
      }),
    })

    expect(response.statusCode).toBe(400)
  })
})
