'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { getStatusStyle } from '@/lib/status-config'

interface Proposicao {
  id: string
  numero: string
  tipo: string
  ementa: string
  autor: string
  status: string
  regime: string
  protocolado: string
  atualizado: string
  orgaoAtual: string | null
}

const PROPOSICOES_MOCK: Proposicao[] = [
  { id: 'p1', numero: 'PL-024/2024',  tipo: 'PL',  ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica e dá outras providências',              autor: 'Ver. Marcos Oliveira', status: 'EM_COMISSAO',                   regime: 'ORDINARIO', protocolado: '10/03/2024', atualizado: '18/04/2024', orgaoAtual: 'CMA' },
  { id: 'p2', numero: 'REQ-031/2024', tipo: 'REQ', ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura Municipal',                       autor: 'Ver. Sandra Costa',   status: 'PROTOCOLADO',                   regime: 'ORDINARIO', protocolado: '22/04/2024', atualizado: '22/04/2024', orgaoAtual: 'PRO' },
  { id: 'p3', numero: 'MOC-008/2024', tipo: 'MOC', ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária do município',                  autor: 'Ver. João Ferreira',  status: 'EM_PAUTA',                      regime: 'ORDINARIO', protocolado: '05/04/2024', atualizado: '24/04/2024', orgaoAtual: 'SEC' },
  { id: 'p4', numero: 'PL-019/2024',  tipo: 'PL',  ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos nos estabelecimentos municipais',     autor: 'Ver. Ana Lima',       status: 'APROVADO',                      regime: 'ORDINARIO', protocolado: '15/02/2024', atualizado: '15/04/2024', orgaoAtual: 'PUB' },
  { id: 'p5', numero: 'PDL-003/2024', tipo: 'PDL', ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes pela contribuição cultural',       autor: 'Mesa Diretora',       status: 'AGUARDANDO_PARECER_JURIDICO',   regime: 'ORDINARIO', protocolado: '01/04/2024', atualizado: '10/04/2024', orgaoAtual: 'PJU' },
  { id: 'p6', numero: 'PL-017/2024',  tipo: 'PL',  ementa: 'Institui o Programa Municipal de Saúde Mental para servidores e dependentes',                       autor: 'Ver. Roberto Alves',  status: 'EM_COMISSAO',                   regime: 'URGENTE',   protocolado: '20/03/2024', atualizado: '12/04/2024', orgaoAtual: 'CMA' },
  { id: 'p7', numero: 'IND-014/2024', tipo: 'IND', ementa: 'Indica ao executivo municipal a revitalização da praça central do bairro Jardim São Paulo',          autor: 'Ver. Patricia Alves', status: 'EM_ANALISE',                    regime: 'ORDINARIO', protocolado: '18/03/2024', atualizado: '08/04/2024', orgaoAtual: 'SEC' },
  { id: 'p8', numero: 'PL-012/2024',  tipo: 'PL',  ementa: 'Dispõe sobre a criação do conselho municipal de cultura e patrimônio histórico',                    autor: 'Ver. Luis Martins',   status: 'REJEITADO',                     regime: 'ORDINARIO', protocolado: '01/02/2024', atualizado: '28/03/2024', orgaoAtual: null },
]

const STATUS_FILTROS = [
  { label: 'Todos',       value: '' },
  { label: 'Em tramitação', value: 'EM_ANALISE' },
  { label: 'Em comissão', value: 'EM_COMISSAO' },
  { label: 'Em pauta',    value: 'EM_PAUTA' },
  { label: 'Aprovados',   value: 'APROVADO' },
  { label: 'Arquivados',  value: 'ARQUIVADO' },
]

const TIPO_FILTROS = [
  { label: 'Todos os tipos', value: '' },
  { label: 'PL',  value: 'PL' },
  { label: 'PDL', value: 'PDL' },
  { label: 'MOC', value: 'MOC' },
  { label: 'REQ', value: 'REQ' },
  { label: 'IND', value: 'IND' },
]

export default function ProposicoesPage() {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [page, setPage] = useState(1)

  const filtradas = PROPOSICOES_MOCK.filter(p => {
    const q = busca.toLowerCase()
    const matchBusca = !busca ||
      p.numero.toLowerCase().includes(q) ||
      p.ementa.toLowerCase().includes(q) ||
      p.autor.toLowerCase().includes(q)
    return matchBusca &&
      (!statusFiltro || p.status === statusFiltro) &&
      (!tipoFiltro   || p.tipo   === tipoFiltro)
  })

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Proposições</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">
            {filtradas.length} proposição{filtradas.length !== 1 ? 'ões' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/proposicoes/nova"
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={14} />
          Nova Proposição
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-surface-1 border border-line rounded-lg p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            placeholder="Buscar por número, ementa, autor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-surface-0 border border-line rounded-md pl-9 pr-4 py-2 text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-fg-3 flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTROS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFiltro(f.value)}
                className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                  statusFiltro === f.value
                    ? 'bg-brand-blue-active border-brand-blue text-brand-blue'
                    : 'bg-transparent border-line text-fg-2 hover:border-line-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-2 flex gap-1.5">
            {TIPO_FILTROS.map(f => (
              <button
                key={f.value}
                onClick={() => setTipoFiltro(f.value)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                  tipoFiltro === f.value
                    ? 'bg-brand-purple-soft border-brand-purple text-brand-purple'
                    : 'bg-transparent border-line text-fg-3 hover:border-line-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-0">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-36">
                <button className="flex items-center gap-1 hover:text-fg-2">Número <ArrowUpDown size={11} /></button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider">Ementa</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-48">Autor</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-40">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-32">Atualizado</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtradas.map(p => {
              const s = getStatusStyle(p.status)
              return (
                <tr key={p.id} className="hover:bg-surface-2 transition-colors group">
                  <td className="px-5 py-3.5">
                    <Link href={`/proposicoes/${p.id}`}>
                      <span className="font-mono text-brand-blue font-medium text-[12px]">{p.numero}</span>
                      {p.regime === 'URGENTE' && (
                        <span className="ml-1.5 text-[9px] font-bold bg-brand-amber-soft text-brand-amber px-1.5 py-0.5 rounded">URG</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/proposicoes/${p.id}`}
                      className="block text-fg-2 line-clamp-2 leading-snug hover:text-fg-1 transition-colors"
                    >
                      {p.ementa}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-fg-2 text-[12px]">{p.autor}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                      <span className={`${s.text} text-[12px]`}>{s.label}</span>
                    </div>
                    {p.orgaoAtual && (
                      <div className="text-[10px] text-fg-3 mt-0.5 font-mono">{p.orgaoAtual}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-fg-3 font-mono">{p.atualizado}</td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/proposicoes/${p.id}/tramitacao`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-brand-blue hover:underline whitespace-nowrap"
                    >
                      Timeline →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-line bg-surface-0">
          <div className="text-[12px] text-fg-3">
            Mostrando <span className="text-fg-2">{filtradas.length}</span> de {PROPOSICOES_MOCK.length} proposições
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-line text-fg-3 hover:border-line-2 hover:text-fg-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[12px] text-fg-2 px-2">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded border border-line text-fg-3 hover:border-line-2 hover:text-fg-2 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
