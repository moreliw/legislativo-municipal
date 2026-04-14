import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      casaId: string
      nome: string
      email: string
      perfis: string[]
      permissoes: string[]
      orgaos: string[]
    }
    auditoria: {
      registrar: (data: { entidade: string; entidadeId: string; acao: string; dadosAntes?: unknown; dadosDepois?: unknown }) => Promise<void>
    }
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  if (!app.hasRequestDecorator('user')) {
    app.decorateRequest('user', null)
  }

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // Rotas públicas não precisam de auth
    const publicPaths = ['/health', '/api/v1/publicacao/portal']
    if (publicPaths.some(p => req.url.startsWith(p))) return

    // Verificar JWT
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
    }

    const jwtPayload = req.user as Record<string, unknown>
    const keycloakId = jwtPayload.sub as string

    // Buscar usuário no banco
    const usuario = await prisma.usuario.findUnique({
      where: { keycloakId },
      include: {
        perfis: { include: { perfil: true } },
        orgaos: { select: { orgaoId: true } },
      },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Usuário inativo ou não encontrado' })
    }

    // Construir permissões acumuladas
    const permissoes = new Set<string>()
    for (const up of usuario.perfis) {
      for (const perm of up.perfil.permissoes) {
        permissoes.add(perm)
      }
    }

    req.user = {
      id: usuario.id,
      casaId: usuario.casaId,
      nome: usuario.nome,
      email: usuario.email,
      perfis: usuario.perfis.map(up => up.perfil.nome),
      permissoes: [...permissoes],
      orgaos: usuario.orgaos.map(o => o.orgaoId),
    }
  })
})

/**
 * Middleware de verificação de permissão
 * Suporta wildcard: "proposicoes:*" ou "*:*"
 */
export function requireAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!req.user) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  done()
}

export function requirePermission(...permissoesRequeridas: string[]) {
  return function (req: FastifyRequest, reply: FastifyReply, done: () => void) {
    if (!req.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const temPermissao = permissoesRequeridas.every(permRequerida =>
      checarPermissao(req.user.permissoes, permRequerida),
    )

    if (!temPermissao) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Permissão insuficiente. Requerido: ${permissoesRequeridas.join(', ')}`,
      })
    }

    done()
  }
}

function checarPermissao(permissoes: string[], requerida: string): boolean {
  if (permissoes.includes('*:*')) return true

  const [modulo, acao] = requerida.split(':')

  return permissoes.some(p => {
    const [pMod, pAcao] = p.split(':')
    return (pMod === '*' || pMod === modulo) && (pAcao === '*' || pAcao === acao)
  })
}
