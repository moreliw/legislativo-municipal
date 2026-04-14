import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../../plugins/auth'
import { camundaService } from '../processos/camunda.service'
import { readFileSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export async function adminRoutes(app: FastifyInstance) {

  // ── TIPOS DE MATÉRIA ───────────────────────────────────────────────
  app.get('/tipos-materia', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      return prisma.tipoMateria.findMany({
        where: { casaId: req.user.casaId, ativo: true },
        orderBy: { nome: 'asc' },
      })
    },
  )

  app.post('/tipos-materia', {
    preHandler: [requireAuth, requirePermission('admin:tipos-materia')],
  }, async (req: FastifyRequest, reply) => {
    const body = z.object({
      nome: z.string(),
      sigla: z.string().max(10),
      prefixoNumero: z.string().max(10),
      descricao: z.string().optional(),
      exigeParecerJuridico: z.boolean().default(false),
      exigeComissao: z.boolean().default(true),
      prazoTramitacao: z.number().optional(),
    }).parse(req.body)

    const tipo = await prisma.tipoMateria.create({
      data: { ...body, casaId: req.user.casaId },
    })
    return reply.status(201).send(tipo)
  })

  // ── FLUXOS DE PROCESSO ─────────────────────────────────────────────
  app.get('/fluxos', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      return prisma.fluxoProcesso.findMany({
        include: { tipoMateria: { select: { nome: true, sigla: true } } },
        orderBy: { criadoEm: 'desc' },
      })
    },
  )

  app.post('/fluxos', {
    preHandler: [requireAuth, requirePermission('admin:fluxos')],
  }, async (req: FastifyRequest, reply) => {
    const body = z.object({
      nome: z.string(),
      tipoMateriaId: z.string().optional(),
      descricao: z.string().optional(),
      bpmnXml: z.string(),
    }).parse(req.body)

    const fluxo = await prisma.fluxoProcesso.create({
      data: { ...body, status: 'RASCUNHO' },
    })
    return reply.status(201).send(fluxo)
  })

  // Deploy de um fluxo para o Camunda
  app.post('/fluxos/:id/deploy', {
    preHandler: [requireAuth, requirePermission('admin:fluxos')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const fluxo = await prisma.fluxoProcesso.findUnique({ where: { id: req.params.id } })
    if (!fluxo) return reply.status(404).send({ error: 'Fluxo não encontrado' })

    const deploy = await camundaService.deployProcess(fluxo.nome, fluxo.bpmnXml)

    await prisma.fluxoProcesso.update({
      where: { id: fluxo.id },
      data: {
        camundaKey: deploy.id,
        camundaVersion: 1,
        status: 'ATIVO',
        publicadoEm: new Date(),
      },
    })

    return { deploy, fluxoId: fluxo.id }
  })

  // Buscar BPMN padrão (template)
  app.get('/fluxos/template/basico', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      const bpmnPath = path.resolve(
        process.cwd(),
        '../../infra/camunda/bpmn/tramitacao_proposicao_basica.bpmn',
      )
      try {
        const xml = readFileSync(bpmnPath, 'utf-8')
        return { xml }
      } catch {
        return reply.status(404).send({ error: 'Template não encontrado' })
      }
    },
  )

  // ── REGRAS ────────────────────────────────────────────────────────
  app.get('/regras', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      return prisma.regra.findMany({
        where: { ativo: true },
        include: { tipoMateria: { select: { nome: true, sigla: true } } },
        orderBy: [{ prioridade: 'desc' }, { criadoEm: 'desc' }],
      })
    },
  )

  app.post('/regras', {
    preHandler: [requireAuth, requirePermission('admin:regras')],
  }, async (req: FastifyRequest, reply) => {
    const body = z.object({
      nome: z.string(),
      descricao: z.string().optional(),
      tipo: z.enum(['ROTEAMENTO', 'VALIDACAO', 'PRAZO', 'NOTIFICACAO', 'BLOQUEIO', 'QUORUM']),
      tipoMateriaId: z.string().optional(),
      condicoes: z.record(z.unknown()),
      acoes: z.record(z.unknown()),
      prioridade: z.number().default(0),
    }).parse(req.body)

    const regra = await prisma.regra.create({ data: body })
    return reply.status(201).send(regra)
  })

  app.patch('/regras/:id', {
    preHandler: [requireAuth, requirePermission('admin:regras')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const regra = await prisma.regra.update({
      where: { id: req.params.id },
      data: { ...(req.body as object), versao: { increment: 1 } },
    })
    return regra
  })

  // ── USUÁRIOS ──────────────────────────────────────────────────────
  app.get('/usuarios', {
    preHandler: [requireAuth, requirePermission('admin:usuarios')],
  }, async (req: FastifyRequest, reply) => {
    return prisma.usuario.findMany({
      where: { casaId: req.user.casaId },
      include: {
        orgaos: { include: { orgao: { select: { nome: true, sigla: true } } } },
        perfis: { include: { perfil: { select: { nome: true } } } },
      },
      orderBy: { nome: 'asc' },
    })
  })

  app.patch('/usuarios/:id/perfis', {
    preHandler: [requireAuth, requirePermission('admin:usuarios')],
  }, async (req: FastifyRequest<{ Params: { id: string }; Body: { perfis: string[] } }>, reply) => {
    const { perfis } = req.body as { perfis: string[] }

    // Remover perfis atuais e adicionar novos
    await prisma.usuarioPerfil.deleteMany({ where: { usuarioId: req.params.id } })

    const perfisEncontrados = await prisma.perfil.findMany({ where: { nome: { in: perfis } } })

    await prisma.usuarioPerfil.createMany({
      data: perfisEncontrados.map(p => ({ usuarioId: req.params.id, perfilId: p.id })),
    })

    return { ok: true, perfis: perfisEncontrados.map(p => p.nome) }
  })

  // ── ÓRGÃOS ────────────────────────────────────────────────────────
  app.get('/orgaos', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      return prisma.orgao.findMany({
        where: { casaId: req.user.casaId, ativo: true },
        include: { _count: { select: { usuarios: true } } },
        orderBy: { nome: 'asc' },
      })
    },
  )

  // ── CONFIGURAÇÕES DA CASA ─────────────────────────────────────────
  app.get('/configuracoes', { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply) => {
      return prisma.casaLegislativa.findUnique({
        where: { id: req.user.casaId },
        select: { nome: true, sigla: true, municipio: true, uf: true, configuracoes: true },
      })
    },
  )

  app.patch('/configuracoes', {
    preHandler: [requireAuth, requirePermission('admin:configuracoes')],
  }, async (req: FastifyRequest, reply) => {
    const casa = await prisma.casaLegislativa.update({
      where: { id: req.user.casaId },
      data: req.body as object,
    })
    return casa
  })

  // ── NUMERAÇÃO AUTOMÁTICA ──────────────────────────────────────────
  app.get('/numeracao/:prefixo', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Params: { prefixo: string } }>, reply) => {
      const { gerarNumero } = await import('./numeracao.service')
      // Preview do próximo número sem reservar
      const ano = new Date().getFullYear()
      const ultimo = await prisma.proposicao.findFirst({
        where: { numero: { startsWith: `${req.params.prefixo}-` }, ano },
        orderBy: { numero: 'desc' },
      })
      const proximoSeq = ultimo
        ? parseInt(ultimo.numero.split('-')[1]) + 1
        : 1
      return { proximo: `${req.params.prefixo}-${String(proximoSeq).padStart(3, '0')}/${ano}` }
    },
  )

  // ── PROCESSOS CAMUNDA ─────────────────────────────────────────────
  app.get('/processos/definicoes', {
    preHandler: [requireAuth, requirePermission('admin:processos')],
  }, async (req: FastifyRequest, reply) => {
    return camundaService.listProcessDefinitions()
  })

  // ── CALENDÁRIO ────────────────────────────────────────────────────
  app.get('/calendario', { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Querystring: { mes?: string; ano?: string } }>, reply) => {
      const ano = parseInt(req.query.ano || String(new Date().getFullYear()))
      const mes = req.query.mes ? parseInt(req.query.mes) : undefined

      const inicio = new Date(ano, (mes ?? 1) - 1, 1)
      const fim = mes
        ? new Date(ano, mes, 0)
        : new Date(ano, 11, 31)

      return prisma.calendarioLegislativo.findMany({
        where: { casaId: req.user.casaId, data: { gte: inicio, lte: fim } },
        orderBy: { data: 'asc' },
      })
    },
  )

  app.post('/calendario', {
    preHandler: [requireAuth, requirePermission('admin:calendario')],
  }, async (req: FastifyRequest, reply) => {
    const body = z.object({
      data: z.string(),
      tipo: z.enum(['FERIADO_NACIONAL', 'FERIADO_MUNICIPAL', 'RECESSO', 'SESSAO_AGENDADA', 'EVENTO_ESPECIAL']),
      descricao: z.string().optional(),
      impactoTramitacao: z.boolean().default(false),
    }).parse(req.body)

    const item = await prisma.calendarioLegislativo.create({
      data: { ...body, data: new Date(body.data), casaId: req.user.casaId },
    })
    return reply.status(201).send(item)
  })
}
