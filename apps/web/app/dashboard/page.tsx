import { ArrowRight, Calendar, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getStatusStyle } from '@/lib/status-config'

interface Kpi {
  label: string
  value: number
  change: string
  colorClass: string
  bgClass: string
}

const KPIS: Kpi[] = [
  { label: 'Em tramitação',  value: 47, change: '+3 esta semana',      colorClass: 'text-brand-blue',  bgClass: 'bg-brand-blue-soft' },
  { label: 'Em comissão',    value: 12, change: '4 com prazo vencendo', colorClass: 'text-brand-amber', bgClass: 'bg-brand-amber-soft' },
  { label: 'Aprovados no mês', value: 8, change: '+2 vs. mês anterior', colorClass: 'text-brand-green', bgClass: 'bg-brand-green-soft' },
  { label: 'Pendências',     value: 6,  change: 'Assinaturas em fila', colorClass: 'text-brand-red',   bgClass: 'bg-brand-red-soft' },
]

const PROPOSICOES_RECENTES = [
  { numero: 'PL-024/2024',  ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica',           status: 'EM_COMISSAO',                   autor: 'Ver. Marcos Oliveira', atualizado: '18/04/2024' },
  { numero: 'REQ-031/2024', ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura',     status: 'PROTOCOLADO',                   autor: 'Ver. Sandra Costa',  atualizado: '22/04/2024' },
  { numero: 'MOC-008/2024', ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária',  status: 'EM_PAUTA',                      autor: 'Ver. João Ferreira', atualizado: '24/04/2024' },
  { numero: 'PL-019/2024',  ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos',        status: 'APROVADO',                      autor: 'Ver. Ana Lima',      atualizado: '15/04/2024' },
  { numero: 'PDL-003/2024', ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes',     status: 'AGUARDANDO_PARECER_JURIDICO',   autor: 'Mesa Diretora',     atualizado: '10/04/2024' },
]

const TAREFAS_PENDENTES = [
  { titulo: 'Assinar Parecer CMA — PL-024/2024',      prazo: 'Hoje',    urgente: true },
  { titulo: 'Incluir MOC-008/2024 em pauta',          prazo: 'Amanhã',  urgente: false },
  { titulo: 'Emitir parecer jurídico — PDL-003/2024', prazo: '27/04',   urgente: false },
  { titulo: 'Registrar presença sessão 012/2024',     prazo: '25/04',   urgente: false },
]

const PROXIMAS_SESSOES = [
  { numero: '012/2024', tipo: 'Ordinária', data: '25/04/2024', hora: '19h00', itens: 5 },
  { numero: '013/2024', tipo: 'Ordinária', data: '02/05/2024', hora: '19h00', itens: 2 },
]

const STATS_PRODUCAO = [
  { label: 'Protocoladas',  value: '62' },
  { label: 'Aprovadas',     value: '31' },
  { label: 'Em andamento',  value: '47' },
  { label: 'Arquivadas',    value: '8' },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Painel Legislativo</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">Câmara Municipal de São Francisco · 2ª Legislatura 2021–2024</p>
        </div>
        <Link
          href="/proposicoes/nova"
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nova Proposição
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map(kpi => (
          <div key={kpi.label} className={`${kpi.bgClass} border border-line rounded-lg p-4`}>
            <div className={`text-3xl font-semibold font-mono ${kpi.colorClass}`}>{kpi.value}</div>
            <div className="text-[12px] font-medium text-fg-2 mt-1">{kpi.label}</div>
            <div className="text-[11px] text-fg-3 mt-1">{kpi.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Recent propositions */}
        <div className="col-span-2 bg-surface-1 border border-line rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <div className="text-[13px] font-semibold text-fg-1">Proposições Recentes</div>
            <Link href="/proposicoes" className="text-[12px] text-brand-blue hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {PROPOSICOES_RECENTES.map(p => {
              const s = getStatusStyle(p.status)
              return (
                <Link
                  key={p.numero}
                  href={`/proposicoes/${p.numero.toLowerCase().replace('/', '-')}`}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[12px] font-medium text-brand-blue">{p.numero}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                    </div>
                    <div className="text-[13px] text-fg-2 leading-snug line-clamp-1">{p.ementa}</div>
                    <div className="text-[11px] text-fg-3 mt-1">{p.autor} · {p.atualizado}</div>
                  </div>
                  <ArrowRight size={14} className="text-fg-3 group-hover:text-fg-2 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Pending tasks */}
          <div className="bg-surface-1 border border-line rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <Clock size={13} className="text-brand-amber" />
              <div className="text-[13px] font-semibold text-fg-1">Minhas Pendências</div>
              <span className="ml-auto text-[11px] font-medium bg-brand-amber-soft text-brand-amber px-2 py-0.5 rounded-full">
                {TAREFAS_PENDENTES.length}
              </span>
            </div>
            <div className="divide-y divide-line">
              {TAREFAS_PENDENTES.map((t, i) => (
                <div key={i} className="px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer">
                  <div className="text-[12px] text-fg-1 leading-snug">{t.titulo}</div>
                  <div className={`text-[11px] mt-1 font-medium ${t.urgente ? 'text-brand-red' : 'text-fg-3'}`}>
                    {t.urgente && '⚠ '}Prazo: {t.prazo}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming sessions */}
          <div className="bg-surface-1 border border-line rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <Calendar size={13} className="text-brand-blue" />
              <div className="text-[13px] font-semibold text-fg-1">Próximas Sessões</div>
            </div>
            <div className="divide-y divide-line">
              {PROXIMAS_SESSOES.map(s => {
                const [day, month, year] = s.data.split('/')
                return (
                  <Link
                    key={s.numero}
                    href={`/sessoes/${s.numero}`}
                    className="flex items-start px-4 py-3.5 gap-3 hover:bg-surface-2 transition-colors"
                  >
                    <div className="w-10 text-center flex-shrink-0">
                      <div className="text-[11px] text-fg-3 font-mono uppercase">{month}/{year.slice(2)}</div>
                      <div className="text-lg font-bold text-brand-blue leading-none font-mono">{day}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-fg-1">Sessão {s.tipo} {s.numero}</div>
                      <div className="text-[11px] text-fg-3">{s.hora} · {s.itens} item{s.itens !== 1 ? 's' : ''} na pauta</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Legislative stats */}
          <div className="bg-brand-green-soft border border-line rounded-lg px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-brand-green" />
              <span className="text-[12px] font-semibold text-brand-green">Produção legislativa 2024</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STATS_PRODUCAO.map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[18px] font-bold font-mono text-brand-green">{value}</div>
                  <div className="text-[11px] text-fg-3">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
