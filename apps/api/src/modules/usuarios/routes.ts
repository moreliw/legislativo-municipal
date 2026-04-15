import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const atualizarPerfilSchema = z.object({
  cargo: z.string().min(2).max(120).optional(),
  avatar: z.string().url().optional().nullable(),
})

const preferenciasSchema = z.object({
  tema: z.enum(['light', 'dark']).optional(),
})

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
      return {
        ...usuario,
        preferencias: (usuario.preferencias as Record<string, unknown> | null) ?? {},
      }
    },
  )

  // ── PREFERÊNCIAS DO USUÁRIO (tema, etc.) ───────────────────────────
  app.get('/me/preferencias', { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const usuario = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { preferencias: true },
      })
      return {
        preferencias: (usuario?.preferencias as Record<string, unknown> | null) ?? {},
      }
    },
  )

  app.patch('/me/preferencias', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      const body = preferenciasSchema.parse(req.body)
      const atual = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { preferencias: true },
      })

      const preferenciasAtuais = (atual?.preferencias as Record<string, unknown> | null) ?? {}
      const proximasPreferencias = {
        ...preferenciasAtuais,
        ...(body.tema ? { tema: body.tema } : {}),
      }

      const usuario = await prisma.usuario.update({
        where: { id: req.user.id },
        data: { preferencias: proximasPreferencias as object },
        select: { id: true, preferencias: true },
      })

      return reply.status(200).send({
        id: usuario.id,
        preferencias: (usuario.preferencias as Record<string, unknown> | null) ?? {},
      })
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
      const body = atualizarPerfilSchema.parse(req.body)
      const usuario = await prisma.usuario.update({
        where: { id: req.user.id },
        data: {
          ...(body.cargo ? { cargo: body.cargo } : {}),
          ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
        },
      })
      return usuario
    },
  )
}
