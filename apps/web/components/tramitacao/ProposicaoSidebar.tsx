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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2333] flex-shrink-0">
        <span className="text-[12px] font-semibold text-[#e8eaf0]">Detalhes</span>
        <button onClick={onFechar} className="text-[#5c6282] hover:text-[#9198b0] transition-colors">
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
            <div key={k.label} className="bg-[#0f1117] border border-[#1e2333] rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-semibold text-[#e8eaf0]">{k.value}</div>
              <div className="text-[10px] text-[#5c6282] mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Progresso */}
        <div className="px-4 pb-4">
          <div className="flex justify-between text-[10px] text-[#5c6282] mb-1.5">
            <span>Progresso do fluxo</span>
            <span className="font-mono">{proposicao.tramitacoes.length}/8 etapas</span>
          </div>
          <div className="h-1.5 bg-[#1c202e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(progresso, 100)}%`,
                background: 'linear-gradient(90deg, #2d7dd2, #7c5cbf)',
              }}
            />
          </div>
        </div>

        {/* Informações */}
        <div className="px-4 pb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5c6282] mb-2.5">
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
                <span className="text-[#5c6282]">{label}</span>
                <span className="text-[#9198b0] text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas etapas */}
        {proposicao.proximasEtapas?.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5c6282] mb-2.5">
              Próximas Etapas
            </div>
            <div className="space-y-2">
              {proposicao.proximasEtapas.map((etapa: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-[#0f1117] border border-[#1e2333]"
                  style={{ borderLeft: '2px solid #e8a020' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#e8eaf0] leading-snug">{etapa.etapa}</div>
                    <div className="text-[10px] text-[#5c6282] mt-0.5 flex items-center gap-1">
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
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5c6282]">
              Documentos
            </div>
            <span className="text-[10px] text-[#5c6282]">{proposicao.documentos.length}</span>
          </div>
          <div className="space-y-1.5">
            {proposicao.documentos.slice(0, 5).map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 text-[11px] text-[#9198b0] hover:text-[#2d7dd2] cursor-pointer transition-colors group"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#0d1e35] text-[#2d7dd2] text-[8px] font-bold font-mono flex-shrink-0">
                  {doc.tipo.substring(0, 3)}
                </div>
                <span className="flex-1 truncate">{doc.nome}</span>
                <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {proposicao.documentos.length > 5 && (
              <div className="text-[10px] text-[#5c6282] text-center pt-1">
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
        <button className="flex items-center gap-1.5 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[12px] font-medium px-3 py-2 rounded-md transition-colors">
          <ArrowRight size={13} />
          Encaminhar
        </button>
      )}
      {podeIncluirPauta && (
        <button className="flex items-center gap-1.5 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] hover:border-[#2a3048] text-[12px] px-3 py-2 rounded-md transition-colors">
          Incluir em Pauta
        </button>
      )}
      <button className="flex items-center gap-1.5 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] hover:border-[#2a3048] text-[12px] px-3 py-2 rounded-md transition-colors">
        <FileText size={13} />
        Despacho
      </button>
      <button className="flex items-center gap-1.5 border border-[#1e2333] text-[#e8a020] hover:bg-[#2e1f06] text-[12px] px-3 py-2 rounded-md transition-colors">
        Devolver
      </button>
      <button className="flex items-center gap-1.5 border border-[#1e2333] text-[#d94040] hover:bg-[#2e0e0e] text-[12px] px-3 py-2 rounded-md transition-colors ml-auto">
        Arquivar
      </button>
    </div>
  )
}
