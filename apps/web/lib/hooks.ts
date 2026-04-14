import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import {
  proposicoesApi,
  sessoesApi,
  documentosApi,
  adminApi,
  notificacoesApi,
  type Proposicao,
  type TramitacaoEvento,
  type PaginatedResponse,
} from './api'

// ── Query Keys ─────────────────────────────────────────────────────
export const queryKeys = {
  proposicoes: {
    all: ['proposicoes'] as const,
    list: (params?: Record<string, string | number>) =>
      ['proposicoes', 'list', params] as const,
    detail: (id: string) => ['proposicoes', 'detail', id] as const,
    historico: (id: string) => ['proposicoes', 'historico', id] as const,
  },
  sessoes: {
    all: ['sessoes'] as const,
    list: (params?: Record<string, string>) => ['sessoes', 'list', params] as const,
    detail: (id: string) => ['sessoes', 'detail', id] as const,
  },
  documentos: {
    byProposicao: (proposicaoId: string) =>
      ['documentos', 'proposicao', proposicaoId] as const,
  },
  notificacoes: {
    list: (params?: Record<string, string>) => ['notificacoes', params] as const,
  },
  admin: {
    tiposMateria: ['admin', 'tipos-materia'] as const,
    orgaos: ['admin', 'orgaos'] as const,
    fluxos: ['admin', 'fluxos'] as const,
    regras: ['admin', 'regras'] as const,
    usuarios: ['admin', 'usuarios'] as const,
  },
}

// ── Proposições ────────────────────────────────────────────────────

export function useProposicoes(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: queryKeys.proposicoes.list(params),
    queryFn: () => proposicoesApi.listar(params),
    staleTime: 30_000,
  })
}

export function useProposicao(id: string) {
  return useQuery({
    queryKey: queryKeys.proposicoes.detail(id),
    queryFn: () => proposicoesApi.buscarPorId(id),
    enabled: !!id,
  })
}

export function useHistoricoTramitacao(proposicaoId: string) {
  return useQuery({
    queryKey: queryKeys.proposicoes.historico(proposicaoId),
    queryFn: () => proposicoesApi.historico(proposicaoId),
    enabled: !!proposicaoId,
    staleTime: 10_000,
    refetchInterval: 30_000, // Atualiza a cada 30s para acompanhar ao vivo
  })
}

export function useCriarProposicao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => proposicoesApi.criar(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.all })
    },
  })
}

export function useProtocolar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proposicoesApi.protocolar(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.historico(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.all })
    },
  })
}

export function useEncaminhar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      orgaoDestinoId,
      observacao,
    }: {
      id: string
      orgaoDestinoId: string
      observacao: string
    }) => proposicoesApi.encaminhar(id, orgaoDestinoId, observacao),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.historico(id) })
    },
  })
}

export function useDevolver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      proposicoesApi.devolver(id, motivo),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.historico(id) })
    },
  })
}

export function useArquivar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      proposicoesApi.arquivar(id, motivo),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.historico(id) })
      qc.invalidateQueries({ queryKey: queryKeys.proposicoes.all })
    },
  })
}

// ── Sessões ────────────────────────────────────────────────────────

export function useSessoes(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.sessoes.list(params),
    queryFn: () => sessoesApi.listar(params),
    staleTime: 30_000,
  })
}

export function useSessao(id: string) {
  return useQuery({
    queryKey: queryKeys.sessoes.detail(id),
    queryFn: () => sessoesApi.buscarPorId(id),
    enabled: !!id,
  })
}

export function useCriarSessao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => sessoesApi.criar(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessoes.all })
    },
  })
}

export function useVotar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessaoId,
      proposicaoId,
      votos,
    }: {
      sessaoId: string
      proposicaoId: string
      votos: Array<{ vereadorId: string; voto: string }>
    }) => sessoesApi.votar(sessaoId, proposicaoId, votos),
    onSuccess: (_, { sessaoId, proposicaoId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessoes.detail(sessaoId) })
      qc.invalidateQueries({
        queryKey: queryKeys.proposicoes.detail(proposicaoId),
      })
    },
  })
}

// ── Documentos ────────────────────────────────────────────────────

export function useDocumentos(proposicaoId: string) {
  return useQuery({
    queryKey: queryKeys.documentos.byProposicao(proposicaoId),
    queryFn: () => documentosApi.listar(proposicaoId),
    enabled: !!proposicaoId,
  })
}

export function useUploadDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => documentosApi.upload(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
    },
  })
}

// ── Notificações ───────────────────────────────────────────────────

export function useNotificacoes(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.notificacoes.list(params),
    queryFn: () => notificacoesApi.listar(params),
    refetchInterval: 60_000, // Atualiza a cada minuto
  })
}

export function useMarcarLida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificacoesApi.marcarLida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
}

// ── Admin ──────────────────────────────────────────────────────────

export function useTiposMateria() {
  return useQuery({
    queryKey: queryKeys.admin.tiposMateria,
    queryFn: adminApi.tiposMateria,
    staleTime: 5 * 60_000, // 5 min — dados raramente mudam
  })
}

export function useOrgaos() {
  return useQuery({
    queryKey: queryKeys.admin.orgaos,
    queryFn: adminApi.orgaos,
    staleTime: 5 * 60_000,
  })
}

export function useFluxos() {
  return useQuery({
    queryKey: queryKeys.admin.fluxos,
    queryFn: adminApi.fluxos,
  })
}

export function useRegras() {
  return useQuery({
    queryKey: queryKeys.admin.regras,
    queryFn: adminApi.regras,
  })
}
