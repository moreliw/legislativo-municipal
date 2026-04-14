import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    proposicao: {
      findFirst: vi.fn(),
    },
  })),
}))

describe('NumeracaoService.gerarNumero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve gerar PL-001/2024 quando não há proposições anteriores', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new (PrismaClient as any)()
    prisma.proposicao.findFirst.mockResolvedValue(null)

    // Forçar ano fixo para testes
    const anoFixo = 2024
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(anoFixo)

    const { gerarNumero } = await import('../src/modules/admin/numeracao.service')
    const numero = await gerarNumero('casa_001', 'PL')

    expect(numero).toBe('PL-001/2024')
  })

  it('deve incrementar sequência para PL-002/2024', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new (PrismaClient as any)()
    prisma.proposicao.findFirst.mockResolvedValue({ numero: 'PL-001/2024' })

    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024)

    const { gerarNumero } = await import('../src/modules/admin/numeracao.service')
    const numero = await gerarNumero('casa_001', 'PL')

    expect(numero).toBe('PL-002/2024')
  })

  it('deve formatar sequência com zeros à esquerda', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new (PrismaClient as any)()
    prisma.proposicao.findFirst.mockResolvedValue({ numero: 'REQ-009/2024' })

    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024)

    const { gerarNumero } = await import('../src/modules/admin/numeracao.service')
    const numero = await gerarNumero('casa_001', 'REQ')

    expect(numero).toBe('REQ-010/2024')
  })

  it('deve gerar número correto para diferentes prefixos', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new (PrismaClient as any)()
    prisma.proposicao.findFirst.mockResolvedValue(null)

    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024)

    const { gerarNumero } = await import('../src/modules/admin/numeracao.service')

    const prefixos = ['PL', 'PDL', 'MOC', 'REQ', 'IND', 'PRL']
    for (const prefixo of prefixos) {
      const numero = await gerarNumero('casa_001', prefixo)
      expect(numero).toBe(`${prefixo}-001/2024`)
      expect(numero).toMatch(/^[A-Z]+-\d{3}\/\d{4}$/)
    }
  })
})
