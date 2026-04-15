'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, GitBranch, Users, Download, MoreHorizontal } from 'lucide-react'
import { proposicaoMock } from '@/mocks/proposicao.mock'
import { getStatusStyle } from '@/lib/status-config'

const TIPO_DOC_ICON: Record<string, string> = {
  TEXTO_PRINCIPAL:  'TXT',
  PARECER_JURIDICO: 'PJU',
  PARECER_COMISSAO: 'PCM',
  DESPACHO:         'DSP',
  ATA:              'ATA',
  COMPROVANTE:      'REC',
  OUTROS:           'DOC',
}

const ETAPAS_TRAMITACAO = [
  { id: 'protocolo', label: 'Protocolo', done: true },
  { id: 'analise',   label: 'Análise',   done: true },
  { id: 'juridico',  label: 'Jurídico',  done: true },
  { id: 'comissao',  label: 'Comissão',  done: false, current: true },
  { id: 'pauta',     label: 'Pauta',     done: false },
  { id: 'votacao',   label: 'Votação',   done: false },
  { id: 'redacao',   label: 'Redação',   done: false },
  { id: 'publicacao',label: 'Publicação',done: false },
] as const

type Tab = 'detalhes' | 'documentos' | 'votacoes'

export default function ProposicaoDetailPage({ params }: { params: { id: string } }) {
  const [tabAtiva, setTabAtiva] = useState<Tab>('detalhes')
  const p = proposicaoMock
  const s = getStatusStyle(p.status)

  const tabs = [
    { id: 'detalhes'   as Tab, label: 'Detalhes',                    icon: FileText },
    { id: 'documentos' as Tab, label: `Documentos (${p.documentos.length})`, icon: FileText },
    { id: 'votacoes'   as Tab, label: 'Votações',                    icon: Users },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/proposicoes" className="mt-1 text-fg-3 hover:text-fg-2 transition-colors">
          <ArrowLeft size={17} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-brand-blue font-semibold text-[15px]">{p.numero}</span>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${s.badge}`}>
              {s.label}
            </span>
            {p.regime === 'URGENTE' && (
              <span className="text-[10px] font-bold bg-brand-amber-soft text-brand-amber px-2 py-0.5 rounded">
                URGENTE
              </span>
            )}
          </div>
          <h1 className="text-[16px] font-medium text-fg-1 mt-1 leading-snug">{p.ementa}</h1>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-fg-3 flex-wrap">
            <span>{p.tipoMateria.nome}</span>
            <span>·</span>
            <span>Autoria: <span className="text-fg-2">{p.autor?.nome}</span></span>
            <span>·</span>
            <span>Protocolado em <span className="text-fg-2 font-mono">
              {new Date(p.protocoladoEm!).toLocaleDateString('pt-BR')}
            </span></span>
            {p.orgaoDestino && (
              <>
                <span>·</span>
                <span>Responsável: <span className="text-brand-purple">{p.orgaoDestino.nome}</span></span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/proposicoes/${params.id}/tramitacao`}
            className="flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:border-line-2 hover:text-fg-1 px-3 py-2 rounded-md transition-colors"
          >
            <GitBranch size={13} />
            Timeline
          </Link>
          <button className="flex items-center gap-1.5 text-[12px] bg-brand-blue hover:bg-brand-blue-2 text-white px-4 py-2 rounded-md transition-colors">
            Encaminhar
          </button>
          <button className="w-8 h-8 flex items-center justify-center border border-line text-fg-3 hover:text-fg-2 rounded-md transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Tramitação progress bar */}
      <div className="bg-surface-1 border border-line rounded-lg px-5 py-4">
        <div className="flex items-center justify-between text-[11px] text-fg-3 mb-3">
          <span className="font-semibold">Progresso da tramitação</span>
          <span className="font-mono">4 / 8 etapas</span>
        </div>
        <div className="flex items-center relative">
          {ETAPAS_TRAMITACAO.map((etapa, i, arr) => (
            <div key={etapa.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  etapa.done
                    ? 'bg-brand-green-soft border-brand-green text-brand-green'
                    : 'current' in etapa && etapa.current
                    ? 'bg-brand-blue-soft border-brand-blue text-brand-blue'
                    : 'bg-transparent border-line text-fg-3'
                }`}>
                  {etapa.done ? '✓' : i + 1}
                </div>
                <div className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
                  'current' in etapa && etapa.current ? 'text-brand-blue'
                    : etapa.done ? 'text-brand-green'
                    : 'text-fg-3'
                }`}>
                  {etapa.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-px flex-1 transition-colors mx-1 ${etapa.done ? 'bg-brand-green' : 'bg-line'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                tabAtiva === tab.id
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-fg-3 hover:text-fg-2'
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
            <div className="bg-surface-1 border border-line rounded-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">Ementa</div>
              <p className="text-[14px] text-fg-1 leading-relaxed">{p.ementa}</p>
            </div>

            <div className="bg-surface-1 border border-line rounded-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">Classificação</div>
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <div className="text-[11px] text-fg-3 mb-1">Assunto</div>
                  <div className="text-fg-2">{p.assunto || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-fg-3 mb-1">Regime</div>
                  <div className="text-fg-2">
                    {p.regime === 'ORDINARIO' ? 'Ordinário' : p.regime === 'URGENTE' ? 'Urgente' : p.regime}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-fg-3 mb-2">Palavras-chave</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.palavrasChave.map(kw => (
                      <span key={kw} className="text-[11px] bg-brand-blue-soft text-brand-blue px-2.5 py-1 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {p.proximasEtapas.length > 0 && (
              <div className="bg-brand-amber-soft border border-line rounded-lg p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-amber mb-3">
                  Próximas Etapas Pendentes
                </div>
                <div className="space-y-2">
                  {p.proximasEtapas.map((etapa, i) => (
                    <div key={i} className="flex items-start gap-3 text-[12px]">
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        etapa.obrigatoria ? 'bg-brand-amber' : 'border border-brand-amber opacity-40'
                      }`}>
                        {etapa.obrigatoria && <span className="text-[7px] text-white font-bold">!</span>}
                      </div>
                      <div>
                        <div className="text-fg-1">{etapa.etapa}</div>
                        <div className="text-fg-3">
                          {etapa.orgao} · Prazo: {new Date(etapa.prazo).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-surface-1 border border-line rounded-lg p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">Informações</div>
              <div className="space-y-2.5">
                {([
                  ['Tipo',               p.tipoMateria.nome],
                  ['Número',             p.numero],
                  ['Ano',                String(p.ano)],
                  ['Origem',             p.origem === 'VEREADOR' ? 'Vereador' : p.origem],
                  ['Autor',              p.autor?.nome ?? '—'],
                  ['Protocolado',        new Date(p.protocoladoEm!).toLocaleDateString('pt-BR')],
                  ['Última atualização', new Date(p.atualizadoEm).toLocaleDateString('pt-BR')],
                  ['Órgão atual',        p.orgaoDestino?.sigla ?? '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-[11px] text-fg-3">{label}</span>
                    <span className="text-[12px] text-fg-2 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-1 border border-line rounded-lg p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">Motor de Processo</div>
              <div className="flex items-center gap-2 text-[12px]">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                <span className="text-brand-green">Ativo</span>
                <span className="text-fg-3">· Camunda</span>
              </div>
              <div className="text-[11px] text-fg-3 mt-1.5 font-mono">Etapa atual: task_comissao</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tabAtiva === 'documentos' && (
        <div className="space-y-3">
          {p.documentos.map(doc => {
            const docStatusClass =
              doc.status === 'PUBLICADO' ? 'bg-brand-green-soft text-brand-green' :
              doc.status === 'APROVADO'  ? 'bg-brand-blue-soft text-brand-blue' :
              'bg-surface-2 text-fg-3'

            return (
              <div key={doc.id} className="bg-surface-1 border border-line rounded-lg flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors">
                <div className="w-9 h-9 rounded-md bg-brand-blue-soft border border-line flex items-center justify-center text-[10px] font-bold text-brand-blue flex-shrink-0 font-mono">
                  {TIPO_DOC_ICON[doc.tipo] || 'DOC'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-fg-1">{doc.nome}</div>
                  <div className="text-[11px] text-fg-3 mt-0.5">
                    {doc.tipo.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                    {doc.versaoAtual > 1 && <span className="ml-2 font-mono">v{doc.versaoAtual}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${docStatusClass}`}>
                  {doc.status.toLowerCase()}
                </span>
                <button className="text-fg-3 hover:text-fg-2 transition-colors">
                  <Download size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Votações */}
      {tabAtiva === 'votacoes' && (
        <div className="bg-surface-1 border border-line rounded-lg p-6 text-center">
          <div className="text-fg-3 text-[13px]">Nenhuma votação registrada ainda.</div>
          <div className="text-[12px] text-fg-3 mt-1">A proposição está em análise na comissão.</div>
        </div>
      )}
    </div>
  )
}
