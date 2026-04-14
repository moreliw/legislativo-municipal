'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, ArrowUpDown, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  RASCUNHO: { label: 'Rascunho', dot: '#5c6282', text: 'text-[#5c6282]' },
  EM_ELABORACAO: { label: 'Em elaboração', dot: '#9198b0', text: 'text-[#9198b0]' },
  PROTOCOLADO: { label: 'Protocolado', dot: '#2d7dd2', text: 'text-[#2d7dd2]' },
  EM_ANALISE: { label: 'Em análise', dot: '#9178e0', text: 'text-[#9178e0]' },
  EM_COMISSAO: { label: 'Em comissão', dot: '#7c5cbf', text: 'text-[#b09de0]' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico', dot: '#e8a020', text: 'text-[#e8a020]' },
  EM_PAUTA: { label: 'Em pauta', dot: '#e8a020', text: 'text-[#e8a020]' },
  EM_VOTACAO: { label: 'Em votação', dot: '#f5a623', text: 'text-[#f5a623]' },
  APROVADO: { label: 'Aprovado', dot: '#1fa870', text: 'text-[#1fa870]' },
  REJEITADO: { label: 'Rejeitado', dot: '#d94040', text: 'text-[#d94040]' },
  DEVOLVIDO: { label: 'Devolvido', dot: '#d94040', text: 'text-[#d94040]' },
  PUBLICADO: { label: 'Publicado', dot: '#1fa870', text: 'text-[#1fa870]' },
  ARQUIVADO: { label: 'Arquivado', dot: '#5c6282', text: 'text-[#5c6282]' },
  SUSPENSO: { label: 'Suspenso', dot: '#d94040', text: 'text-[#e07070]' },
}

const proposicoesMock = [
  { id: 'p1', numero: 'PL-024/2024', tipo: 'PL', ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica e dá outras providências', autor: 'Ver. Marcos Oliveira', status: 'EM_COMISSAO', regime: 'ORDINARIO', protocolado: '10/03/2024', atualizado: '18/04/2024', orgaoAtual: 'CMA' },
  { id: 'p2', numero: 'REQ-031/2024', tipo: 'REQ', ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura Municipal', autor: 'Ver. Sandra Costa', status: 'PROTOCOLADO', regime: 'ORDINARIO', protocolado: '22/04/2024', atualizado: '22/04/2024', orgaoAtual: 'PRO' },
  { id: 'p3', numero: 'MOC-008/2024', tipo: 'MOC', ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária do município', autor: 'Ver. João Ferreira', status: 'EM_PAUTA', regime: 'ORDINARIO', protocolado: '05/04/2024', atualizado: '24/04/2024', orgaoAtual: 'SEC' },
  { id: 'p4', numero: 'PL-019/2024', tipo: 'PL', ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos nos estabelecimentos municipais', autor: 'Ver. Ana Lima', status: 'APROVADO', regime: 'ORDINARIO', protocolado: '15/02/2024', atualizado: '15/04/2024', orgaoAtual: 'PUB' },
  { id: 'p5', numero: 'PDL-003/2024', tipo: 'PDL', ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes pela contribuição cultural', autor: 'Mesa Diretora', status: 'AGUARDANDO_PARECER_JURIDICO', regime: 'ORDINARIO', protocolado: '01/04/2024', atualizado: '10/04/2024', orgaoAtual: 'PJU' },
  { id: 'p6', numero: 'PL-017/2024', tipo: 'PL', ementa: 'Institui o Programa Municipal de Saúde Mental para servidores e dependentes', autor: 'Ver. Roberto Alves', status: 'EM_COMISSAO', regime: 'URGENTE', protocolado: '20/03/2024', atualizado: '12/04/2024', orgaoAtual: 'CMA' },
  { id: 'p7', numero: 'IND-014/2024', tipo: 'IND', ementa: 'Indica ao executivo municipal a revitalização da praça central do bairro Jardim São Paulo', autor: 'Ver. Patricia Alves', status: 'EM_ANALISE', regime: 'ORDINARIO', protocolado: '18/03/2024', atualizado: '08/04/2024', orgaoAtual: 'SEC' },
  { id: 'p8', numero: 'PL-012/2024', tipo: 'PL', ementa: 'Dispõe sobre a criação do conselho municipal de cultura e patrimônio histórico', autor: 'Ver. Luis Martins', status: 'REJEITADO', regime: 'ORDINARIO', protocolado: '01/02/2024', atualizado: '28/03/2024', orgaoAtual: null },
]

const statusFiltros = [
  { label: 'Todos', value: '' },
  { label: 'Em tramitação', value: 'EM_ANALISE' },
  { label: 'Em comissão', value: 'EM_COMISSAO' },
  { label: 'Em pauta', value: 'EM_PAUTA' },
  { label: 'Aprovados', value: 'APROVADO' },
  { label: 'Arquivados', value: 'ARQUIVADO' },
]

const tiposFiltros = [
  { label: 'Todos os tipos', value: '' },
  { label: 'PL', value: 'PL' },
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

  const filtradas = proposicoesMock.filter(p => {
    const matchBusca = !busca || p.numero.toLowerCase().includes(busca.toLowerCase()) ||
      p.ementa.toLowerCase().includes(busca.toLowerCase()) ||
      p.autor.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !statusFiltro || p.status === statusFiltro
    const matchTipo = !tipoFiltro || p.tipo === tipoFiltro
    return matchBusca && matchStatus && matchTipo
  })

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Proposições</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">{filtradas.length} proposição{filtradas.length !== 1 ? 'ões' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/proposicoes/nova"
          className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={14} />
          Nova Proposição
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c6282]" />
          <input
            type="text"
            placeholder="Buscar por número, ementa, autor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md pl-9 pr-4 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] transition-colors"
          />
        </div>

        {/* Chips de status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-[#5c6282] flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {statusFiltros.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFiltro(f.value)}
                className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                  statusFiltro === f.value
                    ? 'bg-[#162d4a] border-[#2d7dd2] text-[#2d7dd2]'
                    : 'bg-transparent border-[#1e2333] text-[#9198b0] hover:border-[#2a3048]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-2 flex gap-1.5">
            {tiposFiltros.map(f => (
              <button
                key={f.value}
                onClick={() => setTipoFiltro(f.value)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                  tipoFiltro === f.value
                    ? 'bg-[#1a1030] border-[#7c5cbf] text-[#b09de0]'
                    : 'bg-transparent border-[#1e2333] text-[#5c6282] hover:border-[#2a3048]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#1e2333] bg-[#0f1117]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-36">
                <button className="flex items-center gap-1 hover:text-[#9198b0]">Número <ArrowUpDown size={11} /></button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider">Ementa</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-48">Autor</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-40">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-32">Atualizado</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2333]">
            {filtradas.map(p => {
              const s = statusConfig[p.status] ?? { label: p.status, dot: '#5c6282', text: 'text-[#5c6282]' }
              return (
                <tr key={p.id} className="hover:bg-[#1c202e] transition-colors group">
                  <td className="px-5 py-3.5">
                    <Link href={`/proposicoes/${p.id}`} className="block">
                      <span className="font-mono text-[#2d7dd2] font-medium text-[12px]">{p.numero}</span>
                      {p.regime === 'URGENTE' && (
                        <span className="ml-1.5 text-[9px] font-bold bg-[#2e1f06] text-[#e8a020] px-1.5 py-0.5 rounded">URG</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/proposicoes/${p.id}`} className="block text-[#9198b0] line-clamp-2 leading-snug hover:text-[#e8eaf0] transition-colors">
                      {p.ementa}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[#9198b0] text-[12px]">{p.autor}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                      <span className={`${s.text} text-[12px]`}>{s.label}</span>
                    </div>
                    {p.orgaoAtual && (
                      <div className="text-[10px] text-[#5c6282] mt-0.5 font-mono">{p.orgaoAtual}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-[#5c6282] font-mono">{p.atualizado}</td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/proposicoes/${p.id}/tramitacao`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-[#2d7dd2] hover:underline whitespace-nowrap"
                    >
                      Timeline →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2333] bg-[#0f1117]">
          <div className="text-[12px] text-[#5c6282]">
            Mostrando <span className="text-[#9198b0]">{filtradas.length}</span> de {proposicoesMock.length} proposições
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#1e2333] text-[#5c6282] hover:border-[#2a3048] hover:text-[#9198b0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[12px] text-[#9198b0] px-2">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#1e2333] text-[#5c6282] hover:border-[#2a3048] hover:text-[#9198b0] transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
