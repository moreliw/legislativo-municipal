import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Rotas completamente públicas (sem nenhuma autenticação)
const ROTAS_PUBLICAS = [
  '/health',
  '/docs',
  '/docs/',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/recuperar-senha',
  '/api/v1/auth/redefinir-senha',
  '/api/v1/publicacao/portal',     // Portal de transparência
  '/api/v1/publicacao/portal/',
]

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id:          string
      casaId:      string
      nome:        string
      email:       string
      perfis:      string[]
      permissoes:  string[]
      orgaos:      string[]
      precisaTrocar: boolean
    }
    auditoria: {
      registrar: (data: {
        entidade: string
        entidadeId: string
        acao: string
        dadosAntes?: unknown
        dadosDepois?: unknown
      }) => Promise<void>
    }
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null)

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.url.split('?')[0]

    // Permitir rotas públicas sem autenticação
    if (ROTAS_PUBLICAS.some(p => url === p || url.startsWith(p))) return

    // Verificar Bearer token no header Authorization
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token de acesso não fornecido',
      })
    }

    // Verificar e decodificar JWT
    let payload: Record<string, unknown>
    try {
      payload = await req.jwtVerify() as Record<string, unknown>
    } catch (err: any) {
      if (err?.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
        return reply.status(401).send({
          error: 'TokenExpired',
          message: 'Token expirado. Renove sua sessão.',
        })
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token inválido',
      })
    }

    const userId = payload.sub as string

    // Buscar usuário no banco — garantir que ainda está ativo e tem acesso à casa correta
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        perfis: { include: { perfil: { select: { nome: true, permissoes: true } } } },
        orgaos: { select: { orgaoId: true } },
        credencial: { select: { precisaTrocar: true } },
      },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Usuário inativo ou sem acesso',
      })
    }

    // Construir permissões acumuladas de todos os perfis
    const permissoes = new Set<string>()
    const perfisNomes: string[] = []
    for (const up of usuario.perfis) {
      perfisNomes.push(up.perfil.nome)
      for (const perm of up.perfil.permissoes) permissoes.add(perm)
    }

    req.user = {
      id:            usuario.id,
      casaId:        usuario.casaId,
      nome:          usuario.nome,
      email:         usuario.email,
      perfis:        perfisNomes,
      permissoes:    [...permissoes],
      orgaos:        usuario.orgaos.map(o => o.orgaoId),
      precisaTrocar: usuario.credencial?.precisaTrocar ?? false,
    }
  })
})

// ── Guards de permissão ──────────────────────────────────────────────

export function requireAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
  done()
}

export function requirePermission(...requeridas: string[]) {
  return (req: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })

    const tem = requeridas.every(r => checarPermissao(req.user.permissoes, r))
    if (!tem) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Permissão insuficiente. Requerido: ${requeridas.join(', ')}`,
      })
    }
    done()
  }
}

export function requireAdmin(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
  if (!req.user.perfis.includes('ADMINISTRADOR') && !checarPermissao(req.user.permissoes, '*:*')) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito a administradores' })
  }
  done()
}

function checarPermissao(permissoes: string[], requerida: string): boolean {
  if (permissoes.includes('*:*')) return true
  const [modulo, acao] = requerida.split(':')
  return permissoes.some(p => {
    const [pm, pa] = p.split(':')
    return (pm === '*' || pm === modulo) && (pa === '*' || pa === acao)
  })
}
