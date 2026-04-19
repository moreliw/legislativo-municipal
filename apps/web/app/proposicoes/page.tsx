'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarProposicoes, formatarData, type Proposicao, type ListaProposicoesFiltros } from '@/lib/api'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RASCUNHO:      { label: 'Rascunho',      color: 'var(--text-3)', bg: 'var(--bg-raised)' },
  EM_ELABORACAO: { label: 'Em elaboração', color: 'var(--text-2)', bg: 'var(--bg-raised)' },
  PROTOCOLADO:   { label: 'Protocolado',   color: 'var(--brand)',  bg: 'var(--brand-dim)' },
  EM_ANALISE:    { label: 'Em análise',    color: 'var(--purple)', bg: 'var(--purple-dim)' },
  EM_COMISSAO:   { label: 'Em comissão',   color: 'var(--purple)', bg: 'var(--purple-dim)' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico', color: 'var(--amber)', bg: 'var(--amber-dim)' },
  EM_PAUTA:      { label: 'Em pauta',      color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  EM_VOTACAO:    { label: 'Em votação',    color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  APROVADO:      { label: 'Aprovado',      color: 'var(--green)',  bg: 'var(--green-dim)' },
  REJEITADO:     { label: 'Rejeitado',     color: 'var(--red)',    bg: 'var(--red-dim)' },
  DEVOLVIDO:     { label: 'Devolvido',     color: 'var(--red)',    bg: 'var(--red-dim)' },
  PUBLICADO:     { label: 'Publicado',     color: 'var(--green)',  bg: 'var(--green-dim)' },
  ARQUIVADO:     { label: 'Arquivado',     color: 'var(--text-3)', bg: 'var(--bg-raised)' },
  SUSPENSO:      { label: 'Suspenso',      color: 'var(--red)',    bg: 'var(--red-dim)' },
  RETIRADO:      { label: 'Retirado',      color: 'var(--text-3)', bg: 'var(--bg-raised)' },
}

const FILTROS_STATUS = [
  { label: 'Todos', value: '' },
  { label: 'Em tramitação', value: 'EM_ANALISE' },
  { label: 'Em comissão', value: 'EM_COMISSAO' },
  { label: 'Em pauta',    value: 'EM_PAUTA' },
  { label: 'Aprovados',   value: 'APROVADO' },
  { label: 'Arquivados',  value: 'ARQUIVADO' },
]

export default function ProposicoesPage() {
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [erro, setErro]               = useState('')

  const [busca, setBusca]             = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [page, setPage]               = useState(1)
  const pageSize = 20

  // Debounce na busca
  const [buscaDebounced, setBuscaDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 400)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const filtros: ListaProposicoesFiltros = {
        page,
        pageSize,
        orderBy: 'atualizadoEm',
        order: 'desc',
      }
      if (statusFiltro) filtros.status = statusFiltro
      if (buscaDebounced) filtros.busca = buscaDebounced

      const res = await listarProposicoes(filtros)
      setProposicoes(res.data || [])
      setTotal(res.meta?.total || 0)
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar proposições')
    } finally {
      setLoading(false)
    }
  }, [page, statusFiltro, buscaDebounced])

  useEffect(() => { carregar() }, [carregar])

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="page" style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Proposições
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
            {loading ? 'Carregando...' : `${total} proposição${total !== 1 ? 'ões' : ''} encontrada${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/proposicoes/nova" className="btn btn-primary">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nova Proposição
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 20 }}>
        {/* Busca */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className="input"
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(1) }}
            placeholder="Buscar por número, ementa, autor..."
            style={{ paddingLeft: 40, fontSize: 14 }}
          />
        </div>

        {/* Filtros por status */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTROS_STATUS.map(f => (
            <button
              key={f.value || 'all'}
              onClick={() => { setStatusFiltro(f.value); setPage(1) }}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 7,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: statusFiltro === f.value ? 'var(--brand-dim)' : 'var(--bg-surface)',
                color:      statusFiltro === f.value ? 'var(--brand)'    : 'var(--text-2)',
                border: `1px solid ${statusFiltro === f.value ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                transition: 'all 0.12s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {erro && (
          <div style={{ padding: 16, color: 'var(--red)', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
            ⚠️ {erro}
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Número</th>
              <th>Ementa</th>
              <th style={{ width: 180 }}>Autor</th>
              <th style={{ width: 160 }}>Status</th>
              <th style={{ width: 110 }}>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: '80%' }}/></td>
                  ))}
                </tr>
              ))
            )}

            {!loading && proposicoes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 64, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📋</div>
                  <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 4 }}>
                    Nenhuma proposição encontrada
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {busca || statusFiltro
                      ? 'Tente ajustar os filtros de busca'
                      : 'Comece criando sua primeira proposição'}
                  </div>
                </td>
              </tr>
            )}

            {!loading && proposicoes.map(p => {
              const st = STATUS_CONFIG[p.status] || { label: p.status, color: 'var(--text-3)', bg: 'var(--bg-raised)' }
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/proposicoes/${p.id}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--brand)'
                      }}>
                        {p.numero}
                      </span>
                      {p.regime === 'URGENTE' && (
                        <span className="badge badge-red" style={{ fontSize: 10, padding: '2px 6px' }}>URG</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{
                      fontSize: 14, color: 'var(--text)', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}>
                      {p.ementa}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.autor?.nome || '—'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 99,
                        fontSize: 12, fontWeight: 600,
                        background: st.bg, color: st.color,
                        alignSelf: 'flex-start',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }}/>
                        {st.label}
                      </span>
                      {p.orgaoDestino && (
                        <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', paddingLeft: 2 }}>
                          {p.orgaoDestino.sigla}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    {formatarData(p.atualizadoEm)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginação */}
        {!loading && total > pageSize && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)',
          }}>
            <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px', fontSize: 13, borderRadius: 6,
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  color: page === 1 ? 'var(--text-4)' : 'var(--text-2)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
                }}>← Anterior</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-2)' }}>
                {page} / {totalPaginas}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                disabled={page === totalPaginas}
                style={{
                  padding: '6px 12px', fontSize: 13, borderRadius: 6,
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  color: page === totalPaginas ? 'var(--text-4)' : 'var(--text-2)',
                  cursor: page === totalPaginas ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
                }}>Próximo →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
