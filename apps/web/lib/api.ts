// lib/api.ts — Cliente completo para a API do backend
import { getToken, apiFetch } from './auth'

export interface Proposicao {
  id: string
  numero: string
  ano: number
  ementa: string
  assunto?: string
  status: string
  origem: string
  regime: string
  protocoladoEm: string | null
  criadoEm: string
  atualizadoEm: string
  tipoMateria: {
    id: string
    nome: string
    sigla: string
  }
  autor: {
    id: string
    nome: string
    cargo: string | null
  }
  orgaoDestino: {
    id: string
    sigla: string
    nome: string
  } | null
  _count?: { eventos: number; documentos: number }
}

export interface ListaProposicoesResponse {
  data: Proposicao[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

export interface ListaProposicoesFiltros {
  page?: number
  pageSize?: number
  status?: string
  tipoMateriaId?: string
  autorId?: string
  orgaoDestinoId?: string
  busca?: string
  orderBy?: 'criadoEm' | 'atualizadoEm' | 'numero'
  order?: 'asc' | 'desc'
}

export interface Sessao {
  id: string
  numero: string
  tipo: string
  data: string
  horaInicio: string | null
  local: string | null
  status: string
  quorumMinimo: number | null
}

export interface Estatisticas {
  totalProposicoes: number
  emTramitacao: number
  aprovadas: number
  sessoesFuturas: number
  proposicoesMes: { mes: string; total: number }[]
  porStatus: { status: string; total: number }[]
}

// ── Proposições ─────────────────────────────────────────────────

export async function listarProposicoes(
  filtros: ListaProposicoesFiltros = {}
): Promise<ListaProposicoesResponse> {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.append(k, String(v))
  })
  const qs = params.toString()
  return apiFetch<ListaProposicoesResponse>(`/api/v1/proposicoes${qs ? '?' + qs : ''}`)
}

export async function obterProposicao(id: string): Promise<Proposicao> {
  return apiFetch<Proposicao>(`/api/v1/proposicoes/${id}`)
}

// ── Sessões ────────────────────────────────────────────────────

export async function listarSessoes(): Promise<{ data: Sessao[] }> {
  return apiFetch<{ data: Sessao[] }>('/api/v1/sessoes')
}

// ── Estatísticas ───────────────────────────────────────────────

export async function obterEstatisticas(): Promise<Estatisticas> {
  return apiFetch<Estatisticas>('/api/v1/admin/estatisticas')
}

// ── Menus dinâmicos ────────────────────────────────────────────

export interface MenusResponse {
  menus: Array<{
    id: string
    codigo: string
    label: string
    href: string
    icon: string
    secao: string | null
    ordem: number
    permissao: string | null
  }>
  isSuperAdmin: boolean
  total: number
  usuario: any
}

export async function obterMenus(): Promise<MenusResponse> {
  return apiFetch<MenusResponse>('/api/v1/menus')
}

// ── Formatters ─────────────────────────────────────────────────

export function formatarData(data: string | Date | null): string {
  if (!data) return '—'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatarDataHora(data: string | Date | null): string {
  if (!data) return '—'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
