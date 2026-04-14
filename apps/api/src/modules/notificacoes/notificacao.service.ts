import { PrismaClient, TipoNotificacao } from '@prisma/client'
import nodemailer from 'nodemailer'
import { logger } from '../../lib/logger'

const prisma = new PrismaClient()

interface NotificacaoInput {
  tipo: string
  titulo: string
  mensagem: string
  proposicaoId?: string
  acao?: string
}

export class NotificacaoService {
  private mailer: nodemailer.Transporter

  constructor() {
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  }

  /**
   * Notifica um usuário específico
   */
  async notificarUsuario(usuarioId: string, input: NotificacaoInput) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario || !usuario.ativo) return

    // Persistir notificação interna
    const notificacao = await prisma.notificacao.create({
      data: {
        usuarioId,
        proposicaoId: input.proposicaoId,
        tipo: input.tipo as TipoNotificacao,
        titulo: input.titulo,
        mensagem: input.mensagem,
        acao: input.acao,
      },
    })

    // Enviar e-mail
    try {
      await this.mailer.sendMail({
        from: process.env.SMTP_FROM || 'noreply@camaramunicipal.gov.br',
        to: usuario.email,
        subject: `[Câmara Municipal] ${input.titulo}`,
        html: this.gerarHtmlEmail(usuario.nome, input),
      })
    } catch (err) {
      logger.error({ err, usuarioId }, 'Falha ao enviar e-mail de notificação')
    }

    return notificacao
  }

  /**
   * Notifica todos os usuários de um órgão
   */
  async notificarOrgao(orgaoId: string, input: NotificacaoInput) {
    const membros = await prisma.usuarioOrgao.findMany({
      where: { orgaoId },
      include: { usuario: { select: { id: true, ativo: true } } },
    })

    const ativos = membros.filter(m => m.usuario.ativo)

    await Promise.allSettled(
      ativos.map(m => this.notificarUsuario(m.usuarioId, input)),
    )
  }

  /**
   * Notifica usuários com um perfil específico
   */
  async notificarPorPerfil(casaId: string, nomePerfil: string, input: NotificacaoInput) {
    const perfil = await prisma.perfil.findUnique({ where: { nome: nomePerfil } })
    if (!perfil) return

    const usuariosPerfil = await prisma.usuarioPerfil.findMany({
      where: { perfilId: perfil.id },
      include: {
        usuario: { select: { id: true, casaId: true, ativo: true } },
      },
    })

    const alvos = usuariosPerfil.filter(
      up => up.usuario.casaId === casaId && up.usuario.ativo,
    )

    await Promise.allSettled(
      alvos.map(up => this.notificarUsuario(up.usuarioId, input)),
    )
  }

  /**
   * Alerta de prazo vencendo (chamado por job scheduler)
   */
  async alertarPrazos() {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(23, 59, 59)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Tarefas com prazo amanhã
    const tarefasVencendo = await prisma.tarefaProcesso.findMany({
      where: {
        status: 'PENDENTE',
        prazo: { gte: hoje, lte: amanha },
      },
      include: {
        instancia: { include: { proposicao: { select: { numero: true, id: true } } } },
      },
    })

    for (const tarefa of tarefasVencendo) {
      if (tarefa.atribuidoAId) {
        await this.notificarUsuario(tarefa.atribuidoAId, {
          tipo: 'PRAZO_VENCENDO',
          titulo: `Prazo vencendo — ${tarefa.nome}`,
          mensagem: `A tarefa "${tarefa.nome}" referente à proposição ${tarefa.instancia.proposicao.numero} vence amanhã.`,
          proposicaoId: tarefa.instancia.proposicaoId,
          acao: `/proposicoes/${tarefa.instancia.proposicaoId}/tramitacao`,
        })
      }

      if (tarefa.atribuidoAOrgaoId) {
        await this.notificarOrgao(tarefa.atribuidoAOrgaoId, {
          tipo: 'PRAZO_VENCENDO',
          titulo: `Prazo vencendo — ${tarefa.nome}`,
          mensagem: `A tarefa "${tarefa.nome}" vence amanhã.`,
          proposicaoId: tarefa.instancia.proposicaoId,
        })
      }
    }

    logger.info(`Alertas de prazo enviados: ${tarefasVencendo.length} tarefas`)
  }

  /**
   * Marcar notificação como lida
   */
  async marcarLida(notificacaoId: string, usuarioId: string) {
    return prisma.notificacao.updateMany({
      where: { id: notificacaoId, usuarioId },
      data: { lida: true, lidaEm: new Date() },
    })
  }

  /**
   * Marcar todas como lidas
   */
  async marcarTodasLidas(usuarioId: string) {
    return prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true, lidaEm: new Date() },
    })
  }

  private gerarHtmlEmail(nome: string, input: NotificacaoInput): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; }
  .header { border-bottom: 3px solid #1e4d8c; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { color: #1e4d8c; font-size: 18px; margin: 0; }
  h2 { color: #333; font-size: 16px; }
  p { color: #555; line-height: 1.6; }
  .btn { display: inline-block; background: #1e4d8c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
</style></head>
<body>
  <div class="card">
    <div class="header">
      <h1>🏛️ Câmara Municipal</h1>
    </div>
    <p>Olá, <strong>${nome}</strong></p>
    <h2>${input.titulo}</h2>
    <p>${input.mensagem}</p>
    ${input.acao
      ? `<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${input.acao}" class="btn">Acessar no Sistema</a>`
      : ''
    }
    <div class="footer">
      Esta é uma notificação automática do Sistema Legislativo Municipal.<br>
      Acesse o sistema para mais detalhes.
    </div>
  </div>
</body>
</html>`
  }
}

// Routes para notificações
import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../plugins/auth'

export async function notificacoesRoutes(app: FastifyInstance) {
  const service = new NotificacaoService()

  app.get('/', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Querystring: { lida?: string; page?: string } }>, reply) => {
      const page = parseInt(req.query.page || '1')
      const pageSize = 20

      const where = {
        usuarioId: req.user.id,
        ...(req.query.lida !== undefined ? { lida: req.query.lida === 'true' } : {}),
      }

      const [total, notificacoes] = await Promise.all([
        prisma.notificacao.count({ where }),
        prisma.notificacao.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            proposicao: { select: { numero: true, ementa: true } },
          },
        }),
      ])

      const naoLidas = await prisma.notificacao.count({
        where: { usuarioId: req.user.id, lida: false },
      })

      return { data: notificacoes, meta: { total, page, pageSize, naoLidas } }
    },
  )

  app.patch('/:id/lida', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      await service.marcarLida(req.params.id, req.user.id)
      return { ok: true }
    },
  )

  app.patch('/todas/lidas', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      await service.marcarTodasLidas(req.user.id)
      return { ok: true }
    },
  )
}
