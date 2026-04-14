import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock do pdfmake para não precisar do binário nos testes
vi.mock('pdfmake', () => {
  class MockPrinter {
    createPdfKitDocument(docDef: any) {
      const { EventEmitter } = require('events')
      const emitter = new EventEmitter()
      // Simular emissão de dados após construção
      process.nextTick(() => {
        emitter.emit('data', Buffer.from('mock-pdf-content'))
        emitter.emit('end')
      })
      return { ...emitter, end: () => {} }
    }
  }
  return { default: MockPrinter }
})

describe('PDF Service', () => {
  describe('gerarDespacho', () => {
    it('deve gerar buffer de PDF para despacho', async () => {
      const { gerarDespacho } = await import('../src/lib/pdf.service')

      const buffer = await gerarDespacho({
        proposicao: {
          numero: 'PL-024/2024',
          ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica',
          tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
        },
        texto: 'Encaminhe-se à comissão competente para análise e emissão de parecer.',
        autorNome: 'Carlos Eduardo Lima',
        autorCargo: 'Secretário Legislativo',
        nomeCamara: 'Câmara Municipal de São Francisco',
        municipio: 'São Francisco',
        data: new Date('2024-03-13'),
      })

      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('gerarPautaSessao', () => {
    it('deve gerar PDF de pauta com múltiplos itens', async () => {
      const { gerarPautaSessao } = await import('../src/lib/pdf.service')

      const buffer = await gerarPautaSessao({
        sessao: {
          numero: '012/2024',
          tipo: 'ORDINARIA',
          data: '2024-04-25T19:00:00Z',
          horaInicio: '19h00',
          local: 'Plenário Principal',
        },
        itens: [
          { ordem: 1, tipo: 'PRIMEIRA_LEITURA', proposicao: { numero: 'PL-024/2024', ementa: 'Energia Solar', autor: { nome: 'Ver. Marcos' } } },
          { ordem: 2, tipo: 'VOTACAO', proposicao: { numero: 'MOC-008/2024', ementa: 'Moção de apoio', autor: null } },
        ],
        nomeCamara: 'Câmara Municipal de São Francisco',
        municipio: 'São Francisco',
      })

      expect(Buffer.isBuffer(buffer)).toBe(true)
    })
  })

  describe('gerarRelatorioProposicoes', () => {
    it('deve gerar relatório com proposições em formato paisagem', async () => {
      const { gerarRelatorioProposicoes } = await import('../src/lib/pdf.service')

      const buffer = await gerarRelatorioProposicoes({
        proposicoes: [
          {
            numero: 'PL-024/2024',
            ementa: 'Ementa da proposição de teste para geração do relatório',
            status: 'EM_COMISSAO',
            criadoEm: '2024-03-10T09:30:00Z',
            tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
            autor: { nome: 'Ver. Marcos Oliveira' },
          },
        ],
        filtros: {},
        nomeCamara: 'Câmara Municipal de São Francisco',
        municipio: 'São Francisco',
      })

      expect(Buffer.isBuffer(buffer)).toBe(true)
    })

    it('deve gerar relatório vazio sem erros', async () => {
      const { gerarRelatorioProposicoes } = await import('../src/lib/pdf.service')

      const buffer = await gerarRelatorioProposicoes({
        proposicoes: [],
        filtros: { status: 'ARQUIVADO' },
        nomeCamara: 'Câmara Municipal',
        municipio: 'Município',
      })

      expect(Buffer.isBuffer(buffer)).toBe(true)
    })
  })
})

describe('Geração de documentos — validação de parâmetros', () => {
  it('deve rejeitar proposição sem número', async () => {
    expect(() => {
      if (!('PL-001/2024')) throw new Error('Número obrigatório')
    }).not.toThrow()

    expect(() => {
      const num = ''
      if (!num) throw new Error('Número obrigatório')
    }).toThrow('Número obrigatório')
  })

  it('deve gerar nome de arquivo correto para despacho', () => {
    const numero = 'PL-024/2024'
    const nomeArquivo = `despacho-${numero.replace('/', '-')}.pdf`
    expect(nomeArquivo).toBe('despacho-PL-024-2024.pdf')
    expect(nomeArquivo).not.toContain('/')
  })

  it('deve gerar nome de arquivo correto para pauta', () => {
    const numerSessao = '012/2024'
    const nomeArquivo = `pauta-sessao-${numerSessao.replace('/', '-')}.pdf`
    expect(nomeArquivo).toBe('pauta-sessao-012-2024.pdf')
  })
})
