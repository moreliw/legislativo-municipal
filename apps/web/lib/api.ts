import { apiFetch } from './auth'

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

export async function listarProposicoes(
  filtros: ListaProposicoesFiltros = {},
): Promise<ListaProposicoesResponse> {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.append(k, String(v))
  })
  const qs = params.toString()
  return apiFetch<ListaProposicoesResponse>(`/api/v1/proposicoes${qs ? `?${qs}` : ''}`)
}

export async function obterProposicao(id: string): Promise<Proposicao> {
  return apiFetch<Proposicao>(`/api/v1/proposicoes/${id}`)
}

export async function listarSessoes(): Promise<{ data: Sessao[] }> {
  return apiFetch<{ data: Sessao[] }>('/api/v1/sessoes')
}

export async function obterEstatisticas(): Promise<Estatisticas> {
  return apiFetch<Estatisticas>('/api/v1/admin/estatisticas')
}

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

export function formatarData(data: string | Date | null): string {
  if (!data) return '-'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatarDataHora(data: string | Date | null): string {
  if (!data) return '-'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export interface FluxoProcessoResumo {
  id: string
  nome: string
  descricao: string | null
  versao: string
  status: 'RASCUNHO' | 'ATIVO' | 'DEPRECIADO' | 'ARQUIVADO'
  camundaKey: string | null
  camundaVersion: number | null
  tipoMateriaId: string | null
  tipoMateria: { id: string; nome: string; sigla: string } | null
  instanciasAtivas: number
  deployed: boolean
  atualizadoEm: string
  publicadoEm: string | null
}

export interface FluxoBpmnDetalhe {
  id: string
  nome: string
  bpmnXml: string
  camundaKey: string | null
  camundaVersion: number | null
  status: string
  atualizadoEm: string
}

export interface InstanciaProcessoResumo {
  id: string
  camundaInstanceId: string | null
  camundaStatus: string | null
  etapaAtual: string | null
  criadoEm: string
  atualizadoEm: string
  proposicao: {
    id: string
    numero: string
    ementa: string
    status: string
  } | null
  tarefas: Array<{
    id: string
    camundaTaskId: string
    nome: string
    tipo: string
    prazo: string | null
    status: string
  }>
}

export interface CamundaDiagnostico {
  platform: 'camunda7'
  baseUrl: string
  restUrl: string
  reachable: boolean
  authConfigured: boolean
  authentication: 'ok' | 'unauthorized' | 'unreachable'
  version: string | null
  error: string | null
}

export interface DeployFluxoResponse {
  ok: boolean
  deploy: {
    deploymentId: string
    deploymentName: string
    deploymentTime: string
    processDefinitionId: string | null
    processDefinitionKey: string | null
    processDefinitionVersion: number | null
    processDefinitionResource: string | null
  }
}

export async function diagnosticoCamunda(): Promise<CamundaDiagnostico> {
  return apiFetch<CamundaDiagnostico>('/api/v1/processos/camunda/diagnostico')
}

export async function listarFluxosBpmn(): Promise<FluxoProcessoResumo[]> {
  return apiFetch<FluxoProcessoResumo[]>('/api/v1/processos/fluxos')
}

export async function obterFluxoBpmn(fluxoId: string): Promise<FluxoBpmnDetalhe> {
  return apiFetch<FluxoBpmnDetalhe>(`/api/v1/processos/fluxos/${fluxoId}/bpmn`)
}

export async function deployFluxoNoCamunda(fluxoId: string): Promise<DeployFluxoResponse> {
  return apiFetch<DeployFluxoResponse>('/api/v1/processos/deploy', {
    method: 'POST',
    body: JSON.stringify({ fluxoId }),
  })
}

export async function iniciarFluxoNoCamunda(input: {
  fluxoId: string
  businessKey: string
  proposicaoId?: string
  variaveis?: Record<string, unknown>
}): Promise<{
  ok: boolean
  processDefinitionKey: string
  instanceId: string
  businessKey: string
  instanciaLocalId: string | null
}> {
  return apiFetch('/api/v1/processos/start', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listarInstanciasFluxo(
  fluxoId: string,
  page = 1,
  status: string = 'ACTIVE',
): Promise<{
  data: InstanciaProcessoResumo[]
  meta: { total: number; page: number; pageSize: number }
}> {
  const params = new URLSearchParams({
    fluxoId,
    page: String(page),
  })
  if (status) params.set('status', status)

  return apiFetch(`/api/v1/processos/instancias?${params.toString()}`)
}
