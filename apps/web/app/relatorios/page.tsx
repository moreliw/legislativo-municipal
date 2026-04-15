'use client'

import { useState } from 'react'
import { BarChart2, Download, TrendingUp, FileText, Users, Calendar } from 'lucide-react'

const dadosMensais = [
  { mes: 'Jan', protocoladas: 8, aprovadas: 4, rejeitadas: 1 },
  { mes: 'Fev', protocoladas: 12, aprovadas: 6, rejeitadas: 2 },
  { mes: 'Mar', protocoladas: 9, aprovadas: 5, rejeitadas: 0 },
  { mes: 'Abr', protocoladas: 11, aprovadas: 8, rejeitadas: 1 },
  { mes: 'Mai', protocoladas: 7, aprovadas: 3, rejeitadas: 2 },
  { mes: 'Jun', protocoladas: 15, aprovadas: 9, rejeitadas: 3 },
]

const distribuicaoPorTipo = [
  { tipo: 'PL', total: 28, aprovadas: 18, cor: 'var(--blue)', pct: 45 },
  { tipo: 'REQ', total: 14, aprovadas: 14, cor: 'var(--green)', pct: 23 },
  { tipo: 'MOC', total: 9, aprovadas: 9, cor: 'var(--amber)', pct: 15 },
  { tipo: 'IND', total: 6, aprovadas: 6, cor: 'var(--purple)', pct: 10 },
  { tipo: 'PDL', total: 3, aprovadas: 2, cor: 'var(--text-3)', pct: 5 },
  { tipo: 'Outros', total: 2, aprovadas: 1, cor: 'var(--text-3)', pct: 3 },
]

const distribuicaoStatus = [
  { status: 'Em tramitação', valor: 47, cor: 'var(--blue)' },
  { status: 'Em comissão', valor: 12, cor: 'var(--purple)' },
  { status: 'Aprovadas', valor: 31, cor: 'var(--green)' },
  { status: 'Rejeitadas', valor: 8, cor: 'var(--red)' },
  { status: 'Arquivadas', valor: 22, cor: 'var(--text-3)' },
]

const relatoriosDisponiveis = [
  { id: 'r1', nome: 'Proposições por status', descricao: 'Listagem completa com filtros de status, tipo e período', formato: 'PDF/XLSX' },
  { id: 'r2', nome: 'Produção legislativa mensal', descricao: 'Totais mensais de protocoladas, aprovadas e rejeitadas', formato: 'PDF/XLSX' },
  { id: 'r3', nome: 'Tramitação em aberto', descricao: 'Proposições pendentes com prazo e responsável', formato: 'PDF' },
  { id: 'r4', nome: 'Votações por sessão', descricao: 'Registro de votos por proposição e vereador', formato: 'PDF/XLSX' },
  { id: 'r5', nome: 'Auditoria de acessos', descricao: 'Log completo de operações por usuário e período', formato: 'XLSX' },
  { id: 'r6', nome: 'Presença em sessões', descricao: 'Frequência de vereadores nas sessões plenárias', formato: 'PDF/XLSX' },
]

const maxVal = Math.max(...dadosMensais.map(d => d.protocoladas))

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState('2024')
  const [gerandoId, setGerandoId] = useState<string | null>(null)

  const simularDownload = (id: string) => {
    setGerandoId(id)
    setTimeout(() => setGerandoId(null), 1500)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Relatórios e Análises</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">Dados de produção legislativa e tramitação</p>
        </div>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="bg-surface-1 border border-line rounded-md px-3 py-2 text-[13px] text-fg-2 focus:outline-none"
        >
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
      </div>

      {/* KPIs do ano */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Protocoladas', value: 62, change: '+8 vs 2023', color: 'text-fg-1' },
          { label: 'Aprovadas', value: 31, change: '50% aprovação', color: 'text-brand-green' },
          { label: 'Rejeitadas', value: 8, change: '13% rejeição', color: 'text-brand-red' },
          { label: 'Em andamento', value: 47, change: 'até hoje', color: 'text-brand-blue' },
          { label: 'Sessões realizadas', value: 11, change: '+2 extraordinárias', color: 'text-brand-amber' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface-1 border border-line rounded-lg p-4">
            <div className={`text-[26px] font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[12px] font-medium text-fg-2 mt-0.5">{kpi.label}</div>
            <div className="text-[11px] text-fg-3 mt-0.5">{kpi.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Gráfico de barras mensal */}
        <div className="col-span-2 bg-surface-1 border border-line rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[13px] font-semibold text-fg-1">Proposições por mês</div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-blue" /> Protocoladas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-green" /> Aprovadas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-red" /> Rejeitadas</span>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {dadosMensais.map(d => (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: '160px' }}>
                  {/* Protocoladas */}
                  <div className="flex-1 bg-brand-blue rounded-t-sm transition-all" style={{ height: `${(d.protocoladas / maxVal) * 160}px` }} title={`${d.protocoladas} protocoladas`} />
                  {/* Aprovadas */}
                  <div className="flex-1 bg-brand-green rounded-t-sm transition-all" style={{ height: `${(d.aprovadas / maxVal) * 160}px` }} title={`${d.aprovadas} aprovadas`} />
                  {/* Rejeitadas */}
                  <div className="flex-1 bg-brand-red rounded-t-sm transition-all" style={{ height: `${(d.rejeitadas / maxVal) * 160}px` }} title={`${d.rejeitadas} rejeitadas`} />
                </div>
                <div className="text-[10px] text-fg-3 font-mono">{d.mes}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por tipo */}
        <div className="bg-surface-1 border border-line rounded-lg p-5">
          <div className="text-[13px] font-semibold text-fg-1 mb-4">Por tipo de matéria</div>
          <div className="space-y-3">
            {distribuicaoPorTipo.map(d => (
              <div key={d.tipo}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="font-mono font-semibold" style={{ color: d.cor }}>{d.tipo}</span>
                  <span className="text-fg-2">{d.total}</span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.cor }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">Por status atual</div>
            <div className="space-y-2">
              {distribuicaoStatus.map(d => (
                <div key={d.status} className="flex items-center gap-2 text-[12px]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor }} />
                  <span className="text-fg-2 flex-1">{d.status}</span>
                  <span className="font-mono text-fg-1">{d.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relatórios disponíveis */}
      <div className="bg-surface-1 border border-line rounded-lg">
        <div className="px-5 py-3.5 border-b border-line">
          <div className="text-[13px] font-semibold text-fg-1">Relatórios disponíveis</div>
        </div>
        <div className="divide-y divide-line">
          {relatoriosDisponiveis.map(rel => (
            <div key={rel.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors">
              <div className="w-9 h-9 rounded-md bg-brand-blue-soft flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-fg-1">{rel.nome}</div>
                <div className="text-[11px] text-fg-3 mt-0.5">{rel.descricao}</div>
              </div>
              <div className="text-[10px] font-mono text-fg-3 flex-shrink-0">{rel.formato}</div>
              <button
                onClick={() => simularDownload(rel.id)}
                disabled={gerandoId === rel.id}
                className="flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:border-brand-blue hover:text-brand-blue px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Download size={12} />
                {gerandoId === rel.id ? 'Gerando...' : 'Baixar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
