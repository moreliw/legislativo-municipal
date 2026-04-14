/**
 * PDFService — Geração de documentos PDF para o sistema legislativo
 *
 * Usa pdfmake para geração server-side de PDFs formatados.
 * Suporta: pareceres, despachos, atas, convocações, pautas, relatórios.
 */

import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import { PassThrough } from 'stream'
import type { Proposicao, SessaoLegislativa } from '@legislativo/types'

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
}

const printer = new PdfPrinter(fonts)

// ── Estilos base ───────────────────────────────────────────────────
const estilosBase = {
  cabecalho: { fontSize: 10, bold: false, color: '#444444' },
  titulo: { fontSize: 14, bold: true, alignment: 'center' as const, margin: [0, 12, 0, 4] },
  subtitulo: { fontSize: 11, bold: true, margin: [0, 8, 0, 4] },
  corpo: { fontSize: 10, lineHeight: 1.5 },
  rodape: { fontSize: 8, color: '#888888', alignment: 'center' as const },
  destaque: { fontSize: 10, bold: true, color: '#1e4d8c' },
  label: { fontSize: 9, color: '#666666', bold: true },
  valor: { fontSize: 10 },
}

function cabecalhoCamara(nomeCamara: string, municipio: string): Content[] {
  return [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: nomeCamara.toUpperCase(), style: 'titulo', fontSize: 13 },
            { text: municipio, alignment: 'center', fontSize: 10, color: '#555555' },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1e4d8c' }] },
    { text: '', margin: [0, 0, 0, 12] },
  ]
}

function rodapePadrao(pagina: number, totalPaginas: number, geradoEm: string): Content {
  return {
    columns: [
      { text: `Gerado em: ${geradoEm}`, style: 'rodape', alignment: 'left' },
      { text: `Página ${pagina} de ${totalPaginas}`, style: 'rodape', alignment: 'right' },
    ],
    margin: [0, 8, 0, 0],
  }
}

// ── PDF: Despacho ─────────────────────────────────────────────────

export async function gerarDespacho(params: {
  proposicao: Pick<Proposicao, 'numero' | 'ementa' | 'tipoMateria'>
  texto: string
  autorNome: string
  autorCargo: string
  nomeCamara: string
  municipio: string
  data: Date
}): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 60],
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: estilosBase,

    header: (currentPage, pageCount) => ({
      stack: cabecalhoCamara(params.nomeCamara, params.municipio),
      margin: [60, 30, 60, 0],
    }),

    footer: (currentPage, pageCount) => ({
      ...rodapePadrao(currentPage, pageCount, params.data.toLocaleDateString('pt-BR')),
      margin: [60, 0, 60, 20],
    }),

    content: [
      { text: 'DESPACHO', style: 'titulo' },
      { text: '', margin: [0, 8] },

      {
        table: {
          widths: [100, '*'],
          body: [
            [
              { text: 'Proposição:', style: 'label', border: [false, false, false, false] },
              { text: params.proposicao.numero, style: 'destaque', border: [false, false, false, false] },
            ],
            [
              { text: 'Tipo:', style: 'label', border: [false, false, false, false] },
              { text: params.proposicao.tipoMateria.nome, style: 'valor', border: [false, false, false, false] },
            ],
            [
              { text: 'Ementa:', style: 'label', border: [false, false, false, false] },
              { text: params.proposicao.ementa, style: 'valor', border: [false, false, false, false] },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16],
      },

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 395, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }] },
      { text: '', margin: [0, 8] },

      { text: params.texto, style: 'corpo', alignment: 'justify' },

      { text: '', margin: [0, 32] },

      {
        stack: [
          { text: '_'.repeat(50), alignment: 'center', margin: [0, 0, 0, 4] },
          { text: params.autorNome, bold: true, alignment: 'center' },
          { text: params.autorCargo, alignment: 'center', color: '#555555', fontSize: 9 },
          { text: params.municipio + ', ' + params.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 0] },
        ],
      },
    ],
  }

  return bufferFromDoc(docDefinition)
}

// ── PDF: Pauta de Sessão ──────────────────────────────────────────

export async function gerarPautaSessao(params: {
  sessao: Pick<SessaoLegislativa, 'numero' | 'tipo' | 'data' | 'horaInicio' | 'local'>
  itens: Array<{
    ordem: number
    tipo: string
    proposicao: { numero: string; ementa: string; autor?: { nome: string } | null }
  }>
  nomeCamara: string
  municipio: string
}): Promise<Buffer> {
  const tipoSessao: Record<string, string> = {
    ORDINARIA: 'Ordinária', EXTRAORDINARIA: 'Extraordinária',
    ESPECIAL: 'Especial', SOLENE: 'Solene',
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 60],
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: estilosBase,

    header: () => ({ stack: cabecalhoCamara(params.nomeCamara, params.municipio), margin: [60, 30, 60, 0] }),
    footer: (c, t) => ({ ...rodapePadrao(c, t, new Date().toLocaleDateString('pt-BR')), margin: [60, 0, 60, 20] }),

    content: [
      { text: 'PAUTA DE SESSÃO', style: 'titulo' },
      {
        text: `${tipoSessao[params.sessao.tipo] ?? params.sessao.tipo} n.º ${params.sessao.numero}`,
        alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 4],
      },
      {
        text: `${new Date(params.sessao.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · ${params.sessao.horaInicio ?? ''}`,
        alignment: 'center', fontSize: 10, color: '#555555', margin: [0, 0, 0, 4],
      },
      {
        text: params.sessao.local ?? '',
        alignment: 'center', fontSize: 10, color: '#555555', margin: [0, 0, 0, 16],
      },

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 395, y2: 0, lineWidth: 1, lineColor: '#1e4d8c' }] },
      { text: '', margin: [0, 8] },

      { text: 'ORDEM DO DIA', style: 'subtitulo' },
      { text: '', margin: [0, 4] },

      {
        table: {
          widths: [20, 80, '*', 100],
          headerRows: 1,
          body: [
            [
              { text: '#', bold: true, fillColor: '#f0f4f8', fontSize: 9 },
              { text: 'Proposição', bold: true, fillColor: '#f0f4f8', fontSize: 9 },
              { text: 'Ementa', bold: true, fillColor: '#f0f4f8', fontSize: 9 },
              { text: 'Tipo', bold: true, fillColor: '#f0f4f8', fontSize: 9 },
            ],
            ...params.itens.map(item => [
              { text: String(item.ordem), fontSize: 9, alignment: 'center' as const },
              { text: item.proposicao.numero, fontSize: 9, bold: true, color: '#1e4d8c' },
              {
                stack: [
                  { text: item.proposicao.ementa, fontSize: 9 },
                  item.proposicao.autor
                    ? { text: `Autoria: ${item.proposicao.autor.nome}`, fontSize: 8, color: '#777777', margin: [0, 2, 0, 0] }
                    : '',
                ],
              },
              { text: item.tipo.replace(/_/g, ' '), fontSize: 9 },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#dddddd',
          vLineColor: () => '#dddddd',
        },
      },

      { text: '', margin: [0, 24] },
      {
        text: `${params.municipio}, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        alignment: 'right', fontSize: 9, color: '#555555',
      },
    ],
  }

  return bufferFromDoc(docDefinition)
}

// ── PDF: Relatório de Proposições ─────────────────────────────────

export async function gerarRelatorioProposicoes(params: {
  proposicoes: Array<Pick<Proposicao, 'numero' | 'ementa' | 'status' | 'criadoEm' | 'tipoMateria'> & {
    autor?: { nome: string } | null
  }>
  filtros: Record<string, string>
  nomeCamara: string
  municipio: string
}): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [40, 70, 40, 50],
    defaultStyle: { font: 'Helvetica', fontSize: 9 },
    styles: estilosBase,

    header: () => ({ stack: cabecalhoCamara(params.nomeCamara, params.municipio), margin: [40, 20, 40, 0] }),
    footer: (c, t) => ({ ...rodapePadrao(c, t, new Date().toLocaleDateString('pt-BR')), margin: [40, 0, 40, 15] }),

    content: [
      { text: 'RELATÓRIO DE PROPOSIÇÕES', style: 'titulo' },
      {
        text: `Gerado em ${new Date().toLocaleDateString('pt-BR')} · Total: ${params.proposicoes.length} proposições`,
        alignment: 'center', fontSize: 9, color: '#555555', margin: [0, 0, 0, 12],
      },

      {
        table: {
          widths: [70, '*', 80, 80, 60],
          headerRows: 1,
          body: [
            [
              { text: 'Número', bold: true, fillColor: '#1e4d8c', color: 'white', fontSize: 9 },
              { text: 'Ementa', bold: true, fillColor: '#1e4d8c', color: 'white', fontSize: 9 },
              { text: 'Autoria', bold: true, fillColor: '#1e4d8c', color: 'white', fontSize: 9 },
              { text: 'Status', bold: true, fillColor: '#1e4d8c', color: 'white', fontSize: 9 },
              { text: 'Data', bold: true, fillColor: '#1e4d8c', color: 'white', fontSize: 9 },
            ],
            ...params.proposicoes.map((p, i) => [
              { text: p.numero, fontSize: 9, bold: true, color: '#1e4d8c', fillColor: i % 2 === 0 ? '#f9f9f9' : 'white' },
              { text: p.ementa.slice(0, 120) + (p.ementa.length > 120 ? '...' : ''), fontSize: 8, fillColor: i % 2 === 0 ? '#f9f9f9' : 'white' },
              { text: p.autor?.nome ?? '—', fontSize: 8, fillColor: i % 2 === 0 ? '#f9f9f9' : 'white' },
              { text: p.status.replace(/_/g, ' '), fontSize: 8, fillColor: i % 2 === 0 ? '#f9f9f9' : 'white' },
              {
                text: p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : '—',
                fontSize: 8, fillColor: i % 2 === 0 ? '#f9f9f9' : 'white',
              },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#eeeeee',
        },
      },
    ],
  }

  return bufferFromDoc(docDefinition)
}

// ── Helper: stream para Buffer ─────────────────────────────────────

function bufferFromDoc(docDef: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDef)
    const chunks: Buffer[] = []
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', reject)
    pdfDoc.end()
  })
}
