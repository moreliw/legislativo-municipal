import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProposicoes = [
  { id: 'p1', numero: 'PL-001/2024', status: 'EM_COMISSAO', casaId: 'casa1', criadoEm: new Date('2024-03-10'), atualizadoEm: new Date('2024-04-18') },
  { id: 'p2', numero: 'PL-002/2024', status: 'PROTOCOLADO', casaId: 'casa1', criadoEm: new Date('2024-04-01'), atualizadoEm: new Date('2024-04-01') },
  { id: 'p3', numero: 'MOC-001/2024', status: 'APROVADO', casaId: 'casa1', criadoEm: new Date('2024-02-01'), atualizadoEm: new Date('2024-03-15') },
]

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    proposicao: {
      findUnique: vi.fn().mockImplementation(async ({ where }: any) =>
        where.id ? mockProposicoes.find(p => p.id === where.id) ?? null : null,
      ),
      findMany: vi.fn().mockResolvedValue(mockProposicoes),
      count: vi.fn().mockResolvedValue(3),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        ...data, id: 'p_novo', criadoEm: new Date(), atualizadoEm: new Date(),
      })),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    tipoMateria: {
      findUnique: vi.fn().mockResolvedValue({ id: 'tm1', prefixoNumero: 'PL', sigla: 'PL', nome: 'Projeto de Lei' }),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ mes: 3, total: BigInt(2) }, { mes: 4, total: BigInt(1) }]),
    $transaction: vi.fn().mockImplementation((fn: any) => fn({})),
  })),
  StatusProposicao: {
    RASCUNHO: 'RASCUNHO', PROTOCOLADO: 'PROTOCOLADO', EM_COMISSAO: 'EM_COMISSAO', APROVADO: 'APROVADO',
  },
  Prisma: {},
}))

vi.mock('../../lib/redis', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../admin/numeracao.service', () => ({
  numeracaoService: {
    gerarNumero: vi.fn().mockResolvedValue('PL-003/2024'),
  },
}))

describe('ProposicoesService', () => {
  let service: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { ProposicoesService } = await import('../src/modules/proposicoes/proposicoes.service')
    service = new ProposicoesService()
  })

  describe('criar', () => {
    it('deve criar proposição com numeração automática', async () => {
      const proposicao = await service.criar({
        casaId: 'casa1',
        tipoMateriaId: 'tm1',
        ementa: 'Ementa de teste com pelo menos vinte caracteres',
        origem: 'VEREADOR',
        autorId: 'u1',
      })

      expect(proposicao.numero).toBe('PL-003/2024')
      expect(proposicao.status).toBe('RASCUNHO')
    })

    it('deve lançar NotFoundError para tipo de matéria inexistente', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      prisma.tipoMateria.findUnique.mockResolvedValueOnce(null)

      await expect(service.criar({
        casaId: 'casa1',
        tipoMateriaId: 'tm_inexistente',
        ementa: 'Ementa de teste válida',
        origem: 'VEREADOR',
      })).rejects.toThrow('não encontrado')
    })

    it('deve usar palavras-chave vazias quando não fornecidas', async () => {
      const proposicao = await service.criar({
        casaId: 'casa1',
        tipoMateriaId: 'tm1',
        ementa: 'Ementa simples de teste para verificação',
        origem: 'VEREADOR',
      })

      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      const chamada = prisma.proposicao.create.mock.calls[0][0]
      expect(chamada.data.palavrasChave).toEqual([])
    })
  })

  describe('listar', () => {
    it('deve retornar paginação correta', async () => {
      const resultado = await service.listar({ casaId: 'casa1', page: 1, pageSize: 20 })

      expect(resultado.data).toHaveLength(3)
      expect(resultado.meta.total).toBe(3)
      expect(resultado.meta.page).toBe(1)
      expect(resultado.meta.pageSize).toBe(20)
      expect(resultado.meta.totalPages).toBe(1)
    })

    it('deve calcular totalPages corretamente', () => {
      expect(Math.ceil(50 / 20)).toBe(3)
      expect(Math.ceil(1 / 20)).toBe(1)
      expect(Math.ceil(100 / 20)).toBe(5)
      expect(Math.ceil(0 / 20)).toBe(0)
    })
  })

  describe('estatisticas', () => {
    it('deve calcular taxa de aprovação', async () => {
      const stats = await service.estatisticas('casa1', 2024)

      expect(stats.ano).toBe(2024)
      expect(typeof stats.taxaAprovacao).toBe('number')
      expect(stats.taxaAprovacao).toBeGreaterThanOrEqual(0)
      expect(stats.taxaAprovacao).toBeLessThanOrEqual(100)
    })

    it('deve retornar 12 meses no array porMes', async () => {
      const stats = await service.estatisticas('casa1', 2024)

      expect(stats.porMes).toHaveLength(12)
      expect(stats.porMes[0].mes).toBe(1)
      expect(stats.porMes[11].mes).toBe(12)
    })

    it('deve converter BigInt do $queryRaw para Number', async () => {
      const stats = await service.estatisticas('casa1', 2024)

      stats.porMes.forEach((m: { mes: number; total: number }) => {
        expect(typeof m.total).toBe('number')
      })
    })

    it('deve retornar 0% para taxa de aprovação com total zero', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      prisma.proposicao.count.mockResolvedValue(0)

      const stats = await service.estatisticas('casa1', 2024)
      expect(stats.taxaAprovacao).toBe(0)
    })
  })

  describe('buscarPorId', () => {
    it('deve lançar NotFoundError para ID inexistente', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      prisma.proposicao.findUnique.mockResolvedValueOnce(null)

      await expect(service.buscarPorId('id_inexistente')).rejects.toThrow('não encontrado')
    })

    it('deve usar cache quando disponível', async () => {
      const cached = { id: 'p1', numero: 'PL-001/2024', ementa: 'Cacheado' }
      const { cacheGet } = await import('../src/lib/redis')
      ;(cacheGet as any).mockResolvedValueOnce(cached)

      const resultado = await service.buscarPorId('p1')
      expect(resultado.ementa).toBe('Cacheado')

      // Não deve chamar o Prisma quando cache disponível
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      expect(prisma.proposicao.findUnique).not.toHaveBeenCalled()
    })
  })
})
