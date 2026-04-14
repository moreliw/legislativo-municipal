import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { Client as MinioClient } from 'minio'
import { requireAuth, requirePermission } from '../../plugins/auth'

const prisma = new PrismaClient()

// MinIO client
const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'legislativo',
  secretKey: process.env.MINIO_SECRET_KEY || 'legislativo_secret_minio',
})

const BUCKET = process.env.MINIO_BUCKET || 'legislativo-documentos'

export async function documentosRoutes(app: FastifyInstance) {

  // ── UPLOAD ─────────────────────────────────────────────────────
  app.post('/upload', {
    preHandler: [requireAuth, requirePermission('documentos:criar')],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const parts = req.parts()
    let proposicaoId: string | undefined
    let tipo: string = 'OUTROS'
    let nome: string = ''
    let fileBuffer: Buffer | undefined
    let mimeType: string = 'application/octet-stream'
    let fileName: string = 'documento'

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'proposicaoId') proposicaoId = part.value as string
        if (part.fieldname === 'tipo') tipo = part.value as string
        if (part.fieldname === 'nome') nome = part.value as string
      } else {
        mimeType = part.mimetype
        fileName = part.filename || 'documento'
        const chunks: Buffer[] = []
        for await (const chunk of part.file) {
          chunks.push(chunk)
        }
        fileBuffer = Buffer.concat(chunks)
      }
    }

    if (!fileBuffer) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado' })
    }

    // Hash SHA-256 para integridade
    const hash = createHash('sha256').update(fileBuffer).digest('hex')

    // Chave de storage
    const storageKey = `${proposicaoId || 'avulso'}/${Date.now()}-${fileName}`

    // Garantir bucket existe
    const bucketExists = await minio.bucketExists(BUCKET)
    if (!bucketExists) await minio.makeBucket(BUCKET)

    // Upload para MinIO
    await minio.putObject(BUCKET, storageKey, fileBuffer, fileBuffer.length, {
      'Content-Type': mimeType,
      'X-File-Hash': hash,
    })

    // Persistir no banco
    const documento = await prisma.documento.create({
      data: {
        proposicaoId: proposicaoId || null,
        nome: nome || fileName,
        tipo: tipo as any,
        status: 'RASCUNHO',
        storageKey,
        mimeType,
        tamanho: fileBuffer.length,
        hash,
        versaoAtual: 1,
        metadados: { fileName, uploadedBy: req.user.id },
      },
    })

    // Registrar versão 1
    await prisma.versaoDocumento.create({
      data: {
        documentoId: documento.id,
        versao: 1,
        storageKey,
        hash,
        alteracoes: 'Versão inicial',
        criadoPorId: req.user.id,
      },
    })

    return reply.status(201).send(documento)
  })

  // ── DOWNLOAD ────────────────────────────────────────────────────
  app.get('/:id/download', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string }; Querystring: { versao?: string } }>, reply) => {
    const documento = await prisma.documento.findUnique({ where: { id: req.params.id } })
    if (!documento) return reply.status(404).send({ error: 'Documento não encontrado' })

    let storageKey = documento.storageKey!

    // Versão específica?
    if (req.query.versao) {
      const versao = await prisma.versaoDocumento.findUnique({
        where: { documentoId_versao: { documentoId: documento.id, versao: parseInt(req.query.versao) } },
      })
      if (!versao) return reply.status(404).send({ error: 'Versão não encontrada' })
      storageKey = versao.storageKey
    }

    // Gerar URL pré-assinada (1 hora)
    const url = await minio.presignedGetObject(BUCKET, storageKey, 3600)

    await req.auditoria.registrar({
      entidade: 'Documento',
      entidadeId: documento.id,
      acao: 'LER',
    })

    return { url, expiresIn: 3600 }
  })

  // ── LISTAR POR PROPOSIÇÃO ────────────────────────────────────────
  app.get('/proposicao/:proposicaoId', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { proposicaoId: string } }>, reply) => {
    const documentos = await prisma.documento.findMany({
      where: { proposicaoId: req.params.proposicaoId },
      include: {
        versoes: { orderBy: { versao: 'desc' }, take: 3 },
        assinaturas: {
          include: { usuario: { select: { nome: true, cargo: true } } },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })
    return documentos
  })

  // ── NOVA VERSÃO ──────────────────────────────────────────────────
  app.post('/:id/versao', {
    preHandler: [requireAuth, requirePermission('documentos:criar')],
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const documento = await prisma.documento.findUnique({ where: { id: req.params.id } })
    if (!documento) return reply.status(404).send({ error: 'Documento não encontrado' })

    const parts = req.parts()
    let fileBuffer: Buffer | undefined
    let alteracoes = ''

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'alteracoes') {
        alteracoes = part.value as string
      } else if (part.type !== 'field') {
        const chunks: Buffer[] = []
        for await (const chunk of part.file) chunks.push(chunk)
        fileBuffer = Buffer.concat(chunks)
      }
    }

    if (!fileBuffer) return reply.status(400).send({ error: 'Arquivo não enviado' })

    const hash = createHash('sha256').update(fileBuffer).digest('hex')
    const novaVersao = documento.versaoAtual + 1
    const storageKey = `${documento.proposicaoId}/${Date.now()}-v${novaVersao}`

    await minio.putObject(BUCKET, storageKey, fileBuffer)

    const [versao] = await prisma.$transaction([
      prisma.versaoDocumento.create({
        data: { documentoId: documento.id, versao: novaVersao, storageKey, hash, alteracoes, criadoPorId: req.user.id },
      }),
      prisma.documento.update({
        where: { id: documento.id },
        data: { versaoAtual: novaVersao, storageKey, hash },
      }),
    ])

    return reply.status(201).send(versao)
  })

  // ── ASSINAR ──────────────────────────────────────────────────────
  app.post('/:id/assinar', {
    preHandler: [requireAuth],
  }, async (req: FastifyRequest<{ Params: { id: string }; Body: { tipo: string; observacao?: string } }>, reply) => {
    const body = req.body as { tipo: string; observacao?: string }
    const documento = await prisma.documento.findUnique({ where: { id: req.params.id } })
    if (!documento) return reply.status(404).send({ error: 'Documento não encontrado' })

    // Gerar hash de assinatura (simplificado — produção usaria ICP-Brasil ou Gov.br)
    const assinaturaHash = createHash('sha256')
      .update(`${documento.id}-${documento.hash}-${req.user.id}-${Date.now()}`)
      .digest('hex')

    const assinatura = await prisma.assinaturaDocumento.create({
      data: {
        documentoId: documento.id,
        usuarioId: req.user.id,
        tipo: body.tipo as any,
        status: 'ASSINADO',
        hash: assinaturaHash,
        observacao: body.observacao,
        assinadoEm: new Date(),
      },
    })

    await req.auditoria.registrar({
      entidade: 'Documento',
      entidadeId: documento.id,
      acao: 'ASSINAR',
      dadosDepois: { assinaturaId: assinatura.id, tipo: body.tipo },
    })

    return reply.status(201).send(assinatura)
  })

  // ── ALTERAR STATUS ───────────────────────────────────────────────
  app.patch('/:id/status', {
    preHandler: [requireAuth, requirePermission('documentos:editar')],
  }, async (req: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply) => {
    const { status } = req.body as { status: string }
    const doc = await prisma.documento.update({
      where: { id: req.params.id },
      data: { status: status as any },
    })
    return doc
  })
}
