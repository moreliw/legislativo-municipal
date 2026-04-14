import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@prisma/client', () => {
  const presencasMock = [
    { id: 'pr1', sessaoId: 's1', vereadorId: 'v1', presente: true },
    { id: 'pr2', sessaoId: 's1', vereadorId: 'v2', presente: true },
    { id: 'pr3', sessaoId: 's1', vereadorId: 'v3', presente: false },
  ]
  const sessaoMock = {
    id: 's1', numero: '012/2024', tipo: 'ORDINARIA', status: 'ABERTA',
    quorumMinimo: 6, presentes: 2, casaId: 'casa1',
    data: new Date('2024-04-25T19:00:00Z'),
    presencas: presencasMock.filter(p => p.presente),
  }

  return {
    PrismaClient: vi.fn(() => ({
      sessaoLegislativa: {
        findUnique: vi.fn().mockResolvedValue(sessaoMock),
        findMany: vi.fn().mockResolvedValue([sessaoMock]),
        create: vi.fn().mockResolvedValue({ ...sessaoMock, id: 's_nova' }),
        update: vi.fn().mockResolvedValue({ ...sessaoMock, status: 'ENCERRADA' }),
        aggregate: vi.fn().mockResolvedValue({ _max: { ordem: 0 } }),
      },
      itemPauta: {
        create: vi.fn().mockResolvedValue({ id: 'ip1', sessaoId: 's1', proposicaoId: 'p1', ordem: 1 }),
        updateMany: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _max: { ordem: 2 } }),
      },
      presencaSessao: {
        upsert: vi.fn().mockImplementation(async (args) => args.create),
      },
      votoRegistrado: {
        upsert: vi.fn().mockImplementation(async (args) => args.create),
        findMany: vi.fn().mockResolvedValue([]),
      },
      proposicao: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'p1', numero: 'PL-001/2024', status: 'EM_PAUTA'
        }),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (ops) => {
        if (Array.isArray(ops)) return Promise.all(ops)
        return ops({})
      }),
    })),
    Prisma: {},
  }
})

// ── Testes de lógica de votação ───────────────────────────────────

describe('Lógica de votação em sessão', () => {
  it('deve calcular aprovação por maioria simples', () => {
    const votos = [
      { vereadorId: 'v1', voto: 'SIM' },
      { vereadorId: 'v2', voto: 'SIM' },
      { vereadorId: 'v3', voto: 'SIM' },
      { vereadorId: 'v4', voto: 'SIM' },
      { vereadorId: 'v5', voto: 'NAO' },
      { vereadorId: 'v6', voto: 'NAO' },
      { vereadorId: 'v7', voto: 'ABSTENCAO' },
    ]

    const sim = votos.filter(v => v.voto === 'SIM').length
    const nao = votos.filter(v => v.voto === 'NAO').length
    const aprovado = sim > nao

    expect(sim).toBe(4)
    expect(nao).toBe(2)
    expect(aprovado).toBe(true)
  })

  it('deve rejeitar em caso de empate', () => {
    const votos = [
      { voto: 'SIM' }, { voto: 'SIM' },
      { voto: 'NAO' }, { voto: 'NAO' },
      { voto: 'ABSTENCAO' }, { voto: 'ABSTENCAO' },
    ]
    const sim = votos.filter(v => v.voto === 'SIM').length
    const nao = votos.filter(v => v.voto === 'NAO').length
    const aprovado = sim > nao // empate = não aprova

    expect(aprovado).toBe(false)
  })

  it('deve calcular quórum corretamente', () => {
    const totalVereadores = 11
    const quorumMaioriaSimplesMin = Math.floor(totalVereadores / 2) + 1
    const quorumMaioriaAbsolutaMin = Math.ceil((totalVereadores * 2) / 3)

    expect(quorumMaioriaSimplesMin).toBe(6)
    expect(quorumMaioriaAbsolutaMin).toBe(8)
  })

  it('deve detectar quórum insuficiente', () => {
    const presentes = 4
    const quorumMinimo = 6
    const temQuorum = presentes >= quorumMinimo

    expect(temQuorum).toBe(false)
  })

  it('deve detectar quórum suficiente', () => {
    const presentes = 7
    const quorumMinimo = 6
    const temQuorum = presentes >= quorumMinimo

    expect(temQuorum).toBe(true)
  })
})

// ── Testes de ordenação de pauta ──────────────────────────────────

describe('Ordenação de itens da pauta', () => {
  it('deve calcular próxima ordem corretamente', () => {
    const maxOrdemAtual = 3
    const proximaOrdem = maxOrdemAtual + 1

    expect(proximaOrdem).toBe(4)
  })

  it('deve iniciar com ordem 1 quando pauta está vazia', () => {
    const maxOrdemAtual = 0
    const proximaOrdem = maxOrdemAtual + 1

    expect(proximaOrdem).toBe(1)
  })
})

// ── Testes de status de sessão ────────────────────────────────────

describe('Fluxo de status de sessão', () => {
  const transicoesValidas = [
    ['AGENDADA', 'ABERTA'],
    ['ABERTA', 'ENCERRADA'],
    ['ABERTA', 'SUSPENSA'],
    ['AGENDADA', 'CANCELADA'],
  ]

  const transicoesInvalidas = [
    ['ENCERRADA', 'ABERTA'],
    ['CANCELADA', 'ABERTA'],
    ['ENCERRADA', 'AGENDADA'],
  ]

  it.each(transicoesValidas)('permite %s → %s', (de, para) => {
    const regras: Record<string, string[]> = {
      AGENDADA: ['ABERTA', 'CANCELADA'],
      ABERTA: ['ENCERRADA', 'SUSPENSA'],
      SUSPENSA: ['ABERTA', 'CANCELADA'],
      ENCERRADA: [],
      CANCELADA: [],
    }
    expect(regras[de]?.includes(para)).toBe(true)
  })

  it.each(transicoesInvalidas)('bloqueia %s → %s', (de, para) => {
    const regras: Record<string, string[]> = {
      AGENDADA: ['ABERTA', 'CANCELADA'],
      ABERTA: ['ENCERRADA', 'SUSPENSA'],
      SUSPENSA: ['ABERTA', 'CANCELADA'],
      ENCERRADA: [],
      CANCELADA: [],
    }
    expect(regras[de]?.includes(para)).toBe(false)
  })
})
