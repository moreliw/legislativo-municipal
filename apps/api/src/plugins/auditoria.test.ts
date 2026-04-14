import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@prisma/client', () => {
  const logsMock = [
    {
      id: 'log1',
      entidade: 'Proposicao',
      entidadeId: 'p1',
      acao: 'CRIAR',
      criadoEm: new Date('2024-04-01T10:00:00Z'),
      usuario: { nome: 'Carlos Lima', email: 'carlos@test.com', cpf: null },
      usuarioId: 'u1', ip: '127.0.0.1', endpoint: 'POST /proposicoes',
      dadosAntes: null, dadosDepois: { numero: 'PL-001/2024' },
    },
    {
      id: 'log2',
      entidade: 'Proposicao',
      entidadeId: 'p1',
      acao: 'ATUALIZAR',
      criadoEm: new Date('2024-04-02T14:00:00Z'),
      usuario: { nome: 'Ana Santos', email: 'ana@test.com', cpf: null },
      usuarioId: 'u2', ip: '192.168.1.1', endpoint: 'PATCH /proposicoes/p1',
      dadosAntes: { status: 'PROTOCOLADO' }, dadosDepois: { status: 'EM_ANALISE' },
    },
  ]

  return {
    PrismaClient: vi.fn(() => ({
      auditoriaLog: {
        create: vi.fn().mockResolvedValue({ id: 'log_novo' }),
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue(logsMock),
      },
    })),
    AcaoAuditoria: {
      CRIAR: 'CRIAR', LER: 'LER', ATUALIZAR: 'ATUALIZAR',
      EXCLUIR: 'EXCLUIR', ASSINAR: 'ASSINAR', PUBLICAR: 'PUBLICAR',
      ARQUIVAR: 'ARQUIVAR', EXPORTAR: 'EXPORTAR',
    },
  }
})

describe('AuditoriaService', () => {
  let service: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { AuditoriaService } = await import('../src/plugins/auditoria')
    service = new AuditoriaService()
  })

  describe('registrar', () => {
    it('deve registrar log com campos obrigatórios', async () => {
      const resultado = await service.registrar({
        usuarioId: 'u1',
        entidade: 'Proposicao',
        entidadeId: 'p1',
        acao: 'CRIAR',
      })

      expect(resultado).toHaveProperty('id')
    })

    it('deve serializar dadosAntes e dadosDepois como JSON', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()

      await service.registrar({
        entidade: 'Proposicao',
        entidadeId: 'p1',
        acao: 'ATUALIZAR',
        dadosAntes: { status: 'PROTOCOLADO' },
        dadosDepois: { status: 'EM_ANALISE' },
      })

      expect(prisma.auditoriaLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dadosAntes: { status: 'PROTOCOLADO' },
            dadosDepois: { status: 'EM_ANALISE' },
          }),
        }),
      )
    })
  })

  describe('listar', () => {
    it('deve retornar logs paginados', async () => {
      const resultado = await service.listar({
        entidade: 'Proposicao',
        page: 1,
        pageSize: 20,
      })

      expect(resultado).toHaveProperty('data')
      expect(resultado).toHaveProperty('meta')
      expect(Array.isArray(resultado.data)).toBe(true)
      expect(resultado.meta.total).toBe(2)
    })

    it('deve aplicar filtro por entidadeId', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()

      await service.listar({ entidadeId: 'p1' })

      expect(prisma.auditoriaLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entidadeId: 'p1' }),
        }),
      )
    })

    it('deve aplicar filtro de data', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new (PrismaClient as any)()
      const de = new Date('2024-04-01')
      const ate = new Date('2024-04-30')

      await service.listar({ de, ate })

      expect(prisma.auditoriaLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            criadoEm: { gte: de, lte: ate },
          }),
        }),
      )
    })
  })

  describe('exportar', () => {
    it('deve gerar CSV com cabeçalho correto', async () => {
      const csv = await service.exportar({})
      const linhas = csv.split('\n')

      expect(linhas[0]).toBe('id,data,entidade,entidadeId,acao,usuario,email,ip,endpoint')
      expect(linhas.length).toBeGreaterThan(1) // cabeçalho + dados
    })

    it('deve escapar aspas nos valores', async () => {
      const csv = await service.exportar({})
      // Todos os valores devem estar entre aspas
      const linhas = csv.split('\n').slice(1)
      for (const linha of linhas) {
        if (linha.trim()) {
          expect(linha).toMatch(/^".*"$/)
        }
      }
    })
  })
})
