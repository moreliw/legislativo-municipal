import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requirePermission, requireAdmin } from '../../plugins/auth'
import { camundaService } from '../processos/camunda.service'
import { readFileSync } from 'fs'
import path from 'path'
import { hashSenha, validarForcaSenha } from '../auth/auth.service'

const prisma = new PrismaClient()

const criarUsuarioSchema = z.object({
  nome: z.string().min(3).max(140),
  email: z.string().email(),
  cargo: z.string().min(2).max(120).optional(),
  senha: z.string().min(8),
  perfilIds: z.array(z.string().cuid()).min(1),
  orgaoIds: z.array(z.string().cuid()).optional().default([]),
  ativo: z.boolean().optional().default(true),
})

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(3).max(140).optional(),
  cargo: z.string().min(2).max(120).nullable().optional(),
  ativo: z.boolean().optional(),
  orgaoIds: z.array(z.string().cuid()).optional(),
})

const atualizarPerfisSchema = z.object({
  perfilIds: z.array(z.string().cuid()).min(1),
})

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
    const processDefinitionKey = deploy.processDefinitionKey ?? fluxo.camundaKey
    const processDefinitionVersion = deploy.processDefinitionVersion ?? fluxo.camundaVersion ?? 1

    if (!processDefinitionKey) {
      return reply.status(502).send({
        error: 'Deploy sem processDefinitionKey retornada pelo Camunda',
      })
    }

    await prisma.fluxoProcesso.update({
      where: { id: fluxo.id },
      data: {
        camundaKey: processDefinitionKey,
        camundaVersion: processDefinitionVersion,
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
    preHandler: [requireAuth, requirePermission('usuarios:ler')],
  }, async (req: FastifyRequest, reply) => {
    return prisma.usuario.findMany({
      where: { casaId: req.user.casaId },
      include: {
        orgaos: { include: { orgao: { select: { id: true, nome: true, sigla: true } } } },
        perfis: { include: { perfil: { select: { id: true, nome: true, descricao: true, permissoes: true } } } },
        credencial: { select: { ultimoLoginEm: true, ultimoLoginIp: true, precisaTrocar: true } },
      },
      orderBy: { nome: 'asc' },
    })
  })

  app.get('/perfis', {
    preHandler: [requireAuth, requirePermission('usuarios:ler')],
  }, async (req: FastifyRequest) => {
    return prisma.perfil.findMany({
      where: { casaId: req.user.casaId },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        descricao: true,
        permissoes: true,
      },
    })
  })

  app.post('/usuarios', {
    preHandler: [requireAuth, requireAdmin],
  }, async (req: FastifyRequest, reply) => {
    const body = criarUsuarioSchema.parse(req.body)

    const { valida, erros } = validarForcaSenha(body.senha)
    if (!valida) {
      return reply.status(400).send({ error: 'SenhaFraca', erros })
    }

    const emailNormalizado = body.email.trim().toLowerCase()
    const existente = await prisma.usuario.findFirst({
      where: {
        casaId: req.user.casaId,
        email: { equals: emailNormalizado, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (existente) {
      return reply.status(409).send({ error: 'Conflict', message: 'Já existe usuário com este e-mail nesta câmara' })
    }

    const [perfis, orgaos] = await Promise.all([
      prisma.perfil.findMany({
        where: { id: { in: body.perfilIds }, casaId: req.user.casaId },
        select: { id: true },
      }),
      body.orgaoIds.length > 0
        ? prisma.orgao.findMany({
          where: { id: { in: body.orgaoIds }, casaId: req.user.casaId, ativo: true },
          select: { id: true },
        })
        : Promise.resolve([]),
    ])

    if (perfis.length !== body.perfilIds.length) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Perfil inválido para esta câmara' })
    }
    if (orgaos.length !== body.orgaoIds.length) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Órgão inválido para esta câmara' })
    }

    const senhaHash = await hashSenha(body.senha)
    const usuario = await prisma.$transaction(async (tx) => {
      const novo = await tx.usuario.create({
        data: {
          casaId: req.user.casaId,
          nome: body.nome,
          email: emailNormalizado,
          cargo: body.cargo ?? null,
          ativo: body.ativo,
        },
      })
      await tx.credencialUsuario.create({
        data: {
          usuarioId: novo.id,
          senhaHash,
          precisaTrocar: true,
        },
      })
      await tx.usuarioPerfil.createMany({
        data: perfis.map((p) => ({ usuarioId: novo.id, perfilId: p.id })),
      })
      if (orgaos.length > 0) {
        await tx.usuarioOrgao.createMany({
          data: orgaos.map((o, idx) => ({
            usuarioId: novo.id,
            orgaoId: o.id,
            principal: idx === 0,
          })),
        })
      }
      return novo
    })

    return reply.status(201).send({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      ativo: usuario.ativo,
      message: 'Usuário criado com sucesso',
    })
  })

  app.patch('/usuarios/:id', {
    preHandler: [requireAuth, requireAdmin],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const body = atualizarUsuarioSchema.parse(req.body)
    const usuarioId = req.params.id

    const alvo = await prisma.usuario.findFirst({
      where: { id: usuarioId, casaId: req.user.casaId },
      select: { id: true, ativo: true },
    })
    if (!alvo) return reply.status(404).send({ error: 'NotFound', message: 'Usuário não encontrado' })

    if (usuarioId === req.user.id && body.ativo === false) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Não é permitido desativar o próprio usuário' })
    }

    if (body.orgaoIds) {
      const orgaos = await prisma.orgao.findMany({
        where: { id: { in: body.orgaoIds }, casaId: req.user.casaId, ativo: true },
        select: { id: true },
      })
      if (orgaos.length !== body.orgaoIds.length) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Órgão inválido para esta câmara' })
      }
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          ...(body.nome ? { nome: body.nome } : {}),
          ...(body.cargo !== undefined ? { cargo: body.cargo } : {}),
          ...(body.ativo !== undefined ? { ativo: body.ativo } : {}),
        },
      })

      if (body.orgaoIds) {
        await tx.usuarioOrgao.deleteMany({ where: { usuarioId } })
        if (body.orgaoIds.length > 0) {
          await tx.usuarioOrgao.createMany({
            data: body.orgaoIds.map((orgaoId, idx) => ({
              usuarioId,
              orgaoId,
              principal: idx === 0,
            })),
          })
        }
      }
      return usuario
    })

    return reply.status(200).send({ id: atualizado.id, ativo: atualizado.ativo, nome: atualizado.nome })
  })

  app.patch('/usuarios/:id/perfis', {
    preHandler: [requireAuth, requireAdmin],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { perfilIds } = atualizarPerfisSchema.parse(req.body)
    const usuarioId = req.params.id

    const alvo = await prisma.usuario.findFirst({
      where: { id: usuarioId, casaId: req.user.casaId },
      select: { id: true },
    })
    if (!alvo) return reply.status(404).send({ error: 'NotFound', message: 'Usuário não encontrado' })

    const perfisEncontrados = await prisma.perfil.findMany({
      where: { id: { in: perfilIds }, casaId: req.user.casaId },
      select: { id: true, nome: true },
    })
    if (perfisEncontrados.length !== perfilIds.length) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Perfil inválido para esta câmara' })
    }

    if (usuarioId === req.user.id) {
      const manterAdmin = perfisEncontrados.some((p) => p.nome === 'ADMINISTRADOR')
      if (!manterAdmin) {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Não é permitido remover o próprio perfil de administrador',
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.usuarioPerfil.deleteMany({ where: { usuarioId } })
      await tx.usuarioPerfil.createMany({
        data: perfisEncontrados.map((p) => ({ usuarioId, perfilId: p.id })),
      })
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
