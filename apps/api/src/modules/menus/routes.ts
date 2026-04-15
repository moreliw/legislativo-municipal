import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function checarPermissao(permissoes: string[], requerida: string | null): boolean {
  if (!requerida) return true
  if (permissoes.includes('*:*')) return true
  if (permissoes.includes(requerida)) return true
  const [modulo, acao] = requerida.split(':')
  return permissoes.some(p => {
    const [pm, pa] = p.split(':')
    return (pm === '*' || pm === modulo) && (pa === '*' || pa === acao)
  })
}

export async function menusRoutes(app: FastifyInstance) {
  // GET /api/v1/menus — menus filtrados pelas permissões do usuário logado
  app.get('/', async (req: FastifyRequest, reply) => {
    const user = (req as any).user
    if (!user) return reply.status(401).send({ error: 'Unauthorized' })

    const { permissoes, casaId } = user
    const isSuperAdmin = casaId === 'sistema' || permissoes.includes('sistema:*')

    // Buscar menus ativos do banco
    const todosMenus = await prisma.menu.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    })

    const menusVisiveis = todosMenus.filter(m => {
      // Menus da seção sistema: APENAS superadmin
      if (m.secao === 'sistema') return isSuperAdmin
      // Demais menus: verificar permissão
      return checarPermissao(permissoes, m.permissao)
    })

    return {
      menus: menusVisiveis,
      isSuperAdmin,
      total: menusVisiveis.length,
      usuario: {
        id:      user.id,
        nome:    user.nome,
        email:   user.email,
        casaId:  user.casaId,
        perfis:  user.perfis,
      },
    }
  })

  // GET /api/v1/menus/todos — todos os menus (apenas superadmin, para admin)
  app.get('/todos', async (req: FastifyRequest, reply) => {
    const user = (req as any).user
    if (!user || (user.casaId !== 'sistema' && !user.permissoes.includes('sistema:*'))) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    const menus = await prisma.menu.findMany({ orderBy: { ordem: 'asc' } })
    return { menus, total: menus.length }
  })
}
