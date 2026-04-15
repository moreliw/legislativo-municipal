'use client'

import { useState, useRef } from 'react'
import {
  Upload, Download, Eye, FileText, Clock, CheckCircle,
  Search, Filter, MoreHorizontal, Lock, Globe
} from 'lucide-react'

const documentosMock = [
  {
    id: 'd1', nome: 'PL-024-2024-Texto-Original.pdf', tipo: 'TEXTO_PRINCIPAL',
    status: 'PROTOCOLADO', versaoAtual: 2, tamanho: 245760, mimeType: 'application/pdf',
    proposicaoNumero: 'PL-024/2024', publico: true, criadoEm: '10/03/2024',
    assinaturas: [{ usuario: 'Carlos Eduardo Lima', status: 'ASSINADO', assinadoEm: '10/03/2024' }],
  },
  {
    id: 'd2', nome: 'Parecer-Juridico-PAR-JUR-2024-0087.pdf', tipo: 'PARECER_JURIDICO',
    status: 'APROVADO', versaoAtual: 1, tamanho: 189440, mimeType: 'application/pdf',
    proposicaoNumero: 'PL-024/2024', publico: false, criadoEm: '25/03/2024',
    assinaturas: [{ usuario: 'Dra. Fernanda Rocha', status: 'ASSINADO', assinadoEm: '25/03/2024' }],
  },
  {
    id: 'd3', nome: 'Parecer-CMA-PL-024-2024.pdf', tipo: 'PARECER_COMISSAO',
    status: 'APROVADO', versaoAtual: 1, tamanho: 134144, mimeType: 'application/pdf',
    proposicaoNumero: 'PL-024/2024', publico: false, criadoEm: '18/04/2024',
    assinaturas: [{ usuario: 'Ver. Patricia Alves', status: 'ASSINADO', assinadoEm: '18/04/2024' }],
  },
  {
    id: 'd4', nome: 'Oficio-SEC-2024-047.docx', tipo: 'OFICIO',
    status: 'RASCUNHO', versaoAtual: 1, tamanho: 28672, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    proposicaoNumero: 'REQ-031/2024', publico: false, criadoEm: '22/04/2024',
    assinaturas: [],
  },
  {
    id: 'd5', nome: 'Ata-Sessao-011-2024.pdf', tipo: 'ATA',
    status: 'PUBLICADO', versaoAtual: 1, tamanho: 512000, mimeType: 'application/pdf',
    proposicaoNumero: null, publico: true, criadoEm: '18/04/2024',
    assinaturas: [
      { usuario: 'Carlos Eduardo Lima', status: 'ASSINADO', assinadoEm: '19/04/2024' },
      { usuario: 'Ver. Marcos Oliveira (Presidente)', status: 'ASSINADO', assinadoEm: '19/04/2024' },
    ],
  },
  {
    id: 'd6', nome: 'Despacho-SEC-2024-0313.pdf', tipo: 'DESPACHO',
    status: 'APROVADO', versaoAtual: 1, tamanho: 67584, mimeType: 'application/pdf',
    proposicaoNumero: 'PL-024/2024', publico: false, criadoEm: '13/03/2024',
    assinaturas: [{ usuario: 'Carlos Eduardo Lima', status: 'ASSINADO', assinadoEm: '13/03/2024' }],
  },
]

const tipoLabel: Record<string, string> = {
  TEXTO_PRINCIPAL: 'Texto Principal',
  PARECER_JURIDICO: 'Parecer Jurídico',
  PARECER_COMISSAO: 'Parecer de Comissão',
  ATA: 'Ata',
  OFICIO: 'Ofício',
  DESPACHO: 'Despacho',
  CONVOCACAO: 'Convocação',
  PAUTA: 'Pauta',
  REDACAO_FINAL: 'Redação Final',
  COMPROVANTE: 'Comprovante',
  OUTROS: 'Outros',
}

const tipoIconColor: Record<string, { bg: string; text: string; abbr: string }> = {
  TEXTO_PRINCIPAL:  { bg: 'bg-brand-blue-soft', text: 'text-brand-blue', abbr: 'TXT' },
  PARECER_JURIDICO: { bg: 'bg-brand-purple-soft', text: 'text-brand-purple', abbr: 'PJU' },
  PARECER_COMISSAO: { bg: 'bg-brand-purple-soft', text: 'text-brand-purple', abbr: 'PCM' },
  ATA:              { bg: 'bg-brand-green-soft', text: 'text-brand-green', abbr: 'ATA' },
  OFICIO:           { bg: 'bg-surface-2', text: 'text-fg-2', abbr: 'OFC' },
  DESPACHO:         { bg: 'bg-brand-amber-soft', text: 'text-brand-amber', abbr: 'DSP' },
  CONVOCACAO:       { bg: 'bg-brand-blue-soft', text: 'text-brand-blue', abbr: 'CNV' },
  PAUTA:            { bg: 'bg-brand-amber-soft', text: 'text-brand-amber', abbr: 'PAU' },
  COMPROVANTE:      { bg: 'bg-surface-2', text: 'text-fg-2', abbr: 'REC' },
}

const statusConfig: Record<string, { label: string; text: string }> = {
  RASCUNHO:   { label: 'Rascunho',   text: 'text-fg-3' },
  REVISAO:    { label: 'Em revisão', text: 'text-brand-amber' },
  APROVADO:   { label: 'Aprovado',   text: 'text-brand-blue' },
  PROTOCOLADO:{ label: 'Protocolado',text: 'text-brand-blue' },
  PUBLICADO:  { label: 'Publicado',  text: 'text-brand-green' },
  ARQUIVADO:  { label: 'Arquivado',  text: 'text-fg-3' },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function DocumentosPage() {
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtrados = documentosMock.filter(d => {
    const matchBusca = !busca || d.nome.toLowerCase().includes(busca.toLowerCase()) ||
      d.proposicaoNumero?.toLowerCase().includes(busca.toLowerCase())
    const matchTipo = !tipoFiltro || d.tipo === tipoFiltro
    const matchStatus = !statusFiltro || d.status === statusFiltro
    return matchBusca && matchTipo && matchStatus
  })

  const tiposUnicos = [...new Set(documentosMock.map(d => d.tipo))]

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Documentos</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">{filtrados.length} documento{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Upload size={14} />
          Upload
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.odt" />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false) }}
        className={`border-2 border-dashed rounded-lg py-6 text-center transition-colors cursor-pointer ${
          dragging ? 'border-brand-blue bg-brand-blue-soft' : 'border-line hover:border-line-2'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={20} className="mx-auto text-fg-3 mb-2" />
        <div className="text-[13px] text-fg-3">
          Arraste arquivos aqui ou <span className="text-brand-blue hover:underline">clique para selecionar</span>
        </div>
        <div className="text-[11px] text-fg-3 mt-1">PDF, DOCX, DOC — Máx. 50MB</div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-surface-1 border border-line rounded-md pl-8 pr-3 py-2 text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        <select
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
          className="bg-surface-1 border border-line rounded-md px-3 py-2 text-[13px] text-fg-2 focus:outline-none focus:border-brand-blue transition-colors"
        >
          <option value="">Todos os tipos</option>
          {tiposUnicos.map(t => (
            <option key={t} value={t}>{tipoLabel[t] ?? t}</option>
          ))}
        </select>

        <select
          value={statusFiltro}
          onChange={e => setStatusFiltro(e.target.value)}
          className="bg-surface-1 border border-line rounded-md px-3 py-2 text-[13px] text-fg-2 focus:outline-none focus:border-brand-blue transition-colors"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Lista de documentos */}
      <div className="bg-surface-1 border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-0">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider">Documento</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-36">Proposição</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-28">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-20">Tamanho</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-fg-3 uppercase tracking-wider w-32">Data</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtrados.map(doc => {
              const ic = tipoIconColor[doc.tipo] ?? { bg: 'bg-surface-2', text: 'text-fg-2', abbr: 'DOC' }
              const sc = statusConfig[doc.status] ?? { label: doc.status, text: 'text-fg-2' }
              return (
                <tr key={doc.id} className="hover:bg-surface-2 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0 ${ic.bg} ${ic.text}`}>
                        {ic.abbr}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-fg-1 truncate">{doc.nome}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-fg-3">{tipoLabel[doc.tipo] ?? doc.tipo}</span>
                          {doc.versaoAtual > 1 && (
                            <span className="text-[10px] font-mono text-fg-3">v{doc.versaoAtual}</span>
                          )}
                          {doc.assinaturas.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-brand-green">
                              <CheckCircle size={9} /> {doc.assinaturas.length} assinatura{doc.assinaturas.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {doc.publico
                            ? <Globe size={10} className="text-fg-3" title="Público" />
                            : <Lock size={10} className="text-fg-3" title="Restrito" />
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {doc.proposicaoNumero
                      ? <span className="font-mono text-[12px] text-brand-blue">{doc.proposicaoNumero}</span>
                      : <span className="text-[12px] text-fg-3">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[12px] ${sc.text}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-fg-3 font-mono">
                    {formatBytes(doc.tamanho)}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-fg-3 font-mono">
                    {doc.criadoEm}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-2 transition-colors rounded hover:bg-surface-3" title="Visualizar">
                        <Eye size={13} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-2 transition-colors rounded hover:bg-surface-3" title="Baixar">
                        <Download size={13} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-2 transition-colors rounded hover:bg-surface-3" title="Mais ações">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-fg-3 text-[13px]">
            Nenhum documento encontrado com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
