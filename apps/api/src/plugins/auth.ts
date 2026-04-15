import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Rotas públicas — sem autenticação
const ROTAS_PUBLICAS = [
  '/health',
  '/docs',
  '/docs/',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/recuperar-senha',
  '/api/v1/auth/redefinir-senha',
  '/api/v1/publicacao/portal',
  '/api/v1/publicacao/portal/',
]

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id:            string
      casaId:        string
      nome:          string
      email:         string
      perfis:        string[]
      permissoes:    string[]
      orgaos:        string[]
      precisaTrocar: boolean
    }
  }
}

async function authPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.url.split('?')[0]

    // Liberar rotas públicas
    if (ROTAS_PUBLICAS.some(p => url === p || url.startsWith(p))) return

    // Verificar Bearer token
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token não fornecido' })
    }

    // Verificar JWT
    let payload: Record<string, unknown>
    try {
      payload = await req.jwtVerify() as Record<string, unknown>
    } catch (err: any) {
      const msg = err?.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'
        ? 'Token expirado' : 'Token inválido'
      return reply.status(401).send({ error: 'Unauthorized', message: msg })
    }

    const userId = payload.sub as string

    // Buscar usuário no banco
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        perfis: { include: { perfil: { select: { nome: true, permissoes: true } } } },
        orgaos: { select: { orgaoId: true } },
        credencial: { select: { precisaTrocar: true } },
      },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Usuário inativo' })
    }

    const permissoes = new Set<string>()
    const perfisNomes: string[] = []
    for (const up of usuario.perfis) {
      perfisNomes.push(up.perfil.nome)
      for (const p of up.perfil.permissoes) permissoes.add(p)
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
}


export function requireAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
  done()
}

export function requirePermission(...requeridas: string[]) {
  return (req: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
    const tem = requeridas.every(r => checarPermissao(req.user.permissoes, r))
    if (!tem) return reply.status(403).send({
      error: 'Forbidden',
      message: `Permissão insuficiente: ${requeridas.join(', ')}`,
    })
    done()
  }
}

export function requireAdmin(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
  if (!req.user.perfis.includes('ADMINISTRADOR') &&
      !checarPermissao(req.user.permissoes, '*:*')) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Apenas administradores' })
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

export default fp(authPlugin, { name: 'auth' })
export { authPlugin }
