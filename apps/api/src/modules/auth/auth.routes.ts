import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  realizarLogin,
  renovarTokens,
  realizarLogout,
  solicitarRecuperacaoSenha,
  concluirRecuperacaoSenha,
  trocarSenha,
  validarForcaSenha,
  AuthError,
} from './auth.service'

const REFRESH_COOKIE = 'leg_refresh'
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/api/v1/auth',
  maxAge:   7 * 24 * 3600,  // 7 dias
}

// ── Schemas de validação ─────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  senha: z.string().min(1, 'Senha obrigatória'),
})

const recuperarSenhaSchema = z.object({
  email: z.string().email(),
})

const redefinirSenhaSchema = z.object({
  token:    z.string().uuid('Token inválido'),
  novaSenha: z.string().min(8),
})

const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha:  z.string().min(8),
})

// ── Helper de erro ───────────────────────────────────────────────────

function handleAuthError(err: unknown, reply: FastifyReply) {
  if (err instanceof AuthError) {
    return reply.status(err.statusCode).send({ error: 'AuthError', message: err.message })
  }
  if (err instanceof z.ZodError) {
    return reply.status(400).send({ error: 'ValidationError', issues: err.errors })
  }
  throw err  // deixar o handler global pegar
}

// ── Rotas ────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {

  // POST /api/v1/auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },  // 10 tentativas/min por IP
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(req.body)
      const result = await realizarLogin(
        { ...body, ip: req.ip, userAgent: req.headers['user-agent'] },
        (payload, opts) => app.jwt.sign(payload as object, opts as any),
      )

      // Salvar refresh token em cookie httpOnly seguro
      reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS)

      return reply.status(200).send({
        accessToken: result.accessToken,
        expiresIn:   result.expiresIn,
        tokenType:   'Bearer',
        usuario:     result.usuario,
      })
    } catch (err) {
      return handleAuthError(err, reply)
    }
  })

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const refreshToken = (req.cookies as any)?.[REFRESH_COOKIE]
      if (!refreshToken) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Sessão expirada' })
      }

      const result = await renovarTokens(
        refreshToken,
        req.ip,
        req.headers['user-agent'],
        (payload, opts) => app.jwt.sign(payload as object, opts as any),
      )

      return reply.status(200).send(result)
    } catch (err) {
      // Limpar cookie inválido
      reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
      return handleAuthError(err, reply)
    }
  })

  // POST /api/v1/auth/logout
  app.post('/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = (req.cookies as any)?.[REFRESH_COOKIE]
    const userId = (req as any).user?.id

    if (refreshToken && userId) {
      await realizarLogout(refreshToken, userId, req.ip).catch(() => {})
    }

    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
    return reply.status(200).send({ message: 'Logout realizado com sucesso' })
  })

  // POST /api/v1/auth/recuperar-senha
  app.post('/recuperar-senha', {
    config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = recuperarSenhaSchema.parse(req.body)
      const token = await solicitarRecuperacaoSenha(email, req.ip)

      // Em produção: enviar por e-mail
      // Por ora: retornar no response apenas em DEV
      const response: Record<string, unknown> = {
        message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
      }
      if (process.env.NODE_ENV !== 'production' && token) {
        response._devToken = token   // Apenas em desenvolvimento!
      }

      return reply.status(200).send(response)
    } catch (err) {
      return handleAuthError(err, reply)
    }
  })

  // POST /api/v1/auth/redefinir-senha
  app.post('/redefinir-senha', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, novaSenha } = redefinirSenhaSchema.parse(req.body)

      const { valida, erros } = validarForcaSenha(novaSenha)
      if (!valida) {
        return reply.status(400).send({ error: 'SenhaFraca', erros })
      }

      await concluirRecuperacaoSenha(token, novaSenha, req.ip)
      return reply.status(200).send({ message: 'Senha redefinida com sucesso. Faça login novamente.' })
    } catch (err) {
      return handleAuthError(err, reply)
    }
  })

  // POST /api/v1/auth/trocar-senha  (requer login)
  app.post('/trocar-senha', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!(req as any).user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    try {
      const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body)

      const { valida, erros } = validarForcaSenha(novaSenha)
      if (!valida) {
        return reply.status(400).send({ error: 'SenhaFraca', erros })
      }

      await trocarSenha((req as any).user.id, senhaAtual, novaSenha, req.ip)
      return reply.status(200).send({ message: 'Senha alterada com sucesso.' })
    } catch (err) {
      return handleAuthError(err, reply)
    }
  })

  // GET /api/v1/auth/me  (perfil do usuário logado)
  app.get('/me', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!(req as any).user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    return reply.status(200).send({ usuario: (req as any).user })
  })

  // GET /api/v1/auth/sessoes  (listar sessões ativas)
  app.get('/sessoes', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!(req as any).user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const sessoes = await prisma.sessaoAuth.findMany({
      where: {
        credencial: { usuarioId: (req as any).user.id },
        ativo: true,
        expiraEm: { gt: new Date() },
      },
      select: { id: true, ip: true, userAgent: true, criadoEm: true, ultimoUsoEm: true },
      orderBy: { ultimoUsoEm: 'desc' },
    })
    return reply.status(200).send({ sessoes })
  })

  // DELETE /api/v1/auth/sessoes/:id  (revogar sessão específica)
  app.delete('/sessoes/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!(req as any).user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const { id } = req.params as { id: string }
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.sessaoAuth.updateMany({
      where: {
        id,
        credencial: { usuarioId: (req as any).user.id },
      },
      data: { ativo: false },
    })
    return reply.status(200).send({ message: 'Sessão revogada' })
  })
}
