import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditoriaPluginImpl(app: FastifyInstance) {
  // Registrar decorator de auditoria apenas se não existir
  if (!app.hasRequestDecorator('auditoria')) {
    app.decorateRequest('auditoria', null)
  }

  app.addHook('onRequest', async (req) => {
    req.auditoria = {
      registrar: async ({
        entidade,
        entidadeId,
        acao,
        dadosAntes,
        dadosDepois,
      }: {
        entidade: string
        entidadeId: string
        acao: string
        dadosAntes?: unknown
        dadosDepois?: unknown
      }) => {
        try {
          await prisma.auditoriaLog.create({
            data: {
              entidade,
              entidadeId,
              acao,
              usuarioId: req.user?.id ?? null,
              ip: req.ip,
              endpoint: `${req.method} ${req.url}`,
              dadosAntes: dadosAntes ? dadosAntes : undefined,
              dadosDepois: dadosDepois ? dadosDepois : undefined,
            },
          })
        } catch { /* ignore */ }
      },
    }
  })
}

export const auditoriaPlugin = fp(auditoriaPluginImpl, { name: 'auditoria-plugin' })

// Serviço de auditoria exportado
export const auditoriaService = {
  async registrar(params: {
    entidade: string
    entidadeId: string
    acao: string
    usuarioId?: string
    ip?: string
    endpoint?: string
    dadosAntes?: any
    dadosDepois?: any
  }) {
    try {
      await prisma.auditoriaLog.create({
        data: {
          entidade:    params.entidade,
          entidadeId:  params.entidadeId,
          acao:        params.acao,
          usuarioId:   params.usuarioId ?? null,
          ip:          params.ip ?? '',
          endpoint:    params.endpoint ?? '',
          dadosAntes:  params.dadosAntes ?? undefined,
          dadosDepois: params.dadosDepois ?? undefined,
        },
      })
    } catch (err) {
      /* ignore audit errors */
    }
  },
}
