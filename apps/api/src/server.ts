// Carregar .env manualmente se não estiver carregado (fallback)
import * as fs from 'fs'
import * as path from 'path'
if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.*)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2]
      }
    }
  }
}

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { prisma } from './lib/prisma'
import { logger } from './lib/logger'

import { authRoutes }          from './modules/auth/auth.routes'
import { proposicoesRoutes }   from './modules/proposicoes/routes'
import { tramitacaoRoutes }    from './modules/tramitacao/routes'
import { processosRoutes }     from './modules/processos/routes'
import { sessoesRoutes }       from './modules/sessoes/routes'
import { documentosRoutes }    from './modules/documentos/routes'
import { pdfRoutes }           from './modules/documentos/pdf.routes'
import { usuariosRoutes }      from './modules/usuarios/routes'
import { auditoriaRoutes }     from './modules/auditoria/routes'
import { adminRoutes }         from './modules/admin/routes'
import { publicacaoRoutes }    from './modules/publicacao/routes'
import { buscaRoutes }         from './modules/busca/routes'
import { notificacoesRoutes }  from './modules/notificacoes/routes'
import { exportacaoRoutes }    from './modules/exportacao/routes'
import { sistemaRoutes }       from './modules/sistema/routes'
import { menusRoutes }          from './modules/menus/routes'
import { camundaRoutes }       from './modules/camunda/routes'
import { publicoRoutes }       from './modules/publico/routes'
import { swaggerPlugin }       from './plugins/swagger'
import { authPlugin }          from './plugins/auth'
import { auditoriaPlugin }     from './plugins/auditoria'
import { lgpdPlugin }          from './plugins/lgpd'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres')
}

export async function build() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    trustProxy: true,
  })

  // ── Infraestrutura ───────────────────────────────────────────────
  await app.register(cors, {
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'https://pleno.morelidev.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  })

  await app.register(cookie, { secret: JWT_SECRET })

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { algorithm: 'HS256', expiresIn: '15m' },
    verify: { algorithms: ['HS256'] },
  })

  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })

  // ── Plugins de negócio ───────────────────────────────────────────
  // Nota: @fastify/jwt já registra req.user automaticamente
  // auditoria é registrado aqui antes dos outros plugins
  await app.register(swaggerPlugin)
  await app.register(authPlugin)
  await app.register(auditoriaPlugin)
  await app.register(lgpdPlugin)

  // ── Health check ─────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV,
  }))

  // ── Rotas de autenticação (públicas + privadas) ───────────────────
  const v1 = '/api/v1'
  await app.register(authRoutes,         { prefix: `${v1}/auth` })

  // ── Rotas privadas ────────────────────────────────────────────────
  await app.register(proposicoesRoutes,  { prefix: `${v1}/proposicoes` })
  await app.register(tramitacaoRoutes,   { prefix: `${v1}/tramitacao` })
  await app.register(processosRoutes,    { prefix: `${v1}/processos` })
  await app.register(sessoesRoutes,      { prefix: `${v1}/sessoes` })
  await app.register(documentosRoutes,   { prefix: `${v1}/documentos` })
  await app.register(pdfRoutes,          { prefix: `${v1}/pdf` })
  await app.register(usuariosRoutes,     { prefix: `${v1}/usuarios` })
  await app.register(auditoriaRoutes,    { prefix: `${v1}/auditoria` })
  await app.register(adminRoutes,        { prefix: `${v1}/admin` })
  await app.register(buscaRoutes,        { prefix: `${v1}/busca` })
  await app.register(notificacoesRoutes, { prefix: `${v1}/notificacoes` })
  await app.register(exportacaoRoutes,   { prefix: `${v1}/exportar` })

  // ── Administração do Sistema (Superadmin) ────────────────────────
  await app.register(sistemaRoutes,      { prefix: `${v1}/sistema` })
  await app.register(menusRoutes,         { prefix: `${v1}/menus` })
  await app.register(camundaRoutes,        { prefix: `${v1}/camunda` })

  // ── Portal público ────────────────────────────────────────────────
  await app.register(publicacaoRoutes,   { prefix: `${v1}/publicacao` })
  await app.register(publicoRoutes,      { prefix: `${v1}/publico` })

  // ── Error handler ─────────────────────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    const status = (error as any).statusCode ?? 500
    if (status >= 500) app.log.error({ err: error.message, url: req.url })
    reply.status(status).send({
      error:      error.name || 'InternalServerError',
      message:    status === 500 ? 'Erro interno do servidor' : error.message,
      statusCode: status,
    })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: 'NotFound', message: `${req.method} ${req.url} não existe` })
  })

  return app
}

async function start() {
  const server = await build()
  try {
    await prisma.$connect()
    logger.info('Banco conectado')
  } catch (err) {
    logger.warn({ err }, 'Banco não conectou — tentará reconectar')
  }
  const port = parseInt(process.env.PORT || '3001')
  await server.listen({ host: '0.0.0.0', port })
  logger.info(`API rodando em http://0.0.0.0:${port}`)
}

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0) })

start().catch(err => { console.error('Falha fatal:', err); process.exit(1) })
