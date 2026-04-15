'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, Calendar, GitBranch, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type TipoResultado = 'proposicao' | 'sessao' | 'documento'

interface ResultadoBusca {
  id: string
  tipo: TipoResultado
  titulo: string
  subtitulo: string
  numero?: string
  href: string
  status?: string
}

const RESULTADOS_MOCK: ResultadoBusca[] = [
  { id: 'p1', tipo: 'proposicao', titulo: 'Programa Municipal de Incentivo à Energia Solar',  subtitulo: 'Em Comissão · Ver. Marcos Oliveira', numero: 'PL-024/2024',  href: '/proposicoes/p1', status: 'EM_COMISSAO' },
  { id: 'p2', tipo: 'proposicao', titulo: 'Requerimento sobre Contrato 12/2023',               subtitulo: 'Protocolado · Ver. Sandra Costa',    numero: 'REQ-031/2024', href: '/proposicoes/p2', status: 'PROTOCOLADO' },
  { id: 'p3', tipo: 'proposicao', titulo: 'Moção de apoio à Regularização Fundiária',          subtitulo: 'Em Pauta · Ver. João Ferreira',      numero: 'MOC-008/2024', href: '/proposicoes/p3', status: 'EM_PAUTA' },
  { id: 'p4', tipo: 'proposicao', titulo: 'Programa de combate ao desperdício de alimentos',   subtitulo: 'Aprovado · Ver. Ana Lima',           numero: 'PL-019/2024',  href: '/proposicoes/p4', status: 'APROVADO' },
  { id: 's1', tipo: 'sessao',     titulo: 'Sessão Ordinária 012/2024',                         subtitulo: '25/04/2024 · 19h00 · Agendada',      href: '/sessoes/s1' },
  { id: 'd1', tipo: 'documento',  titulo: 'Parecer Jurídico PAR-JUR-2024-0087',               subtitulo: 'PL-024/2024 · Aprovado',             href: '/proposicoes/p1/documentos' },
]

const BUSCAS_RECENTES = ['PL-024/2024', 'PL-019/2024', 'Sessão 012']

const TIPO_ICONE: Record<TipoResultado, React.ElementType> = {
  proposicao: FileText,
  sessao:     Calendar,
  documento:  GitBranch,
}

const TIPO_ICON_CLASS: Record<TipoResultado, string> = {
  proposicao: 'bg-brand-blue-soft text-brand-blue',
  sessao:     'bg-brand-green-soft text-brand-green',
  documento:  'bg-brand-purple-soft text-brand-purple',
}

const STATUS_TEXT_CLASS: Record<string, string> = {
  EM_COMISSAO: 'text-brand-purple',
  PROTOCOLADO: 'text-brand-blue',
  EM_PAUTA:    'text-brand-amber',
  APROVADO:    'text-brand-green',
  REJEITADO:   'text-brand-red',
}

interface BuscaGlobalProps {
  aberta: boolean
  onFechar: () => void
}

export function BuscaGlobal({ aberta, onFechar }: BuscaGlobalProps) {
  const [query, setQuery] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const resultados = query.length >= 2
    ? RESULTADOS_MOCK.filter(r =>
        r.titulo.toLowerCase().includes(query.toLowerCase()) ||
        r.numero?.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitulo.toLowerCase().includes(query.toLowerCase())
      )
    : []

  useEffect(() => {
    if (aberta) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelecionado(0)
    }
  }, [aberta])

  const navegar = useCallback((href: string) => {
    router.push(href)
    onFechar()
  }, [router, onFechar])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!aberta) return
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowDown') setSelecionado(s => Math.min(s + 1, resultados.length - 1))
      if (e.key === 'ArrowUp')   setSelecionado(s => Math.max(s - 1, 0))
      if (e.key === 'Enter' && resultados[selecionado]) navegar(resultados[selecionado].href)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aberta, resultados, selecionado, onFechar, navegar])

  if (!aberta) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-surface-1 border border-line-2 rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Search size={16} className="text-fg-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelecionado(0) }}
            placeholder="Buscar proposição, sessão, documento..."
            className="flex-1 bg-transparent text-[14px] text-fg-1 placeholder:text-fg-3 outline-none"
          />
          <kbd className="text-[10px] bg-surface-2 border border-line rounded px-1.5 py-0.5 text-fg-3">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-3">
              <div className="text-[10px] font-semibold text-fg-3 uppercase tracking-wider px-2 mb-2">
                Buscas recentes
              </div>
              {BUSCAS_RECENTES.map((r, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-2 transition-colors"
                  onClick={() => setQuery(r)}
                >
                  <Clock size={13} className="text-fg-3" />
                  <span className="text-[13px] text-fg-2">{r}</span>
                </button>
              ))}
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-10 text-center text-fg-3 text-[13px]">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <div className="p-2">
              {resultados.map((r, i) => {
                const Icon = TIPO_ICONE[r.tipo]
                const isSelected = i === selecionado
                return (
                  <button
                    key={r.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                      isSelected ? 'bg-brand-blue-active' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => navegar(r.href)}
                    onMouseEnter={() => setSelecionado(i)}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${TIPO_ICON_CLASS[r.tipo]}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.numero && (
                          <span className="font-mono text-[11px] text-brand-blue flex-shrink-0">{r.numero}</span>
                        )}
                        <span className="text-[13px] text-fg-1 truncate">{r.titulo}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-fg-3 truncate">{r.subtitulo}</span>
                        {r.status && (
                          <span className={`text-[10px] font-medium ${STATUS_TEXT_CLASS[r.status] ?? 'text-fg-2'}`}>
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <span className="text-[10px] text-fg-3 flex-shrink-0">↵</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-line flex items-center gap-4 text-[10px] text-fg-3">
          <span><kbd className="bg-surface-2 border border-line rounded px-1 py-0.5">↑↓</kbd> navegar</span>
          <span><kbd className="bg-surface-2 border border-line rounded px-1 py-0.5">↵</kbd> abrir</span>
          <span><kbd className="bg-surface-2 border border-line rounded px-1 py-0.5">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
