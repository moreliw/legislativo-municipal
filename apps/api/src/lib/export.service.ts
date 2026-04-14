/**
 * ExportService — Geração de relatórios em CSV e XLSX
 * Suporta exportação de proposições, tramitações, sessões e auditoria.
 */
import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const prisma = new PrismaClient()

type ExportFormat = 'csv' | 'json'

interface ExportOptions {
  formato: ExportFormat
  casaId: string
  filtros?: {
    status?: string
    tipoMateriaId?: string
    de?: Date
    ate?: Date
    autorId?: string
  }
}

// ── CSV helper ─────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escapar aspas e envolver em aspas se necessário
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

function linhasCsv(headers: string[], rows: unknown[][]): string {
  const cabecalho = headers.map(h => escapeCsv(h)).join(',')
  const linhas = rows.map(row => row.map(escapeCsv).join(','))
  return [cabecalho, ...linhas].join('\n')
}

// ── Exportação de proposições ──────────────────────────────────────

export async function exportarProposicoes(opcoes: ExportOptions): Promise<{ dados: string; mimeType: string; extensao: string }> {
  const where: Record<string, unknown> = { casaId: opcoes.casaId }
  if (opcoes.filtros?.status) where.status = opcoes.filtros.status
  if (opcoes.filtros?.tipoMateriaId) where.tipoMateriaId = opcoes.filtros.tipoMateriaId
  if (opcoes.filtros?.de || opcoes.filtros?.ate) {
    where.criadoEm = {
      ...(opcoes.filtros.de ? { gte: opcoes.filtros.de } : {}),
      ...(opcoes.filtros.ate ? { lte: opcoes.filtros.ate } : {}),
    }
  }

  const proposicoes = await prisma.proposicao.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    include: {
      tipoMateria: { select: { nome: true, sigla: true } },
      autor: { select: { nome: true } },
      orgaoDestino: { select: { nome: true, sigla: true } },
      _count: { select: { tramitacoes: true, documentos: true } },
    },
    take: 10000,
  })

  logger.info({ total: proposicoes.length, formato: opcoes.formato }, 'Exportando proposições')

  if (opcoes.formato === 'json') {
    return {
      dados: JSON.stringify(proposicoes, null, 2),
      mimeType: 'application/json',
      extensao: 'json',
    }
  }

  const headers = [
    'Número', 'Tipo', 'Ementa', 'Autoria', 'Status', 'Regime',
    'Órgão Atual', 'Data Protocolo', 'Última Atualização',
    'Qtd Eventos', 'Qtd Documentos',
  ]

  const rows = proposicoes.map(p => [
    p.numero,
    p.tipoMateria.sigla,
    p.ementa,
    p.autor?.nome ?? p.autorExterno ?? '—',
    p.status.replace(/_/g, ' '),
    p.regime,
    p.orgaoDestino?.sigla ?? '—',
    p.protocoladoEm ? new Date(p.protocoladoEm).toLocaleDateString('pt-BR') : '—',
    new Date(p.atualizadoEm).toLocaleDateString('pt-BR'),
    p._count.tramitacoes,
    p._count.documentos,
  ])

  return {
    dados: linhasCsv(headers, rows),
    mimeType: 'text/csv; charset=utf-8',
    extensao: 'csv',
  }
}

// ── Exportação de tramitação de uma proposição ─────────────────────

export async function exportarTramitacao(proposicaoId: string, formato: ExportFormat): Promise<{ dados: string; mimeType: string; extensao: string }> {
  const [proposicao, eventos] = await Promise.all([
    prisma.proposicao.findUnique({
      where: { id: proposicaoId },
      select: { numero: true, ementa: true },
    }),
    prisma.tramitacaoEvento.findMany({
      where: { proposicaoId },
      orderBy: { sequencia: 'asc' },
      include: {
        usuario: { select: { nome: true, cargo: true } },
        orgaoOrigem: { select: { nome: true, sigla: true } },
      },
    }),
  ])

  if (!proposicao) throw new Error('Proposição não encontrada')

  if (formato === 'json') {
    return {
      dados: JSON.stringify({ proposicao, eventos }, null, 2),
      mimeType: 'application/json',
      extensao: 'json',
    }
  }

  const headers = [
    'Seq', 'Data/Hora', 'Tipo Evento', 'Descrição',
    'Status Antes', 'Status Depois', 'Órgão Origem',
    'Usuário', 'Cargo', 'Observação',
  ]

  const rows = eventos.map(e => [
    e.sequencia,
    new Date(e.criadoEm).toLocaleString('pt-BR'),
    e.tipo.replace(/_/g, ' '),
    e.descricao,
    e.statusAntes ?? '—',
    e.statusDepois ?? '—',
    e.orgaoOrigem?.sigla ?? '—',
    e.usuario?.nome ?? '(sistema)',
    e.usuario?.cargo ?? '—',
    e.observacao ?? '—',
  ])

  return {
    dados: linhasCsv(headers, rows),
    mimeType: 'text/csv; charset=utf-8',
    extensao: 'csv',
  }
}

// ── Exportação de presença em sessões ──────────────────────────────

export async function exportarPresencaSessoes(casaId: string, formato: ExportFormat): Promise<{ dados: string; mimeType: string; extensao: string }> {
  const sessoes = await prisma.sessaoLegislativa.findMany({
    where: { casaId, status: 'ENCERRADA' },
    orderBy: { data: 'desc' },
    take: 50,
    include: {
      presencas: true,
      _count: { select: { pauta: true, votos: true } },
    },
  })

  if (formato === 'json') {
    return {
      dados: JSON.stringify(sessoes, null, 2),
      mimeType: 'application/json',
      extensao: 'json',
    }
  }

  const headers = ['Sessão', 'Tipo', 'Data', 'Presentes', 'Quórum Mínimo', 'Itens Pauta', 'Votações']

  const rows = sessoes.map(s => [
    s.numero,
    s.tipo,
    new Date(s.data).toLocaleDateString('pt-BR'),
    s.presentes ?? s.presencas.filter(p => p.presente).length,
    s.quorumMinimo ?? '—',
    s._count.pauta,
    s._count.votos,
  ])

  return {
    dados: linhasCsv(headers, rows),
    mimeType: 'text/csv; charset=utf-8',
    extensao: 'csv',
  }
}
