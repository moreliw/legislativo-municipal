'use client'

import { useState } from 'react'
import { Shield, Plus, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'

const regrasMock = [
  {
    id: 'r1', nome: 'PL exige parecer jurídico', tipo: 'ROTEAMENTO', prioridade: 10, ativo: true,
    tipoMateria: 'PL', descricao: 'Todo Projeto de Lei deve passar pela Procuradoria antes da comissão',
    condicoes: { tipoMateria: 'PL', regime: 'ORDINARIO' },
    acoes: { encaminharPara: 'PJU', statusNovo: 'AGUARDANDO_PARECER_JURIDICO' },
    versao: 1, atualizadoEm: '01/03/2024'
  },
  {
    id: 'r2', nome: 'Votação exige quórum simples', tipo: 'QUORUM', prioridade: 20, ativo: true,
    tipoMateria: null, descricao: 'Sessão de votação deve ter ao menos maioria simples dos vereadores',
    condicoes: { tiposSessao: ['VOTACAO'] },
    acoes: { quorumMinimo: 6, totalVereadores: 11 },
    versao: 1, atualizadoEm: '01/03/2024'
  },
  {
    id: 'r3', nome: 'Prazo mínimo entre encaminhamentos', tipo: 'PRAZO', prioridade: 5, ativo: true,
    tipoMateria: null, descricao: 'Intervalo mínimo de 24h entre encaminhamentos sequenciais',
    condicoes: { tiposEvento: ['ENCAMINHAMENTO'] },
    acoes: { prazoMinimoHoras: 24 },
    versao: 1, atualizadoEm: '01/03/2024'
  },
  {
    id: 'r4', nome: 'PDL de urgência sem comissão', tipo: 'ROTEAMENTO', prioridade: 15, ativo: true,
    tipoMateria: 'PDL', descricao: 'Projetos de Decreto em urgência vão direto ao plenário',
    condicoes: { tipoMateria: 'PDL', regime: 'URGENTE' },
    acoes: { encaminharPara: 'PLN', pulaarComissao: true },
    versao: 2, atualizadoEm: '15/03/2024'
  },
  {
    id: 'r5', nome: 'Alerta 48h antes do prazo', tipo: 'NOTIFICACAO', prioridade: 3, ativo: false,
    tipoMateria: null, descricao: 'Notificar responsável 48h antes do prazo de tramitação',
    condicoes: { horasAntesDoVencimento: 48 },
    acoes: { notificarResponsavel: true, notificarOrgao: true },
    versao: 1, atualizadoEm: '20/03/2024'
  },
]

const tipoConfig: Record<string, { label: string; bg: string; text: string }> = {
  ROTEAMENTO: { label: 'Roteamento', bg: 'bg-[#0d1e35]', text: 'text-[#2d7dd2]' },
  VALIDACAO: { label: 'Validação', bg: 'bg-[#1a1030]', text: 'text-[#b09de0]' },
  PRAZO: { label: 'Prazo', bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]' },
  NOTIFICACAO: { label: 'Notificação', bg: 'bg-[#13161f]', text: 'text-[#9198b0]' },
  BLOQUEIO: { label: 'Bloqueio', bg: 'bg-[#2e0e0e]', text: 'text-[#d94040]' },
  QUORUM: { label: 'Quórum', bg: 'bg-[#0a2318]', text: 'text-[#1fa870]' },
}

export default function RegrasAdminPage() {
  const [expandido, setExpandido] = useState<string | null>(null)
  const [regras, setRegras] = useState(regrasMock)

  const toggleAtivo = (id: string) => {
    setRegras(r => r.map(rule => rule.id === id ? { ...rule, ativo: !rule.ativo } : rule))
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Regras de Tramitação</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">
            Configure regras de negócio sem editar código. As regras são auditáveis e versionadas.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
          <Plus size={14} />
          Nova Regra
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total de regras', value: regras.length },
          { label: 'Ativas', value: regras.filter(r => r.ativo).length, color: 'text-[#1fa870]' },
          { label: 'Inativas', value: regras.filter(r => !r.ativo).length, color: 'text-[#5c6282]' },
          { label: 'Tipos distintos', value: new Set(regras.map(r => r.tipo)).size },
        ].map(stat => (
          <div key={stat.label} className="bg-[#13161f] border border-[#1e2333] rounded-lg p-3 text-center">
            <div className={`text-[22px] font-bold font-mono ${stat.color || 'text-[#e8eaf0]'}`}>{stat.value}</div>
            <div className="text-[11px] text-[#5c6282] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(tipoConfig).map(([tipo, cfg]) => (
          <span key={tipo} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Lista de regras */}
      <div className="space-y-2">
        {regras.sort((a, b) => b.prioridade - a.prioridade).map(regra => {
          const tc = tipoConfig[regra.tipo] ?? { label: regra.tipo, bg: 'bg-[#1c202e]', text: 'text-[#9198b0]' }
          const isExpanded = expandido === regra.id

          return (
            <div
              key={regra.id}
              className={`border rounded-lg transition-colors ${
                regra.ativo ? 'border-[#1e2333] bg-[#13161f]' : 'border-[#1e2333] bg-[#0f1117] opacity-60'
              }`}
            >
              {/* Header da regra */}
              <div
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
                onClick={() => setExpandido(isExpanded ? null : regra.id)}
              >
                <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tc.bg} ${tc.text}`}>
                  {tc.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#e8eaf0]">{regra.nome}</div>
                  <div className="text-[11px] text-[#5c6282] mt-0.5 truncate">{regra.descricao}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {regra.tipoMateria && (
                    <span className="font-mono text-[10px] bg-[#0f1117] border border-[#1e2333] px-2 py-0.5 rounded text-[#5c6282]">
                      {regra.tipoMateria}
                    </span>
                  )}
                  <span className="text-[10px] text-[#5c6282]">p={regra.prioridade}</span>
                  <span className="text-[10px] text-[#5c6282] font-mono">v{regra.versao}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAtivo(regra.id) }}
                    className={`transition-colors ${regra.ativo ? 'text-[#1fa870]' : 'text-[#5c6282]'}`}
                  >
                    {regra.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-[#5c6282]" /> : <ChevronDown size={14} className="text-[#5c6282]" />}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-0 border-t border-[#1e2333]">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider mb-2">
                        Condições
                      </div>
                      <pre className="bg-[#0f1117] border border-[#1e2333] rounded-md p-3 text-[11px] font-mono text-[#9198b0] overflow-x-auto">
                        {JSON.stringify(regra.condicoes, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider mb-2">
                        Ações
                      </div>
                      <pre className="bg-[#0f1117] border border-[#1e2333] rounded-md p-3 text-[11px] font-mono text-[#9198b0] overflow-x-auto">
                        {JSON.stringify(regra.acoes, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button className="text-[12px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-3 py-1.5 rounded-md transition-colors">
                      Editar
                    </button>
                    <button className="text-[12px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-3 py-1.5 rounded-md transition-colors">
                      Duplicar
                    </button>
                    <button className="text-[12px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-3 py-1.5 rounded-md transition-colors">
                      Histórico
                    </button>
                    <span className="text-[11px] text-[#5c6282] ml-auto">Atualizado em {regra.atualizadoEm}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
