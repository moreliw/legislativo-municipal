import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()

// Guard: apenas superadmin
function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const user = (req as any).user
  if (!user) return reply.status(401).send({ error: 'Unauthorized' })
  if (user.casaId !== 'sistema' && !user.permissoes.includes('sistema:*')) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito ao superadministrador' })
  }
  done()
}

const criarCasaSchema = z.object({
  nome:         z.string().min(5, 'Nome muito curto'),
  sigla:        z.string().min(2).max(10).toUpperCase(),
  cnpj:         z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  municipio:    z.string().min(3),
  uf:           z.string().length(2).toUpperCase(),
  email:        z.string().email().optional(),
  telefone:     z.string().optional(),
  site:         z.string().url().optional().or(z.literal('')),
  totalVereadores: z.number().int().min(7).max(55).default(9),
  // Credenciais do admin inicial da câmara
  adminNome:    z.string().min(3),
  adminEmail:   z.string().email(),
  adminSenha:   z.string().min(8),
})

export async function sistemaRoutes(app: FastifyInstance) {

  // GET /api/v1/sistema/casas — listar todas as câmaras
  app.get('/casas', { preHandler: requireSuperAdmin }, async (req: FastifyRequest) => {
    const casas = await prisma.casaLegislativa.findMany({
      where: { sigla: { not: 'SISTEMA' } },
      include: {
        _count: { select: { usuarios: true, sessoes: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
    const casaIds = casas.map(c => c.id)
    const proposicoesPorCasa = casaIds.length > 0
      ? await prisma.proposicao.groupBy({
        by: ['casaId'],
        where: { casaId: { in: casaIds } },
        _count: { _all: true },
      })
      : []
    const mapProposicoes = new Map(proposicoesPorCasa.map(item => [item.casaId, item._count._all]))

    return casas.map(casa => ({
      ...casa,
      _count: {
        ...casa._count,
        proposicoes: mapProposicoes.get(casa.id) ?? 0,
      },
    }))
  })

  // GET /api/v1/sistema/casas/:id — detalhe de uma câmara
  app.get('/casas/:id', { preHandler: requireSuperAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const casa = await prisma.casaLegislativa.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true, sessoes: true } },
        usuarios: {
          take: 10,
          select: { id: true, nome: true, email: true, cargo: true, ativo: true, criadoEm: true },
          orderBy: { criadoEm: 'asc' },
        },
      },
    })
    if (!casa) return reply.status(404).send({ error: 'Câmara não encontrada' })
    const totalProposicoes = await prisma.proposicao.count({ where: { casaId: id } })
    return {
      ...casa,
      _count: {
        ...casa._count,
        proposicoes: totalProposicoes,
      },
    }
  })

  // POST /api/v1/sistema/casas — criar nova câmara com estrutura completa
  app.post('/casas', { preHandler: requireSuperAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = criarCasaSchema.parse(req.body)

      // Verificar duplicatas
      const existente = await prisma.casaLegislativa.findFirst({
        where: { OR: [{ sigla: body.sigla }, { cnpj: body.cnpj }] }
      })
      if (existente) {
        return reply.status(409).send({
          error: 'Conflict',
          message: existente.sigla === body.sigla
            ? `Sigla ${body.sigla} já está em uso`
            : `CNPJ ${body.cnpj} já cadastrado`
        })
      }

      const quorumSimples = Math.floor(body.totalVereadores / 2) + 1

      // Transação: criar casa + estrutura padrão completa
      const resultado = await prisma.$transaction(async (tx) => {

        // 1. Casa legislativa
        const casa = await tx.casaLegislativa.create({
          data: {
            nome:      body.nome,
            sigla:     body.sigla,
            cnpj:      body.cnpj,
            municipio: body.municipio,
            uf:        body.uf,
            email:     body.email,
            telefone:  body.telefone,
            site:      body.site || null,
            configuracoes: {
              totalVereadores: body.totalVereadores,
              quorumSimples,
              quorumQualificado: Math.ceil(body.totalVereadores * 2 / 3),
              legislatura: `${new Date().getFullYear()}-${new Date().getFullYear() + 3}`,
            },
            ativo: true,
          },
        })

        // 2. Perfis padrão
        const [pAdmin, pSecretario, pVereador, pJuridico, pConsulta] = await Promise.all([
          tx.perfil.create({ data: { casaId: casa.id, nome: 'ADMINISTRADOR',         descricao: 'Acesso total',             permissoes: ['*:*'] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: 'SECRETARIO_LEGISLATIVO', descricao: 'Gestão legislativa',       permissoes: ['proposicoes:ler','proposicoes:criar','proposicoes:editar','tramitacao:ler','tramitacao:criar','sessoes:ler','sessoes:criar','sessoes:editar','documentos:ler','documentos:criar','usuarios:ler','busca:ler','notificacoes:ler','relatorios:ler'] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: 'VEREADOR',              descricao: 'Vereador eleito',           permissoes: ['proposicoes:ler','proposicoes:criar','tramitacao:ler','sessoes:ler','documentos:ler','busca:ler','notificacoes:ler'] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: 'JURIDICO',              descricao: 'Assessoria jurídica',       permissoes: ['proposicoes:ler','tramitacao:ler','tramitacao:criar','documentos:ler','documentos:criar','busca:ler'] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: 'CONSULTA',              descricao: 'Somente leitura',           permissoes: ['proposicoes:ler','sessoes:ler','documentos:ler','busca:ler'] } }),
        ])

        // 3. Órgãos padrão
        await Promise.all([
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Presidência',               sigla: 'PRES',   tipo: 'PRESIDENCIA', ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Secretaria Legislativa',     sigla: 'SEC',    tipo: 'SECRETARIA',  ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Protocolo',                  sigla: 'PROTO',  tipo: 'PROTOCOLO',   ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Assessoria Jurídica',         sigla: 'JUR',    tipo: 'PROCURADORIA',ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Plenário',                    sigla: 'PLN',    tipo: 'PLENARIO',    ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Comissão de Finanças',        sigla: 'CFO',    tipo: 'COMISSAO_PERMANENTE', ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: 'Comissão de Justiça',         sigla: 'CJIP',   tipo: 'COMISSAO_PERMANENTE', ativo: true } }),
        ])

        // 4. Tipos de matéria padrão
        await Promise.all([
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Projeto de Lei',                  sigla: 'PL',   prefixoNumero: 'PL',   exigeParecerJuridico: true,  exigeComissao: true,  prazoTramitacao: 60 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Projeto de Lei Complementar',     sigla: 'PLC',  prefixoNumero: 'PLC',  exigeParecerJuridico: true,  prazoTramitacao: 60 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Emenda à Lei Orgânica',           sigla: 'PELO', prefixoNumero: 'PELO', exigeParecerJuridico: true,  prazoTramitacao: 90 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Decreto Legislativo',             sigla: 'DL',   prefixoNumero: 'DL',   exigeParecerJuridico: true,  prazoTramitacao: 30 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Moção',                           sigla: 'MOC',  prefixoNumero: 'MOC',  exigeComissao: false, prazoTramitacao: 15 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Requerimento',                    sigla: 'REQ',  prefixoNumero: 'REQ',  exigeComissao: false, prazoTramitacao: 10 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: 'Indicação',                       sigla: 'IND',  prefixoNumero: 'IND',  exigeComissao: false, prazoTramitacao: 10 } }),
        ])

        // 5. Admin inicial da câmara
        const senhaHash = await bcrypt.hash(body.adminSenha, 12)
        const adminUser = await tx.usuario.create({
          data: {
            casaId: casa.id,
            nome:   body.adminNome,
            email:  body.adminEmail,
            cargo:  'Administrador',
            ativo:  true,
          },
        })
        await tx.credencialUsuario.create({
          data: { usuarioId: adminUser.id, senhaHash, precisaTrocar: true },
        })
        await tx.usuarioPerfil.create({
          data: { usuarioId: adminUser.id, perfilId: pAdmin.id },
        })

        return { casa, adminUser }
      })

      return reply.status(201).send({
        message: 'Câmara criada com sucesso!',
        casa: {
          id:        resultado.casa.id,
          nome:      resultado.casa.nome,
          sigla:     resultado.casa.sigla,
          municipio: resultado.casa.municipio,
          uf:        resultado.casa.uf,
        },
        adminLogin: {
          email:    body.adminEmail,
          senha:    body.adminSenha,
          aviso:    'Troca de senha obrigatória no primeiro acesso',
        },
        estrutura: {
          perfis:       5,
          orgaos:       7,
          tiposMateria: 7,
        },
      })

    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'ValidationError', issues: err.errors })
      }
      throw err
    }
  })

  // PATCH /api/v1/sistema/casas/:id — ativar/desativar câmara
  app.patch('/casas/:id', { preHandler: requireSuperAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const { ativo } = req.body as { ativo: boolean }
    const casa = await prisma.casaLegislativa.update({
      where: { id },
      data: { ativo },
    })
    return reply.status(200).send({ message: `Câmara ${ativo ? 'ativada' : 'desativada'}`, casa })
  })

  // GET /api/v1/sistema/stats — estatísticas gerais
  app.get('/stats', { preHandler: requireSuperAdmin }, async () => {
    const [totalCasas, totalUsuarios, totalProposicoes, totalSessoes, casasPorUF] = await Promise.all([
      prisma.casaLegislativa.count({ where: { ativo: true, sigla: { not: 'SISTEMA' } } }),
      prisma.usuario.count({ where: { ativo: true, casa: { sigla: { not: 'SISTEMA' } } } }),
      prisma.proposicao.count(),
      prisma.sessaoLegislativa.count(),
      prisma.casaLegislativa.groupBy({
        by: ['uf'],
        where: { ativo: true, sigla: { not: 'SISTEMA' } },
        _count: true,
        orderBy: { _count: { uf: 'desc' } },
      }),
    ])
    return {
      totalCasas,
      totalUsuarios,
      totalProposicoes,
      totalSessoes,
      casasPorUF: casasPorUF.map(c => ({ uf: c.uf, total: c._count })),
    }
  })
}
