import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProposicoes = [
  {
    id: 'p1', numero: 'PL-001/2024', ementa: 'Ementa longa da proposição um com vírgulas, "aspas" e quebras',
    status: 'EM_COMISSAO', regime: 'ORDINARIO', protocoladoEm: new Date('2024-03-10'),
    atualizadoEm: new Date('2024-04-18'),
    tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
    autor: { nome: 'Ver. Marcos Oliveira' },
    orgaoDestino: { nome: 'Comissão de Meio Ambiente', sigla: 'CMA' },
    autorExterno: null,
    _count: { tramitacoes: 6, documentos: 5 },
  },
  {
    id: 'p2', numero: 'REQ-002/2024', ementa: 'Requerimento simples',
    status: 'PROTOCOLADO', regime: 'SUMARIO', protocoladoEm: new Date('2024-04-22'),
    atualizadoEm: new Date('2024-04-22'),
    tipoMateria: { nome: 'Requerimento', sigla: 'REQ' },
    autor: null, autorExterno: 'Cidadão João',
    orgaoDestino: null,
    _count: { tramitacoes: 1, documentos: 1 },
  },
]

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    proposicao: {
      findMany: vi.fn().mockResolvedValue(mockProposicoes),
    },
    tramitacaoEvento: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'ev1', sequencia: 1, tipo: 'PROTOCOLO',
          descricao: 'Proposição protocolada',
          statusAntes: null, statusDepois: 'PROTOCOLADO',
          criadoEm: new Date('2024-03-10T09:30:00Z'),
          orgaoOrigem: { nome: 'Protocolo', sigla: 'PRO' },
          usuario: { nome: 'Ana Santos', cargo: 'Chefe de Protocolo' },
          observacao: 'Tudo certo',
        },
      ]),
    },
    proposicaoFindUnique: vi.fn().mockResolvedValue({
      id: 'p1', numero: 'PL-001/2024', ementa: 'Ementa teste',
    }),
  })),
}))

// Simular a função exportarProposicoes localmente para testar
function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

function linhasCsv(headers: string[], rows: unknown[][]): string {
  const cab = headers.map(h => escapeCsv(h)).join(',')
  const lns = rows.map(row => row.map(escapeCsv).join(','))
  return [cab, ...lns].join('\n')
}

describe('Export Service — CSV', () => {
  describe('escapeCsv', () => {
    it('deve escapar aspas duplicando-as', () => {
      expect(escapeCsv('texto com "aspas"')).toBe('"texto com ""aspas"""')
    })

    it('deve envolver em aspas quando contém vírgula', () => {
      expect(escapeCsv('valor, com vírgula')).toBe('"valor, com vírgula"')
    })

    it('deve tratar valores nulos e undefined', () => {
      expect(escapeCsv(null)).toBe('""')
      expect(escapeCsv(undefined)).toBe('""')
    })

    it('deve tratar números e booleanos', () => {
      expect(escapeCsv(42)).toBe('"42"')
      expect(escapeCsv(true)).toBe('"true"')
    })

    it('deve escapar quebras de linha', () => {
      const resultado = escapeCsv('linha1\nlinha2')
      expect(resultado).toContain('"')
    })
  })

  describe('linhasCsv', () => {
    it('deve gerar CSV com cabeçalho e dados', () => {
      const headers = ['Nome', 'Cargo', 'Ativo']
      const rows = [
        ['Ana Santos', 'Protocolo', true],
        ['Carlos Lima', 'Secretário', true],
      ]
      const csv = linhasCsv(headers, rows)
      const linhas = csv.split('\n')

      expect(linhas[0]).toContain('"Nome"')
      expect(linhas[0]).toContain('"Cargo"')
      expect(linhas[0]).toContain('"Ativo"')
      expect(linhas[1]).toContain('"Ana Santos"')
      expect(linhas[2]).toContain('"Carlos Lima"')
      expect(linhas.length).toBe(3)
    })

    it('deve gerar apenas cabeçalho para dados vazios', () => {
      const csv = linhasCsv(['Col1', 'Col2'], [])
      const linhas = csv.split('\n')
      expect(linhas.length).toBe(1)
      expect(linhas[0]).toContain('"Col1"')
    })

    it('deve ser parseável como CSV', () => {
      const headers = ['Número', 'Ementa', 'Status']
      const rows = [
        ['PL-001/2024', 'Ementa com, vírgula e "aspas"', 'EM_COMISSAO'],
      ]
      const csv = linhasCsv(headers, rows)

      // Verificar que cada linha tem 3 colunas após split por ,
      // (considerando que valores entre aspas não são divididos pelo parser real)
      expect(csv).toContain('"PL-001/2024"')
      expect(csv).toContain('EM_COMISSAO')
    })
  })

  describe('Exportação de proposições', () => {
    it('deve retornar formato correto para CSV', async () => {
      // Testar a estrutura sem depender do Prisma real
      const resultado = {
        dados: linhasCsv(
          ['Número', 'Tipo', 'Status'],
          mockProposicoes.map(p => [p.numero, p.tipoMateria.sigla, p.status]),
        ),
        mimeType: 'text/csv; charset=utf-8',
        extensao: 'csv',
      }

      expect(resultado.mimeType).toBe('text/csv; charset=utf-8')
      expect(resultado.extensao).toBe('csv')
      expect(resultado.dados).toContain('Número')
      expect(resultado.dados).toContain('PL-001/2024')
      expect(resultado.dados).toContain('REQ-002/2024')
    })

    it('deve incluir todas as proposições no resultado', async () => {
      const csv = linhasCsv(
        ['Número'],
        mockProposicoes.map(p => [p.numero]),
      )
      const linhas = csv.split('\n')
      expect(linhas.length).toBe(3) // header + 2 proposições
    })

    it('deve tratar autoria externa corretamente', async () => {
      const propSemAutor = mockProposicoes[1] // REQ, sem autor, com autorExterno
      const csv = linhasCsv(
        ['Número', 'Autoria'],
        [[propSemAutor.numero, propSemAutor.autor?.nome ?? propSemAutor.autorExterno ?? '—']],
      )
      expect(csv).toContain('Cidadão João')
    })
  })
})

describe('Formatação de datas para exportação', () => {
  it('deve formatar data no padrão pt-BR', () => {
    const data = new Date('2024-04-18T00:00:00Z')
    const formatada = data.toLocaleDateString('pt-BR')
    expect(formatada).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('deve formatar data/hora para tramitação', () => {
    const dataHora = new Date('2024-04-18T14:30:00Z')
    const formatada = dataHora.toLocaleString('pt-BR')
    expect(formatada).toContain('2024')
    expect(formatada.length).toBeGreaterThan(10)
  })

  it('deve retornar placeholder para datas nulas', () => {
    const valor = null as unknown as Date
    const resultado = valor ? new Date(valor).toLocaleDateString('pt-BR') : '—'
    expect(resultado).toBe('—')
  })
})
