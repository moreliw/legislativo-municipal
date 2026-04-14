import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'

// ── Testes do sistema de autenticação e autorização ────────────────

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    usuario: {
      findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
        if (where.keycloakId === 'valid-user-id') {
          return {
            id: 'u1',
            casaId: 'casa1',
            keycloakId: 'valid-user-id',
            nome: 'Teste User',
            email: 'teste@test.com',
            ativo: true,
            perfis: [
              { perfil: { nome: 'GESTOR_LEGISLATIVO', permissoes: ['proposicoes:criar', 'tramitacao:encaminhar'] } },
            ],
            orgaos: [{ orgaoId: 'org1' }],
          }
        }
        if (where.keycloakId === 'admin-user-id') {
          return {
            id: 'u2', casaId: 'casa1', keycloakId: 'admin-user-id',
            nome: 'Admin', email: 'admin@test.com', ativo: true,
            perfis: [{ perfil: { nome: 'ADMINISTRADOR', permissoes: ['*:*'] } }],
            orgaos: [],
          }
        }
        if (where.keycloakId === 'inactive-user-id') {
          return { id: 'u3', ativo: false, perfis: [], orgaos: [] }
        }
        return null
      }),
    },
  })),
}))

import { requirePermission } from '../src/plugins/auth'

// Helper: criar token JWT de teste
async function criarToken(app: ReturnType<typeof Fastify>, sub: string) {
  return (app as any).jwt.sign({ sub }, { expiresIn: '1h' })
}

// Helper: app de teste mínimo
async function buildTestApp() {
  const app = Fastify({ logger: false })

  await app.register(jwt, { secret: 'test-secret-key-minimo-32-chars-ok' })

  // Simular plugin auth simplificado para testes
  app.addHook('onRequest', async (req: any) => {
    try {
      await req.jwtVerify()
      const payload = req.user as any
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      const usuario = await prisma.usuario.findUnique({
        where: { keycloakId: payload.sub },
        include: {
          perfis: { include: { perfil: true } },
          orgaos: { select: { orgaoId: true } },
        },
      })
      if (!usuario || !usuario.ativo) {
        req._authFailed = true
        return
      }
      const permissoes = new Set<string>()
      for (const up of usuario.perfis) {
        for (const p of up.perfil.permissoes) permissoes.add(p)
      }
      req.user = {
        id: usuario.id, casaId: usuario.casaId, nome: usuario.nome,
        email: usuario.email, perfis: usuario.perfis.map((up: any) => up.perfil.nome),
        permissoes: [...permissoes], orgaos: usuario.orgaos.map((o: any) => o.orgaoId),
      }
    } catch {
      req._authFailed = true
    }
  })

  // Rota protegida simples
  app.get('/protegida', async (req: any, reply) => {
    if (req._authFailed) return reply.status(401).send({ error: 'Unauthorized' })
    return { userId: req.user.id }
  })

  // Rota com permissão específica
  app.get('/admin-only',
    { preHandler: [(req: any, reply, done) => {
      if (req._authFailed || !req.user) return reply.status(401).send({ error: 'Unauthorized' })
      const temPermissao = req.user.permissoes.includes('*:*') ||
        req.user.permissoes.some((p: string) => {
          const [mod, acao] = p.split(':')
          return (mod === '*' || mod === 'admin') && (acao === '*' || acao === 'usuarios')
        })
      if (!temPermissao) return reply.status(403).send({ error: 'Forbidden' })
      done()
    }] },
    async (req: any) => ({ admin: true, userId: req.user.id }),
  )

  return app
}

describe('Autenticação — JWT', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = await buildTestApp()
    await (app as any).ready()
  })

  it('deve recusar acesso sem token', async () => {
    const res = await (app as any).inject({ method: 'GET', url: '/protegida' })
    expect(res.statusCode).toBe(401)
  })

  it('deve recusar token inválido', async () => {
    const res = await (app as any).inject({
      method: 'GET',
      url: '/protegida',
      headers: { Authorization: 'Bearer token-invalido-aqui' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('deve aceitar token válido e retornar usuário', async () => {
    const token = await criarToken(app, 'valid-user-id')
    const res = await (app as any).inject({
      method: 'GET',
      url: '/protegida',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.userId).toBe('u1')
  })

  it('deve recusar usuário inativo', async () => {
    const token = await criarToken(app, 'inactive-user-id')
    const res = await (app as any).inject({
      method: 'GET',
      url: '/protegida',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it('deve recusar usuário inexistente', async () => {
    const token = await criarToken(app, 'nao-existe-id')
    const res = await (app as any).inject({
      method: 'GET',
      url: '/protegida',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('Autorização — Permissões', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = await buildTestApp()
    await (app as any).ready()
  })

  it('admin com wildcard *:* deve ter acesso a admin-only', async () => {
    const token = await criarToken(app, 'admin-user-id')
    const res = await (app as any).inject({
      method: 'GET',
      url: '/admin-only',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.admin).toBe(true)
  })

  it('usuário comum deve ser bloqueado em admin-only', async () => {
    const token = await criarToken(app, 'valid-user-id')
    const res = await (app as any).inject({
      method: 'GET',
      url: '/admin-only',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('Lógica de permissões — checarPermissao', () => {
  function checarPermissao(permissoes: string[], requerida: string): boolean {
    if (permissoes.includes('*:*')) return true
    const [modulo, acao] = requerida.split(':')
    return permissoes.some(p => {
      const [pMod, pAcao] = p.split(':')
      return (pMod === '*' || pMod === modulo) && (pAcao === '*' || pAcao === acao)
    })
  }

  it('wildcard *:* concede tudo', () => {
    expect(checarPermissao(['*:*'], 'proposicoes:criar')).toBe(true)
    expect(checarPermissao(['*:*'], 'admin:usuarios')).toBe(true)
    expect(checarPermissao(['*:*'], 'qualquer:coisa')).toBe(true)
  })

  it('permissão exata funciona', () => {
    expect(checarPermissao(['proposicoes:criar'], 'proposicoes:criar')).toBe(true)
    expect(checarPermissao(['proposicoes:criar'], 'proposicoes:deletar')).toBe(false)
  })

  it('wildcard de módulo proposicoes:* concede todas as ações', () => {
    expect(checarPermissao(['proposicoes:*'], 'proposicoes:criar')).toBe(true)
    expect(checarPermissao(['proposicoes:*'], 'proposicoes:listar')).toBe(true)
    expect(checarPermissao(['proposicoes:*'], 'sessoes:criar')).toBe(false)
  })

  it('múltiplas permissões — qualquer match concede acesso', () => {
    const perms = ['proposicoes:listar', 'tramitacao:encaminhar', 'documentos:criar']
    expect(checarPermissao(perms, 'tramitacao:encaminhar')).toBe(true)
    expect(checarPermissao(perms, 'admin:usuarios')).toBe(false)
  })

  it('sem permissões — tudo negado', () => {
    expect(checarPermissao([], 'proposicoes:criar')).toBe(false)
    expect(checarPermissao([], 'admin:qualquer')).toBe(false)
  })
})
