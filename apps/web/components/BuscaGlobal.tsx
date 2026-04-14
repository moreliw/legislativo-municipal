'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, Calendar, GitBranch, X, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ResultadoBusca {
  id: string
  tipo: 'proposicao' | 'sessao' | 'documento'
  titulo: string
  subtitulo: string
  numero?: string
  href: string
  status?: string
}

const resultadosMock: ResultadoBusca[] = [
  { id: 'p1', tipo: 'proposicao', titulo: 'Programa Municipal de Incentivo à Energia Solar', subtitulo: 'Em Comissão · Ver. Marcos Oliveira', numero: 'PL-024/2024', href: '/proposicoes/p1', status: 'EM_COMISSAO' },
  { id: 'p2', tipo: 'proposicao', titulo: 'Requerimento sobre Contrato 12/2023', subtitulo: 'Protocolado · Ver. Sandra Costa', numero: 'REQ-031/2024', href: '/proposicoes/p2', status: 'PROTOCOLADO' },
  { id: 'p3', tipo: 'proposicao', titulo: 'Moção de apoio à Regularização Fundiária', subtitulo: 'Em Pauta · Ver. João Ferreira', numero: 'MOC-008/2024', href: '/proposicoes/p3', status: 'EM_PAUTA' },
  { id: 'p4', tipo: 'proposicao', titulo: 'Programa de combate ao desperdício de alimentos', subtitulo: 'Aprovado · Ver. Ana Lima', numero: 'PL-019/2024', href: '/proposicoes/p4', status: 'APROVADO' },
  { id: 's1', tipo: 'sessao', titulo: 'Sessão Ordinária 012/2024', subtitulo: '25/04/2024 · 19h00 · Agendada', href: '/sessoes/s1' },
  { id: 'd1', tipo: 'documento', titulo: 'Parecer Jurídico PAR-JUR-2024-0087', subtitulo: 'PL-024/2024 · Aprovado', href: '/proposicoes/p1/documentos' },
]

const recentes = ['PL-024/2024', 'PL-019/2024', 'Sessão 012']

const tipoIcone = {
  proposicao: FileText,
  sessao: Calendar,
  documento: GitBranch,
}

const statusCor: Record<string, string> = {
  EM_COMISSAO: 'text-[#b09de0]',
  PROTOCOLADO: 'text-[#2d7dd2]',
  EM_PAUTA: 'text-[#e8a020]',
  APROVADO: 'text-[#1fa870]',
  REJEITADO: 'text-[#d94040]',
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
    ? resultadosMock.filter(r =>
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
      if (e.key === 'ArrowUp') setSelecionado(s => Math.max(s - 1, 0))
      if (e.key === 'Enter' && resultados[selecionado]) {
        navegar(resultados[selecionado].href)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aberta, resultados, selecionado, onFechar, navegar])

  if (!aberta) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFechar}
      />

      {/* Painel */}
      <div className="relative w-full max-w-xl bg-[#13161f] border border-[#2a3048] rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2333]">
          <Search size={16} className="text-[#5c6282] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelecionado(0) }}
            placeholder="Buscar proposição, sessão, documento..."
            className="flex-1 bg-transparent text-[14px] text-[#e8eaf0] placeholder:text-[#5c6282] outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] bg-[#1c202e] border border-[#2a3048] rounded px-1.5 py-0.5 text-[#5c6282]">Esc</kbd>
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-3">
              <div className="text-[10px] font-semibold text-[#5c6282] uppercase tracking-wider px-2 mb-2">
                Buscas recentes
              </div>
              {recentes.map((r, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#1c202e] transition-colors"
                  onClick={() => setQuery(r)}
                >
                  <Clock size={13} className="text-[#5c6282]" />
                  <span className="text-[13px] text-[#9198b0]">{r}</span>
                </button>
              ))}
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-10 text-center text-[#5c6282] text-[13px]">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <div className="p-2">
              {resultados.map((r, i) => {
                const Icon = tipoIcone[r.tipo]
                const isSelected = i === selecionado
                return (
                  <button
                    key={r.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                      isSelected ? 'bg-[#162d4a]' : 'hover:bg-[#1c202e]'
                    }`}
                    onClick={() => navegar(r.href)}
                    onMouseEnter={() => setSelecionado(i)}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                      r.tipo === 'proposicao' ? 'bg-[#0d1e35]' :
                      r.tipo === 'sessao' ? 'bg-[#0a2318]' : 'bg-[#1a1030]'
                    }`}>
                      <Icon size={13} className={
                        r.tipo === 'proposicao' ? 'text-[#2d7dd2]' :
                        r.tipo === 'sessao' ? 'text-[#1fa870]' : 'text-[#9178e0]'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.numero && (
                          <span className="font-mono text-[11px] text-[#2d7dd2] flex-shrink-0">{r.numero}</span>
                        )}
                        <span className="text-[13px] text-[#e8eaf0] truncate">{r.titulo}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#5c6282] truncate">{r.subtitulo}</span>
                        {r.status && (
                          <span className={`text-[10px] font-medium ${statusCor[r.status] ?? 'text-[#9198b0]'}`}>
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] text-[#5c6282] flex-shrink-0">↵</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1e2333] flex items-center gap-4 text-[10px] text-[#5c6282]">
          <span><kbd className="bg-[#1c202e] border border-[#2a3048] rounded px-1 py-0.5">↑↓</kbd> navegar</span>
          <span><kbd className="bg-[#1c202e] border border-[#2a3048] rounded px-1 py-0.5">↵</kbd> abrir</span>
          <span><kbd className="bg-[#1c202e] border border-[#2a3048] rounded px-1 py-0.5">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
