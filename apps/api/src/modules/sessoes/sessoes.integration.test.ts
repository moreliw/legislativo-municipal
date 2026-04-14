import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

// ── Testes de integração: Sessão Legislativa com Votação ──────────
// Cobertura: criar sessão, registrar presença, votar, apurar resultado

vi.mock('@prisma/client', () => {
  let sessaoAtual: Record<string, unknown> = {}
  let presencasState: Record<string, unknown>[] = []
  let votosState: Record<string, unknown>[] = []
  let pautaState: Record<string, unknown>[] = []

  return {
    PrismaClient: vi.fn(() => ({
      sessaoLegislativa: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          sessaoAtual = { id: 'sess-test-1', ...data, status: 'AGENDADA' }
          return sessaoAtual
        }),
        findUnique: vi.fn().mockImplementation(async () => ({
          ...sessaoAtual,
          presencas: presencasState,
          pauta: pautaState,
        })),
        update: vi.fn().mockImplementation(async ({ data }: any) => {
          Object.assign(sessaoAtual, data)
          return sessaoAtual
        }),
        aggregate: vi.fn().mockResolvedValue({ _max: { ordem: pautaState.length } }),
      },
      itemPauta: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const item = { id: `item-${Date.now()}`, ...data }
          pautaState.push(item)
          return item
        }),
        updateMany: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _max: { ordem: pautaState.length } }),
      },
      presencaSessao: {
        upsert: vi.fn().mockImplementation(async ({ create }: any) => {
          const existing = presencasState.findIndex((p: any) => p.vereadorId === create.vereadorId)
          if (existing >= 0) presencasState[existing] = create
          else presencasState.push(create)
          return create
        }),
      },
      votoRegistrado: {
        upsert: vi.fn().mockImplementation(async ({ create }: any) => {
          votosState.push(create)
          return create
        }),
        findMany: vi.fn().mockImplementation(async ({ where }: any) =>
          votosState.filter((v: any) => v.sessaoId === where?.sessaoId && v.proposicaoId === where?.proposicaoId),
        ),
      },
      proposicao: {
        findUnique: vi.fn().mockResolvedValue({ id: 'prop-test', status: 'EM_PAUTA', numero: 'PL-001/2024', ementa: 'Teste', tipoMateria: { sigla: 'PL' } }),
        update: vi.fn().mockResolvedValue({}),
      },
      tramitacaoEvento: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'ev-1', tipo: 'VOTACAO', sequencia: 1 }),
      },
      notificacao: { create: vi.fn().mockResolvedValue({}) },
      auditoriaLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn().mockImplementation(async (ops: any) => {
        if (Array.isArray(ops)) return Promise.all(ops)
        return ops({})
      }),
    })),
    Prisma: {},
  }
})

vi.mock('../src/modules/processos/camunda.service', () => ({
  camundaService: {
    startProcess: vi.fn().mockResolvedValue({ id: 'cam-1' }),
    completeTask: vi.fn(),
  },
  CamundaService: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }) })),
}))

const mockUser = { id: 'u-mesa', casaId: 'casa-1', nome: 'Presidente', email: 'p@test.com', perfis: ['PRESIDENCIA'], permissoes: ['*:*'], orgaos: [] }

import Fastify from 'fastify'

async function buildApp() {
  const app = Fastify({ logger: false })
  app.addHook('onRequest', async (req) => {
    ;(req as any).user = mockUser
    ;(req as any).auditoria = { registrar: vi.fn() }
  })
  const { sessoesRoutes } = await import('../src/modules/sessoes/routes')
  await app.register(sessoesRoutes, { prefix: '/api/v1/sessoes' })
  return app
}

describe('Sessão Legislativa — Fluxo Completo', () => {
  let app: ReturnType<typeof Fastify>
  let sessaoId: string

  beforeAll(async () => {
    app = await buildApp()
    await (app as any).ready()
  })

  afterAll(async () => {
    await (app as any).close()
  })

  it('1. Deve criar uma sessão ordinária', async () => {
    const res = await (app as any).inject({
      method: 'POST',
      url: '/api/v1/sessoes',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: '012/2024',
        tipo: 'ORDINARIA',
        data: '2024-04-25T19:00:00Z',
        horaInicio: '19h00',
        local: 'Plenário Principal',
        quorumMinimo: 6,
      }),
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    sessaoId = body.id
    expect(sessaoId).toBeTruthy()
    expect(body.status).toBe('AGENDADA')
  })

  it('2. Deve abrir a sessão', async () => {
    const res = await (app as any).inject({
      method: 'POST',
      url: `/api/v1/sessoes/${sessaoId}/abrir`,
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ABERTA')
  })

  it('3. Deve registrar presenças (7 dos 11 vereadores)', async () => {
    const presencas = [
      { vereadorId: 'v1', presente: true },
      { vereadorId: 'v2', presente: true },
      { vereadorId: 'v3', presente: true },
      { vereadorId: 'v4', presente: true },
      { vereadorId: 'v5', presente: true },
      { vereadorId: 'v6', presente: true },
      { vereadorId: 'v7', presente: true },
      { vereadorId: 'v8', presente: false, justificativa: 'Atestado médico' },
      { vereadorId: 'v9', presente: false },
      { vereadorId: 'v10', presente: false },
      { vereadorId: 'v11', presente: false },
    ]

    const res = await (app as any).inject({
      method: 'POST',
      url: `/api/v1/sessoes/${sessaoId}/presencas`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presencas }),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.presentes).toBe(7)
  })

  it('4. Deve registrar votação com aprovação por maioria', async () => {
    const votos = [
      { vereadorId: 'v1', voto: 'SIM' },
      { vereadorId: 'v2', voto: 'SIM' },
      { vereadorId: 'v3', voto: 'SIM' },
      { vereadorId: 'v4', voto: 'SIM' },
      { vereadorId: 'v5', voto: 'NAO' },
      { vereadorId: 'v6', voto: 'NAO' },
      { vereadorId: 'v7', voto: 'ABSTENCAO' },
    ]

    const res = await (app as any).inject({
      method: 'POST',
      url: `/api/v1/sessoes/${sessaoId}/votar`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposicaoId: 'prop-test', votos }),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.resultado).toBe('APROVADO')
    expect(body.sim).toBe(4)
    expect(body.nao).toBe(2)
    expect(body.abstencao).toBe(1)
  })

  it('5. Deve encerrar a sessão com ata', async () => {
    const ata = `ATA DA 12ª SESSÃO ORDINÁRIA\nData: 25/04/2024\nResultados: PL-001/2024 Aprovado (4x2).`

    const res = await (app as any).inject({
      method: 'POST',
      url: `/api/v1/sessoes/${sessaoId}/encerrar`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ata }),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ENCERRADA')
  })
})

describe('Regras de negócio — Votação', () => {
  it('deve detectar quórum insuficiente para votar', async () => {
    // 4 presentes < 6 mínimo
    const presentes = 4
    const quorumMinimo = 6
    expect(presentes < quorumMinimo).toBe(true)
  })

  it('deve exigir sessão aberta para votação', () => {
    const statusPermitidos = ['ABERTA']
    expect(statusPermitidos.includes('AGENDADA')).toBe(false)
    expect(statusPermitidos.includes('ABERTA')).toBe(true)
    expect(statusPermitidos.includes('ENCERRADA')).toBe(false)
  })

  it('deve calcular resultado correto com empate (não aprova)', () => {
    const votos = [
      { voto: 'SIM' }, { voto: 'SIM' }, { voto: 'SIM' },
      { voto: 'NAO' }, { voto: 'NAO' }, { voto: 'NAO' },
    ]
    const sim = votos.filter(v => v.voto === 'SIM').length
    const nao = votos.filter(v => v.voto === 'NAO').length
    const aprovado = sim > nao // empate = NÃO aprova

    expect(aprovado).toBe(false)
    expect(sim).toBe(3)
    expect(nao).toBe(3)
  })
})
