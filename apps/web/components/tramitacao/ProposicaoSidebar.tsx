'use client'

import { X, Clock, FileText, ArrowRight, ChevronRight } from 'lucide-react'

interface SidebarProps {
  proposicao: any
  onFechar: () => void
}

export function ProposicaoSidebar({ proposicao, onFechar }: SidebarProps) {
  const progresso = Math.round((proposicao.tramitacoes.length / 10) * 100)

  return (
    <div className="h-full flex flex-col">
      {/* Header da sidebar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
        <span className="text-[12px] font-semibold text-fg-1">Detalhes</span>
        <button onClick={onFechar} className="text-fg-3 hover:text-fg-2 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 p-4">
          {[
            { label: 'Dias em tramitação', value: Math.floor((Date.now() - new Date(proposicao.protocoladoEm).getTime()) / 86400000) },
            { label: 'Eventos registrados', value: proposicao.tramitacoes.length },
          ].map(k => (
            <div key={k.label} className="bg-surface-0 border border-line rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-semibold text-fg-1">{k.value}</div>
              <div className="text-[10px] text-fg-3 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Progresso */}
        <div className="px-4 pb-4">
          <div className="flex justify-between text-[10px] text-fg-3 mb-1.5">
            <span>Progresso do fluxo</span>
            <span className="font-mono">{proposicao.tramitacoes.length}/8 etapas</span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(progresso, 100)}%`,
                background: 'linear-gradient(90deg, var(--blue), var(--purple))',
              }}
            />
          </div>
        </div>

        {/* Informações */}
        <div className="px-4 pb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3 mb-2.5">
            Proposição
          </div>
          <div className="space-y-2">
            {[
              ['Tipo', proposicao.tipoMateria.nome],
              ['Autor', proposicao.autor?.nome ?? '—'],
              ['Regime', proposicao.regime === 'ORDINARIO' ? 'Ordinário' : proposicao.regime],
              ['Protocolo', new Date(proposicao.protocoladoEm).toLocaleDateString('pt-BR')],
              ['Responsável', proposicao.orgaoDestino?.nome ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 text-[11px]">
                <span className="text-fg-3">{label}</span>
                <span className="text-fg-2 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas etapas */}
        {proposicao.proximasEtapas?.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3 mb-2.5">
              Próximas Etapas
            </div>
            <div className="space-y-2">
              {proposicao.proximasEtapas.map((etapa: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-surface-0 border border-line"
                  style={{ borderLeft: '2px solid var(--amber)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-fg-1 leading-snug">{etapa.etapa}</div>
                    <div className="text-[10px] text-fg-3 mt-0.5 flex items-center gap-1">
                      <Clock size={9} />
                      {etapa.orgao} · {new Date(etapa.prazo).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentos */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">
              Documentos
            </div>
            <span className="text-[10px] text-fg-3">{proposicao.documentos.length}</span>
          </div>
          <div className="space-y-1.5">
            {proposicao.documentos.slice(0, 5).map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 text-[11px] text-fg-2 hover:text-brand-blue cursor-pointer transition-colors group"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center bg-brand-blue-soft text-brand-blue text-[8px] font-bold font-mono flex-shrink-0">
                  {doc.tipo.substring(0, 3)}
                </div>
                <span className="flex-1 truncate">{doc.nome}</span>
                <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {proposicao.documentos.length > 5 && (
              <div className="text-[10px] text-fg-3 text-center pt-1">
                + {proposicao.documentos.length - 5} documentos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AcoesRapidas ──────────────────────────────────────────────────
interface AcoesRapidasProps {
  proposicao: any
}

export function AcoesRapidas({ proposicao }: AcoesRapidasProps) {
  const podeEncaminhar = !['ARQUIVADO', 'PUBLICADO', 'REJEITADO'].includes(proposicao.status)
  const podeIncluirPauta = proposicao.status === 'EM_COMISSAO' || proposicao.status === 'EM_ANALISE'

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {podeEncaminhar && (
        <button className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-2 text-white text-[12px] font-medium px-3 py-2 rounded-md transition-colors">
          <ArrowRight size={13} />
          Encaminhar
        </button>
      )}
      {podeIncluirPauta && (
        <button className="flex items-center gap-1.5 border border-line text-fg-2 hover:text-fg-1 hover:border-line-2 text-[12px] px-3 py-2 rounded-md transition-colors">
          Incluir em Pauta
        </button>
      )}
      <button className="flex items-center gap-1.5 border border-line text-fg-2 hover:text-fg-1 hover:border-line-2 text-[12px] px-3 py-2 rounded-md transition-colors">
        <FileText size={13} />
        Despacho
      </button>
      <button className="flex items-center gap-1.5 border border-line text-brand-amber hover:bg-brand-amber-soft text-[12px] px-3 py-2 rounded-md transition-colors">
        Devolver
      </button>
      <button className="flex items-center gap-1.5 border border-line text-brand-red hover:bg-brand-red-soft text-[12px] px-3 py-2 rounded-md transition-colors ml-auto">
        Arquivar
      </button>
    </div>
  )
}


export default ProposicaoSidebar
