import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })

  // Inject JWT from localStorage on every request
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Handle 401: redirect to login once, no retry loop
  let isRedirecting = false
  client.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status
      if (status === 401 && typeof window !== 'undefined' && !isRedirecting) {
        isRedirecting = true
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    },
  )

  return client
}

export const api = createApiClient()

// ── Tipagem das entidades ──────────────────────────────────────────

export type StatusProposicao =
  | 'RASCUNHO' | 'EM_ELABORACAO' | 'PROTOCOLADO' | 'EM_ANALISE'
  | 'EM_COMISSAO' | 'AGUARDANDO_PARECER_JURIDICO' | 'EM_PAUTA'
  | 'EM_VOTACAO' | 'APROVADO' | 'REJEITADO' | 'DEVOLVIDO'
  | 'PUBLICADO' | 'ARQUIVADO' | 'SUSPENSO' | 'RETIRADO'

export type TipoEventoTramitacao =
  | 'PROTOCOLO' | 'DISTRIBUICAO' | 'ENCAMINHAMENTO' | 'DESPACHO'
  | 'PARECER_JURIDICO' | 'PARECER_COMISSAO' | 'INCLUSAO_PAUTA'
  | 'SESSAO_LEITURA' | 'VOTACAO' | 'APROVACAO' | 'REJEICAO'
  | 'DEVOLUCAO' | 'SUSPENSAO' | 'REATIVACAO' | 'REDACAO_FINAL'
  | 'ASSINATURA' | 'PUBLICACAO' | 'ARQUIVAMENTO' | 'REABERTURA'
  | 'ANEXACAO' | 'RETIFICACAO'

export interface Proposicao {
  id: string
  numero: string
  ano: number
  ementa: string
  status: StatusProposicao
  regime: string
  origem: string
  prioridade: string
  palavrasChave: string[]
  assunto?: string
  protocoladoEm?: string
  criadoEm: string
  atualizadoEm: string
  tipoMateria: { nome: string; sigla: string }
  autor?: { nome: string; cargo?: string; avatar?: string }
  orgaoDestino?: { nome: string; sigla: string }
}

export interface TramitacaoEvento {
  id: string
  sequencia: number
  tipo: TipoEventoTramitacao
  descricao: string
  statusAntes?: StatusProposicao
  statusDepois?: StatusProposicao
  criadoEm: string
  observacao?: string
  usuario?: { id: string; nome: string; cargo?: string; avatar?: string }
  orgaoOrigem?: { id: string; nome: string; sigla: string }
  dadosAdicionais?: Record<string, unknown>
  documentosGerados?: Array<{
    documento: { id: string; nome: string; tipo: string }
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

// ── Funções de API ─────────────────────────────────────────────────

export const proposicoesApi = {
  listar: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Proposicao>>('/proposicoes', { params }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Proposicao>(`/proposicoes/${id}`).then(r => r.data),

  criar: (body: Record<string, unknown>) =>
    api.post<Proposicao>('/proposicoes', body).then(r => r.data),

  protocolar: (id: string) =>
    api.post(`/proposicoes/${id}/protocolar`).then(r => r.data),

  encaminhar: (id: string, orgaoDestinoId: string, observacao: string) =>
    api.post(`/proposicoes/${id}/encaminhar`, { orgaoDestinoId, observacao }).then(r => r.data),

  devolver: (id: string, motivo: string) =>
    api.post(`/proposicoes/${id}/devolver`, { motivo }).then(r => r.data),

  arquivar: (id: string, motivo: string) =>
    api.post(`/proposicoes/${id}/arquivar`, { motivo }).then(r => r.data),

  historico: (id: string) =>
    api.get<TramitacaoEvento[]>(`/proposicoes/${id}/historico`).then(r => r.data),
}

export const sessoesApi = {
  listar: (params?: Record<string, string>) =>
    api.get('/sessoes', { params }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get(`/sessoes/${id}`).then(r => r.data),

  criar: (body: Record<string, unknown>) =>
    api.post('/sessoes', body).then(r => r.data),

  adicionarPauta: (id: string, proposicaoId: string, tipo: string) =>
    api.post(`/sessoes/${id}/pauta`, { proposicaoId, tipo }).then(r => r.data),

  registrarPresencas: (id: string, presencas: Array<{ vereadorId: string; presente: boolean }>) =>
    api.post(`/sessoes/${id}/presencas`, { presencas }).then(r => r.data),

  votar: (id: string, proposicaoId: string, votos: Array<{ vereadorId: string; voto: string }>) =>
    api.post(`/sessoes/${id}/votar`, { proposicaoId, votos }).then(r => r.data),

  abrir: (id: string) =>
    api.post(`/sessoes/${id}/abrir`).then(r => r.data),

  encerrar: (id: string, ata?: string) =>
    api.post(`/sessoes/${id}/encerrar`, { ata }).then(r => r.data),
}

export const documentosApi = {
  listar: (proposicaoId: string) =>
    api.get(`/documentos/proposicao/${proposicaoId}`).then(r => r.data),

  upload: (formData: FormData) =>
    api.post('/documentos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  download: (id: string) =>
    api.get<{ url: string }>(`/documentos/${id}/download`).then(r => r.data),

  assinar: (id: string, tipo: string, observacao?: string) =>
    api.post(`/documentos/${id}/assinar`, { tipo, observacao }).then(r => r.data),
}

export const adminApi = {
  tiposMateria: () => api.get('/admin/tipos-materia').then(r => r.data),
  orgaos: () => api.get('/admin/orgaos').then(r => r.data),
  fluxos: () => api.get('/admin/fluxos').then(r => r.data),
  regras: () => api.get('/admin/regras').then(r => r.data),
  usuarios: () => api.get('/admin/usuarios').then(r => r.data),
  configuracoes: () => api.get('/admin/configuracoes').then(r => r.data),
}

export const notificacoesApi = {
  listar: (params?: Record<string, string>) =>
    api.get('/notificacoes', { params }).then(r => r.data),

  marcarLida: (id: string) =>
    api.patch(`/notificacoes/${id}/lida`).then(r => r.data),

  marcarTodasLidas: () =>
    api.patch('/notificacoes/todas/lidas').then(r => r.data),
}
