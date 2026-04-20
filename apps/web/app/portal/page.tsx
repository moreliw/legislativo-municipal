'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, Calendar, Eye, ChevronRight, Clock, AlertCircle } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Proposicao {
  id: string
  numero: string
  ano: number
  ementa: string
  status: string
  origem: string
  regime: string
  criadoEm: string
  protocoladoEm: string | null
  atualizadoEm: string
  tipoMateria: { nome: string; sigla: string }
  autor: { nome: string; cargo: string } | null
  autorExterno: string | null
  _count: { tramitacoes: number; documentos: number }
}

interface Estatisticas {
  ano: number
  total: number
  aprovadas: number
  emTramitacao: number
  publicadas: number
  taxaAprovacao: number
}

const STATUS_LABELS: Record<string, string> = {
  PROTOCOLADO: 'Protocolado',
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_PARECER_JURIDICO: 'Aguard. Parecer',
  EM_COMISSAO: 'Em Comissão',
  EM_PAUTA: 'Em Pauta',
  EM_VOTACAO: 'Em Votação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  PUBLICADO: 'Publicado',
  ARQUIVADO: 'Arquivado',
  DEVOLVIDO: 'Devolvido',
  SUSPENSO: 'Suspenso',
}

const STATUS_COLORS: Record<string, string> = {
  APROVADO: 'bg-emerald-100 text-emerald-700',
  PUBLICADO: 'bg-blue-100 text-blue-700',
  REJEITADO: 'bg-red-100 text-red-700',
  ARQUIVADO: 'bg-gray-100 text-gray-600',
  EM_VOTACAO: 'bg-purple-100 text-purple-700',
  EM_PAUTA: 'bg-yellow-100 text-yellow-700',
  EM_COMISSAO: 'bg-orange-100 text-orange-700',
  PROTOCOLADO: 'bg-cyan-100 text-cyan-700',
  DEVOLVIDO: 'bg-rose-100 text-rose-700',
  SUSPENSO: 'bg-amber-100 text-amber-700',
}

export default function PortalPublicoPage() {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchProposicoes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (busca) params.set('busca', busca)
      if (statusFiltro) params.set('status', statusFiltro)

      const res = await fetch(`${API_BASE}/api/v1/publico/proposicoes?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setProposicoes(json.data)
      setTotal(json.meta.total)
      setTotalPages(json.meta.totalPages)
    } catch {
      setError('Não foi possível carregar as proposições. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [busca, statusFiltro, page])

  const fetchEstatisticas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/publico/estatisticas`)
      if (res.ok) setEstatisticas(await res.json())
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    fetchEstatisticas()
  }, [fetchEstatisticas])

  useEffect(() => {
    const timer = setTimeout(() => fetchProposicoes(), busca ? 400 : 0)
    return () => clearTimeout(timer)
  }, [fetchProposicoes, busca])

  const ano = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-surface-0" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-brand-blue-soft border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-blue flex items-center justify-center">
                <span className="text-white font-bold text-xs">CM</span>
              </div>
              <span className="text-[15px] font-semibold text-fg-1">Câmara Municipal</span>
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5 font-mono">Portal de Transparência Legislativa</div>
          </div>
          <a
            href="/login"
            className="text-[12px] border border-line text-fg-2 hover:text-fg-1 hover:border-line-2 px-3 py-1.5 rounded-md transition-colors"
          >
            Acesso Institucional →
          </a>
        </div>
      </header>

      {/* Hero + busca */}
      <div className="bg-brand-blue-soft border-b border-line py-10">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-[22px] font-semibold text-fg-1 mb-2">
            Acompanhe o que a Câmara decide por você
          </h1>
          <p className="text-[14px] text-fg-2 mb-6">
            Consulte projetos de lei, veja o histórico de tramitação e saiba em que etapa está cada proposição — em tempo real, sem burocracia.
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-lg">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
              <input
                type="text"
                placeholder="Buscar por número, ementa ou assunto..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPage(1) }}
                className="w-full bg-surface-1 border border-line rounded-md pl-9 pr-4 py-2.5 text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <select
              value={statusFiltro}
              onChange={e => { setStatusFiltro(e.target.value); setPage(1) }}
              className="bg-surface-1 border border-line rounded-md px-3 py-2.5 text-[13px] text-fg-1 focus:outline-none focus:border-brand-blue"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        {estatisticas && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: `Total em ${ano}`, value: String(estatisticas.total), icon: FileText },
              { label: 'Em tramitação', value: String(estatisticas.emTramitacao), icon: Clock },
              { label: 'Aprovadas', value: String(estatisticas.aprovadas), icon: Eye },
              { label: 'Taxa de aprovação', value: `${estatisticas.taxaAprovacao}%`, icon: Calendar },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-1 border border-line rounded-lg p-4 flex items-center gap-3">
                <stat.icon size={18} className="text-brand-blue flex-shrink-0" />
                <div>
                  <div className="text-[16px] font-semibold font-mono text-fg-1">{stat.value}</div>
                  <div className="text-[11px] text-fg-3">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-fg-2 uppercase tracking-wider">
              {busca || statusFiltro ? `Resultados (${total})` : 'Proposições Recentes'}
            </h2>
            {total > 0 && (
              <span className="text-[11px] text-fg-3">{total} registros</span>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-1 border border-line rounded-lg p-5 animate-pulse">
                <div className="h-3 bg-surface-2 rounded w-32 mb-3" />
                <div className="h-4 bg-surface-2 rounded w-full mb-2" />
                <div className="h-3 bg-surface-2 rounded w-48" />
              </div>
            ))
          ) : proposicoes.length === 0 ? (
            <div className="text-center py-12 text-fg-3">
              <Search size={24} className="mx-auto mb-3 opacity-40" />
              <div className="text-[13px]">
                {busca ? `Nenhuma proposição encontrada para "${busca}"` : 'Nenhuma proposição disponível'}
              </div>
            </div>
          ) : (
            proposicoes.map(p => {
              const statusLabel = STATUS_LABELS[p.status] || p.status
              const statusColor = STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'
              const autor = p.autor?.nome || p.autorExterno || '—'

              return (
                <a
                  key={p.id}
                  href={`/portal/${p.id}`}
                  className="block bg-surface-1 border border-line rounded-lg p-5 hover:bg-surface-2 hover:border-line-2 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-[12px] font-semibold text-brand-blue">
                          {p.numero}
                        </span>
                        <span className="text-[10px] font-mono bg-surface-0 border border-line text-fg-3 px-2 py-0.5 rounded">
                          {p.tipoMateria.sigla}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[14px] text-fg-1 leading-snug line-clamp-2">
                        {p.ementa}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-fg-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {p.protocoladoEm
                            ? new Date(p.protocoladoEm).toLocaleDateString('pt-BR')
                            : new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                        </span>
                        <span>·</span>
                        <span>{autor}</span>
                        {p._count.tramitacoes > 0 && (
                          <>
                            <span>·</span>
                            <span>{p._count.tramitacoes} movimentações</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                    />
                  </div>
                </a>
              )
            })
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-[12px] border border-line rounded-md text-fg-2 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-[12px] text-fg-3 font-mono">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-[12px] border border-line rounded-md text-fg-2 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-line mt-12 py-6">
        <div className="max-w-5xl mx-auto px-6 text-[11px] text-fg-3 flex items-center justify-between flex-wrap gap-3">
          <span>Câmara Municipal — Sistema Legislativo Municipal</span>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
              ✓ Dados abertos — LAI 12.527/2011
            </span>
            <a href="/login" className="text-fg-3 hover:text-fg-2 transition-colors">Acesso institucional</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
