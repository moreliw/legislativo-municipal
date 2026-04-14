import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../../plugins/auth'

const prisma = new PrismaClient()

export async function usuariosRoutes(app: FastifyInstance) {

  // ── PERFIL DO USUÁRIO LOGADO ─────────────────────────────────────
  app.get('/me', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      const usuario = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: {
          orgaos: { include: { orgao: { select: { nome: true, sigla: true, tipo: true } } } },
          perfis: { include: { perfil: { select: { nome: true, descricao: true } } } },
        },
      })
      if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' })
      return usuario
    },
  )

  // ── TAREFAS PENDENTES DO USUÁRIO ─────────────────────────────────
  app.get('/me/tarefas', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      const tarefas = await prisma.tarefaProcesso.findMany({
        where: {
          status: 'PENDENTE',
          OR: [
            { atribuidoAId: req.user.id },
            { atribuidoAOrgaoId: { in: req.user.orgaos } },
          ],
        },
        include: {
          instancia: {
            include: {
              proposicao: { select: { id: true, numero: true, ementa: true, status: true } },
            },
          },
        },
        orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
      })

      return tarefas
    },
  )

  // ── ATUALIZAR PERFIL ─────────────────────────────────────────────
  app.patch('/me', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      const { cargo } = req.body as { cargo?: string }
      const usuario = await prisma.usuario.update({
        where: { id: req.user.id },
        data: { ...(cargo ? { cargo } : {}) },
      })
      return usuario
    },
  )
}
