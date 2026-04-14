'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Clock, FileText, GitBranch, Users, ChevronRight,
  Download, CheckCircle, AlertCircle, MoreHorizontal
} from 'lucide-react'
import { proposicaoMock } from '@/mocks/proposicao.mock'

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  RASCUNHO: { label: 'Rascunho', bg: 'bg-[#1c202e]', text: 'text-[#5c6282]', dot: '#5c6282' },
  PROTOCOLADO: { label: 'Protocolado', bg: 'bg-[#0d1e35]', text: 'text-[#2d7dd2]', dot: '#2d7dd2' },
  EM_ANALISE: { label: 'Em análise', bg: 'bg-[#1a1030]', text: 'text-[#b09de0]', dot: '#7c5cbf' },
  EM_COMISSAO: { label: 'Em comissão', bg: 'bg-[#1a1030]', text: 'text-[#b09de0]', dot: '#7c5cbf' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico', bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]', dot: '#e8a020' },
  EM_PAUTA: { label: 'Em pauta', bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]', dot: '#e8a020' },
  APROVADO: { label: 'Aprovado', bg: 'bg-[#0a2318]', text: 'text-[#1fa870]', dot: '#1fa870' },
  REJEITADO: { label: 'Rejeitado', bg: 'bg-[#2e0e0e]', text: 'text-[#d94040]', dot: '#d94040' },
  PUBLICADO: { label: 'Publicado', bg: 'bg-[#0a2318]', text: 'text-[#1fa870]', dot: '#1fa870' },
  ARQUIVADO: { label: 'Arquivado', bg: 'bg-[#1c202e]', text: 'text-[#5c6282]', dot: '#5c6282' },
}

const tipoDocIcon: Record<string, string> = {
  TEXTO_PRINCIPAL: 'TXT',
  PARECER_JURIDICO: 'PJU',
  PARECER_COMISSAO: 'PCM',
  DESPACHO: 'DSP',
  ATA: 'ATA',
  COMPROVANTE: 'REC',
  OUTROS: 'DOC',
}

export default function ProposicaoDetailPage({ params }: { params: { id: string } }) {
  const [tabAtiva, setTabAtiva] = useState<'detalhes' | 'documentos' | 'votacoes'>('detalhes')
  const p = proposicaoMock
  const s = statusConfig[p.status] ?? statusConfig['RASCUNHO']

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: FileText },
    { id: 'documentos', label: `Documentos (${p.documentos.length})`, icon: FileText },
    { id: 'votacoes', label: 'Votações', icon: Users },
  ] as const

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-4">
        <Link href="/proposicoes" className="mt-1 text-[#5c6282] hover:text-[#9198b0] transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[#2d7dd2] font-semibold text-[15px]">{p.numero}</span>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
            {p.regime === 'URGENTE' && (
              <span className="text-[10px] font-bold bg-[#2e1f06] text-[#e8a020] px-2 py-0.5 rounded">
                URGENTE
              </span>
            )}
          </div>
          <h1 className="text-[16px] font-medium text-[#e8eaf0] mt-1 leading-snug">{p.ementa}</h1>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-[#5c6282] flex-wrap">
            <span>{p.tipoMateria.nome}</span>
            <span>·</span>
            <span>Autoria: <span className="text-[#9198b0]">{p.autor?.nome}</span></span>
            <span>·</span>
            <span>Protocolado em <span className="text-[#9198b0] font-mono">
              {new Date(p.protocoladoEm!).toLocaleDateString('pt-BR')}
            </span></span>
            {p.orgaoDestino && (
              <>
                <span>·</span>
                <span>Responsável: <span className="text-[#b09de0]">{p.orgaoDestino.nome}</span></span>
              </>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/proposicoes/${params.id}/tramitacao`}
            className="flex items-center gap-1.5 text-[12px] border border-[#1e2333] text-[#9198b0] hover:border-[#2a3048] hover:text-[#e8eaf0] px-3 py-2 rounded-md transition-colors"
          >
            <GitBranch size={13} />
            Timeline
          </Link>
          <button className="flex items-center gap-1.5 text-[12px] bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white px-4 py-2 rounded-md transition-colors">
            Encaminhar
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-[#1e2333] text-[#5c6282] hover:text-[#9198b0] rounded-md transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Progresso do fluxo */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg px-5 py-4">
        <div className="flex items-center justify-between text-[11px] text-[#5c6282] mb-3">
          <span className="font-semibold">Progresso da tramitação</span>
          <span className="font-mono">4 / 8 etapas</span>
        </div>
        <div className="flex items-center gap-0 relative">
          {[
            { id: 'protocolo', label: 'Protocolo', done: true },
            { id: 'analise', label: 'Análise', done: true },
            { id: 'juridico', label: 'Jurídico', done: true },
            { id: 'comissao', label: 'Comissão', done: false, current: true },
            { id: 'pauta', label: 'Pauta', done: false },
            { id: 'votacao', label: 'Votação', done: false },
            { id: 'redacao', label: 'Redação', done: false },
            { id: 'publicacao', label: 'Publicação', done: false },
          ].map((etapa, i, arr) => (
            <div key={etapa.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  etapa.done
                    ? 'bg-[#0a2318] border-[#1fa870] text-[#1fa870]'
                    : etapa.current
                    ? 'bg-[#0d1e35] border-[#2d7dd2] text-[#2d7dd2]'
                    : 'bg-transparent border-[#1e2333] text-[#5c6282]'
                }`}>
                  {etapa.done ? '✓' : i + 1}
                </div>
                <div className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
                  etapa.current ? 'text-[#2d7dd2]' : etapa.done ? 'text-[#1fa870]' : 'text-[#5c6282]'
                }`}>
                  {etapa.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-px flex-1 transition-colors mx-1 ${etapa.done ? 'bg-[#1fa870]' : 'bg-[#1e2333]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e2333]">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                tabAtiva === tab.id
                  ? 'border-[#2d7dd2] text-[#2d7dd2]'
                  : 'border-transparent text-[#5c6282] hover:text-[#9198b0]'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Detalhes */}
      {tabAtiva === 'detalhes' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            {/* Ementa completa */}
            <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">Ementa</div>
              <p className="text-[14px] text-[#e8eaf0] leading-relaxed">{p.ementa}</p>
            </div>

            {/* Palavras-chave */}
            <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">Classificação</div>
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <div className="text-[11px] text-[#5c6282] mb-1">Assunto</div>
                  <div className="text-[#9198b0]">{p.assunto || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#5c6282] mb-1">Regime</div>
                  <div className="text-[#9198b0]">
                    {p.regime === 'ORDINARIO' ? 'Ordinário' : p.regime === 'URGENTE' ? 'Urgente' : p.regime}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-[#5c6282] mb-2">Palavras-chave</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.palavrasChave.map(kw => (
                      <span key={kw} className="text-[11px] bg-[#0d1e35] text-[#2d7dd2] px-2.5 py-1 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Próximas etapas */}
            {p.proximasEtapas.length > 0 && (
              <div className="bg-[#2e1f06] border border-[#e8a020]/20 rounded-lg p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#e8a020] mb-3">
                  Próximas Etapas Pendentes
                </div>
                <div className="space-y-2">
                  {p.proximasEtapas.map((etapa, i) => (
                    <div key={i} className="flex items-start gap-3 text-[12px]">
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        etapa.obrigatoria ? 'bg-[#e8a020]' : 'border border-[#e8a020]/40'
                      }`}>
                        {etapa.obrigatoria && <span className="text-[7px] text-[#0f1117] font-bold">!</span>}
                      </div>
                      <div>
                        <div className="text-[#e8eaf0]">{etapa.etapa}</div>
                        <div className="text-[#5c6282]">{etapa.orgao} · Prazo: {new Date(etapa.prazo).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metadados laterais */}
          <div className="space-y-4">
            <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">Informações</div>
              <div className="space-y-2.5">
                {[
                  ['Tipo', p.tipoMateria.nome],
                  ['Número', p.numero],
                  ['Ano', String(p.ano)],
                  ['Origem', p.origem === 'VEREADOR' ? 'Vereador' : p.origem],
                  ['Autor', p.autor?.nome ?? '—'],
                  ['Protocolado', new Date(p.protocoladoEm!).toLocaleDateString('pt-BR')],
                  ['Última atualização', new Date(p.atualizadoEm).toLocaleDateString('pt-BR')],
                  ['Órgão atual', p.orgaoDestino?.sigla ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-[11px] text-[#5c6282]">{label}</span>
                    <span className="text-[12px] text-[#9198b0] text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status do processo Camunda */}
            <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">Motor de Processo</div>
              <div className="flex items-center gap-2 text-[12px]">
                <div className="w-2 h-2 rounded-full bg-[#1fa870] animate-pulse" />
                <span className="text-[#1fa870]">Ativo</span>
                <span className="text-[#5c6282]">· Camunda</span>
              </div>
              <div className="text-[11px] text-[#5c6282] mt-1.5 font-mono">
                Etapa atual: task_comissao
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tabAtiva === 'documentos' && (
        <div className="space-y-3">
          {p.documentos.map(doc => (
            <div key={doc.id} className="bg-[#13161f] border border-[#1e2333] rounded-lg flex items-center gap-4 px-5 py-3.5 hover:bg-[#1c202e] transition-colors">
              <div className="w-9 h-9 rounded-md bg-[#0d1e35] border border-[#1e2333] flex items-center justify-center text-[10px] font-bold text-[#2d7dd2] flex-shrink-0 font-mono">
                {tipoDocIcon[doc.tipo] || 'DOC'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#e8eaf0]">{doc.nome}</div>
                <div className="text-[11px] text-[#5c6282] mt-0.5">
                  {doc.tipo.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  {doc.versaoAtual > 1 && <span className="ml-2 font-mono">v{doc.versaoAtual}</span>}
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                doc.status === 'PUBLICADO' ? 'bg-[#0a2318] text-[#1fa870]'
                : doc.status === 'APROVADO' ? 'bg-[#0d1e35] text-[#2d7dd2]'
                : 'bg-[#1c202e] text-[#5c6282]'
              }`}>
                {doc.status.toLowerCase()}
              </span>
              <button className="text-[#5c6282] hover:text-[#9198b0] transition-colors">
                <Download size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Votações */}
      {tabAtiva === 'votacoes' && (
        <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-6 text-center">
          <div className="text-[#5c6282] text-[13px]">Nenhuma votação registrada ainda.</div>
          <div className="text-[12px] text-[#5c6282] mt-1">A proposição está em análise na comissão.</div>
        </div>
      )}
    </div>
  )
}
