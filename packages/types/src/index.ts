// ── Enums de domínio ────────────────────────────────────────────────

export type StatusProposicao =
  | 'RASCUNHO'
  | 'EM_ELABORACAO'
  | 'PROTOCOLADO'
  | 'EM_ANALISE'
  | 'EM_COMISSAO'
  | 'AGUARDANDO_PARECER_JURIDICO'
  | 'EM_PAUTA'
  | 'EM_VOTACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'DEVOLVIDO'
  | 'PUBLICADO'
  | 'ARQUIVADO'
  | 'SUSPENSO'
  | 'RETIRADO'

export type TipoEventoTramitacao =
  | 'PROTOCOLO'
  | 'DISTRIBUICAO'
  | 'ENCAMINHAMENTO'
  | 'DESPACHO'
  | 'PARECER_JURIDICO'
  | 'PARECER_COMISSAO'
  | 'INCLUSAO_PAUTA'
  | 'SESSAO_LEITURA'
  | 'VOTACAO'
  | 'APROVACAO'
  | 'REJEICAO'
  | 'DEVOLUCAO'
  | 'PEDIDO_URGENCIA'
  | 'SUSPENSAO'
  | 'REATIVACAO'
  | 'REDACAO_FINAL'
  | 'ASSINATURA'
  | 'PUBLICACAO'
  | 'ARQUIVAMENTO'
  | 'REABERTURA'
  | 'ANEXACAO'
  | 'RETIFICACAO'
  | 'COMPLEMENTACAO'

export type TipoOrgao =
  | 'PLENARIO'
  | 'COMISSAO_PERMANENTE'
  | 'COMISSAO_ESPECIAL'
  | 'COMISSAO_PARLAMENTAR_INQUERITO'
  | 'MESA_DIRETORA'
  | 'PRESIDENCIA'
  | 'SECRETARIA'
  | 'PROTOCOLO'
  | 'PROCURADORIA'
  | 'CONTROLADORIA'
  | 'PUBLICACAO'

export type OrigemProposicao =
  | 'VEREADOR'
  | 'MESA_DIRETORA'
  | 'COMISSAO'
  | 'PREFEITURA'
  | 'POPULAR'
  | 'EXTERNA'

export type RegimeTramitacao = 'ORDINARIO' | 'URGENTE' | 'URGENCIA_ESPECIAL' | 'SUMARIO'
export type PrioridadeProposicao = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'
export type TipoSessao = 'ORDINARIA' | 'EXTRAORDINARIA' | 'ESPECIAL' | 'SOLENE' | 'SECRETA'
export type StatusSessao = 'AGENDADA' | 'ABERTA' | 'ENCERRADA' | 'CANCELADA' | 'SUSPENSA'
export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE'
export type TipoDocumento =
  | 'TEXTO_PRINCIPAL'
  | 'ANEXO'
  | 'PARECER_JURIDICO'
  | 'PARECER_COMISSAO'
  | 'ATA'
  | 'OFICIO'
  | 'DESPACHO'
  | 'CONVOCACAO'
  | 'PAUTA'
  | 'REDACAO_FINAL'
  | 'PUBLICACAO'
  | 'COMPROVANTE'
  | 'OUTROS'

export type StatusDocumento =
  | 'RASCUNHO'
  | 'REVISAO'
  | 'APROVADO'
  | 'PROTOCOLADO'
  | 'PUBLICADO'
  | 'ARQUIVADO'
  | 'CANCELADO'

export type AcaoAuditoria =
  | 'CRIAR'
  | 'LER'
  | 'ATUALIZAR'
  | 'EXCLUIR'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORTAR'
  | 'IMPRIMIR'
  | 'ASSINAR'
  | 'PUBLICAR'
  | 'ARQUIVAR'

// ── Interfaces ────────────────────────────────────────────────────

export interface OrgaoBasico {
  id: string
  nome: string
  sigla: string
  tipo?: TipoOrgao
}

export interface UsuarioBasico {
  id: string
  nome: string
  cargo?: string
  avatar?: string
}

export interface TipoMateriaBasico {
  id: string
  nome: string
  sigla: string
  prefixoNumero: string
  exigeParecerJuridico: boolean
  exigeComissao: boolean
  prazoTramitacao?: number
}

export interface ProposicaoResumo {
  id: string
  numero: string
  ano: number
  ementa: string
  status: StatusProposicao
  regime: RegimeTramitacao
  origem: OrigemProposicao
  prioridade: PrioridadeProposicao
  palavrasChave: string[]
  assunto?: string
  criadoEm: string
  atualizadoEm: string
  protocoladoEm?: string
  tipoMateria: TipoMateriaBasico
  autor?: UsuarioBasico
  orgaoDestino?: OrgaoBasico
}

export interface TramitacaoEventoCompleto {
  id: string
  sequencia: number
  tipo: TipoEventoTramitacao
  descricao: string
  statusAntes?: StatusProposicao
  statusDepois?: StatusProposicao
  criadoEm: string
  observacao?: string
  dadosAdicionais?: Record<string, unknown>
  camundaTaskId?: string
  usuario?: UsuarioBasico & { email?: string }
  orgaoOrigem?: OrgaoBasico
  documentosGerados?: Array<{
    documento: { id: string; nome: string; tipo: TipoDocumento; status: StatusDocumento }
  }>
}

export interface DocumentoCompleto {
  id: string
  nome: string
  tipo: TipoDocumento
  status: StatusDocumento
  versaoAtual: number
  storageKey?: string
  mimeType?: string
  tamanho?: number
  hash?: string
  publico: boolean
  criadoEm: string
}

export interface SessaoLegislativaCompleta {
  id: string
  numero: string
  tipo: TipoSessao
  data: string
  horaInicio?: string
  horaFim?: string
  local?: string
  status: StatusSessao
  quorumMinimo?: number
  presentes?: number
  ata?: string
}

export interface VotoRegistrado {
  id: string
  sessaoId: string
  proposicaoId: string
  vereadorId: string
  voto: TipoVoto
  justificativa?: string
  criadoEm: string
}

export interface ResultadoVotacao {
  sim: number
  nao: number
  abstencao: number
  ausente: number
  total: number
  aprovado: boolean
}

// ── Respostas da API ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// ── Helpers ────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<StatusProposicao, string> = {
  RASCUNHO: 'Rascunho',
  EM_ELABORACAO: 'Em elaboração',
  PROTOCOLADO: 'Protocolado',
  EM_ANALISE: 'Em análise',
  EM_COMISSAO: 'Em comissão',
  AGUARDANDO_PARECER_JURIDICO: 'Aguardando parecer jurídico',
  EM_PAUTA: 'Em pauta',
  EM_VOTACAO: 'Em votação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  DEVOLVIDO: 'Devolvido',
  PUBLICADO: 'Publicado',
  ARQUIVADO: 'Arquivado',
  SUSPENSO: 'Suspenso',
  RETIRADO: 'Retirado',
}

export const REGIME_LABELS: Record<RegimeTramitacao, string> = {
  ORDINARIO: 'Ordinário',
  URGENTE: 'Urgente',
  URGENCIA_ESPECIAL: 'Urgência Especial',
  SUMARIO: 'Sumário',
}

export const ORIGEM_LABELS: Record<OrigemProposicao, string> = {
  VEREADOR: 'Vereador',
  MESA_DIRETORA: 'Mesa Diretora',
  COMISSAO: 'Comissão',
  PREFEITURA: 'Prefeitura',
  POPULAR: 'Iniciativa Popular',
  EXTERNA: 'Externa',
}
