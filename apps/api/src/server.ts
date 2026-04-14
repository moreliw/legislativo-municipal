import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { prisma } from './lib/prisma'
import { redisClient } from './lib/redis'
import { logger } from './lib/logger'

import { proposicoesRoutes } from './modules/proposicoes/routes'
import { tramitacaoRoutes } from './modules/tramitacao/routes'
import { processosRoutes } from './modules/processos/routes'
import { sessoesRoutes } from './modules/sessoes/routes'
import { documentosRoutes } from './modules/documentos/routes'
import { pdfRoutes } from './modules/documentos/pdf.routes'
import { usuariosRoutes } from './modules/usuarios/routes'
import { auditoriaRoutes } from './modules/auditoria/routes'
import { adminRoutes } from './modules/admin/routes'
import { publicacaoRoutes } from './modules/publicacao/routes'
import { buscaRoutes } from './modules/busca/routes'
import { notificacoesRoutes } from './modules/notificacoes/routes'
import { exportacaoRoutes } from './modules/exportacao/routes'
import { auditoriaPlugin } from './plugins/auditoria'
import { authPlugin } from './plugins/auth'
import { lgpdPlugin } from './plugins/lgpd'
import { swaggerPlugin } from './plugins/swagger'
import { iniciarWorkers } from './modules/processos/workers'

export async function build() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } })

  await app.register(cors, { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true })
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' })
  await app.register(jwt, { secret: { public: process.env.KEYCLOAK_PUBLIC_KEY || 'dev-secret' } })
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })
  await app.register(authPlugin)
  await app.register(auditoriaPlugin)
  await app.register(lgpdPlugin)
  await app.register(swaggerPlugin)

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.round(process.uptime()),
  }))

  const v1 = '/api/v1'
  await app.register(proposicoesRoutes, { prefix: `${v1}/proposicoes` })
  await app.register(tramitacaoRoutes,  { prefix: `${v1}/tramitacao` })
  await app.register(processosRoutes,   { prefix: `${v1}/processos` })
  await app.register(sessoesRoutes,     { prefix: `${v1}/sessoes` })
  await app.register(documentosRoutes,  { prefix: `${v1}/documentos` })
  await app.register(pdfRoutes,         { prefix: `${v1}/pdf` })
  await app.register(usuariosRoutes,    { prefix: `${v1}/usuarios` })
  await app.register(auditoriaRoutes,   { prefix: `${v1}/auditoria` })
  await app.register(adminRoutes,       { prefix: `${v1}/admin` })
  await app.register(publicacaoRoutes,  { prefix: `${v1}/publicacao` })
  await app.register(buscaRoutes,           { prefix: `${v1}/busca` })
  await app.register(notificacoesRoutes,    { prefix: `${v1}/notificacoes` })
  await app.register(exportacaoRoutes,      { prefix: `${v1}/exportar` })

  app.setErrorHandler((error, req, reply) => {
    app.log.error({ error, url: req.url })
    const status = (error as any).statusCode ?? 500
    reply.status(status).send({
      error: error.name || 'InternalServerError',
      message: error.message,
      statusCode: status,
    })
  })

  return app
}

async function start() {
  const server = await build()
  try {
    await prisma.$connect()
    await redisClient.connect()
    iniciarWorkers()

    const host = process.env.HOST || '0.0.0.0'
    const port = parseInt(process.env.PORT || '3001')
    await server.listen({ host, port })
    logger.info(`🏛️ Legislativo rodando em http://${host}:${port}`)
  } catch (err) {
    logger.error(err, 'Falha ao iniciar')
    process.exit(1)
  }
}

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0) })

start()
