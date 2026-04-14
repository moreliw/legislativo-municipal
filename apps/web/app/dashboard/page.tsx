import { FileText, Clock, CheckCircle, AlertTriangle, Calendar, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const kpis = [
  { label: 'Em tramitação', value: 47, change: '+3 esta semana', color: 'text-[#2d7dd2]', bg: 'bg-[#0d1e35]' },
  { label: 'Em comissão', value: 12, change: '4 com prazo vencendo', color: 'text-[#e8a020]', bg: 'bg-[#2e1f06]' },
  { label: 'Aprovados no mês', value: 8, change: '+2 vs. mês anterior', color: 'text-[#1fa870]', bg: 'bg-[#0a2318]' },
  { label: 'Pendências', value: 6, change: 'Assinaturas em fila', color: 'text-[#d94040]', bg: 'bg-[#2e0e0e]' },
]

const proposicoesRecentes = [
  { numero: 'PL-024/2024', ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica', status: 'EM_COMISSAO', autor: 'Ver. Marcos Oliveira', atualizado: '18/04/2024' },
  { numero: 'REQ-031/2024', ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura', status: 'PROTOCOLADO', autor: 'Ver. Sandra Costa', atualizado: '22/04/2024' },
  { numero: 'MOC-008/2024', ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária', status: 'EM_PAUTA', autor: 'Ver. João Ferreira', atualizado: '24/04/2024' },
  { numero: 'PL-019/2024', ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos', status: 'APROVADO', autor: 'Ver. Ana Lima', atualizado: '15/04/2024' },
  { numero: 'PDL-003/2024', ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes', status: 'AGUARDANDO_PARECER_JURIDICO', autor: 'Mesa Diretora', atualizado: '10/04/2024' },
]

const tarefasPendentes = [
  { titulo: 'Assinar Parecer CMA — PL-024/2024', prazo: 'Hoje', urgente: true },
  { titulo: 'Incluir MOC-008/2024 em pauta', prazo: 'Amanhã', urgente: false },
  { titulo: 'Emitir parecer jurídico — PDL-003/2024', prazo: '27/04', urgente: false },
  { titulo: 'Registrar presença sessão 012/2024', prazo: '25/04', urgente: false },
]

const proximasSessoes = [
  { numero: '012/2024', tipo: 'Ordinária', data: '25/04/2024', hora: '19h00', itens: 5 },
  { numero: '013/2024', tipo: 'Ordinária', data: '02/05/2024', hora: '19h00', itens: 2 },
]

const statusConfig: Record<string, { label: string; classes: string }> = {
  RASCUNHO: { label: 'Rascunho', classes: 'bg-[#1c202e] text-[#5c6282]' },
  PROTOCOLADO: { label: 'Protocolado', classes: 'bg-[#0d1e35] text-[#2d7dd2]' },
  EM_ANALISE: { label: 'Em análise', classes: 'bg-[#1a1030] text-[#9178e0]' },
  EM_COMISSAO: { label: 'Em comissão', classes: 'bg-[#1a1030] text-[#9178e0]' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico', classes: 'bg-[#2e1f06] text-[#e8a020]' },
  EM_PAUTA: { label: 'Em pauta', classes: 'bg-[#2e1f06] text-[#e8a020]' },
  APROVADO: { label: 'Aprovado', classes: 'bg-[#0a2318] text-[#1fa870]' },
  REJEITADO: { label: 'Rejeitado', classes: 'bg-[#2e0e0e] text-[#d94040]' },
  PUBLICADO: { label: 'Publicado', classes: 'bg-[#0a2318] text-[#1fa870]' },
  ARQUIVADO: { label: 'Arquivado', classes: 'bg-[#1c202e] text-[#5c6282]' },
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Painel Legislativo</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">Câmara Municipal de São Francisco · 2ª Legislatura 2021–2024</p>
        </div>
        <Link
          href="/proposicoes/nova"
          className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nova Proposição
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border border-[#1e2333] rounded-lg p-4`}>
            <div className={`text-3xl font-semibold font-mono ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[12px] font-medium text-[#9198b0] mt-1">{kpi.label}</div>
            <div className="text-[11px] text-[#5c6282] mt-1">{kpi.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Proposições recentes */}
        <div className="col-span-2 bg-[#13161f] border border-[#1e2333] rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2333]">
            <div className="text-[13px] font-semibold text-[#e8eaf0]">Proposições Recentes</div>
            <Link href="/proposicoes" className="text-[12px] text-[#2d7dd2] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#1e2333]">
            {proposicoesRecentes.map(p => {
              const s = statusConfig[p.status] ?? { label: p.status, classes: 'bg-[#1c202e] text-[#5c6282]' }
              return (
                <Link
                  key={p.numero}
                  href={`/proposicoes/${p.numero.toLowerCase().replace('/', '-')}`}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-[#1c202e] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[12px] font-medium text-[#2d7dd2]">{p.numero}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.classes}`}>{s.label}</span>
                    </div>
                    <div className="text-[13px] text-[#9198b0] leading-snug line-clamp-1">{p.ementa}</div>
                    <div className="text-[11px] text-[#5c6282] mt-1">{p.autor} · {p.atualizado}</div>
                  </div>
                  <ArrowRight size={14} className="text-[#5c6282] group-hover:text-[#9198b0] mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="space-y-5">
          {/* Tarefas pendentes */}
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2333]">
              <Clock size={13} className="text-[#e8a020]" />
              <div className="text-[13px] font-semibold text-[#e8eaf0]">Minhas Pendências</div>
              <span className="ml-auto text-[11px] font-medium bg-[#2e1f06] text-[#e8a020] px-2 py-0.5 rounded-full">
                {tarefasPendentes.length}
              </span>
            </div>
            <div className="divide-y divide-[#1e2333]">
              {tarefasPendentes.map((t, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#1c202e] transition-colors cursor-pointer">
                  <div className="text-[12px] text-[#e8eaf0] leading-snug">{t.titulo}</div>
                  <div className={`text-[11px] mt-1 font-medium ${t.urgente ? 'text-[#d94040]' : 'text-[#5c6282]'}`}>
                    {t.urgente && '⚠ '}Prazo: {t.prazo}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximas sessões */}
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2333]">
              <Calendar size={13} className="text-[#2d7dd2]" />
              <div className="text-[13px] font-semibold text-[#e8eaf0]">Próximas Sessões</div>
            </div>
            <div className="divide-y divide-[#1e2333]">
              {proximasSessoes.map(s => (
                <Link
                  key={s.numero}
                  href={`/sessoes/${s.numero}`}
                  className="flex items-start px-4 py-3.5 gap-3 hover:bg-[#1c202e] transition-colors group"
                >
                  <div className="w-10 text-center flex-shrink-0">
                    <div className="text-[11px] text-[#5c6282] font-mono uppercase">
                      {s.data.split('/')[1]}/{s.data.split('/')[2].slice(2)}
                    </div>
                    <div className="text-lg font-bold text-[#2d7dd2] leading-none font-mono">
                      {s.data.split('/')[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8eaf0]">Sessão {s.tipo} {s.numero}</div>
                    <div className="text-[11px] text-[#5c6282]">{s.hora} · {s.itens} item{s.itens !== 1 ? 's' : ''} na pauta</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Estatística rápida */}
          <div className="bg-[#0a2318] border border-[#1e2333] rounded-lg px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#1fa870]" />
              <span className="text-[12px] font-semibold text-[#1fa870]">Produção legislativa 2024</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Protocoladas', '62'], ['Aprovadas', '31'], ['Em andamento', '47'], ['Arquivadas', '8']].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[18px] font-bold font-mono text-[#1fa870]">{val}</div>
                  <div className="text-[11px] text-[#5c6282]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
