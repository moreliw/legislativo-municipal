'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, CheckCircle, Clock, AlertCircle, GitBranch, RefreshCw } from 'lucide-react'

interface Atividade {
  id: string
  activityId: string
  activityName: string
  activityType: 'userTask' | 'serviceTask' | 'startEvent' | 'endEvent' | 'gateway'
  startTime: string
  endTime: string | null
  durationMs: number | null
  assignee: string | null
  status: 'COMPLETED' | 'ACTIVE' | 'WAITING'
}

const atividadesMock: Atividade[] = [
  { id: 'a1', activityId: 'inicio_protocolo', activityName: 'Proposição Protocolada', activityType: 'startEvent', startTime: '2024-03-10T09:30:00Z', endTime: '2024-03-10T09:30:01Z', durationMs: 100, assignee: null, status: 'COMPLETED' },
  { id: 'a2', activityId: 'task_analise_inicial', activityName: 'Análise Inicial', activityType: 'userTask', startTime: '2024-03-10T09:30:01Z', endTime: '2024-03-11T08:00:00Z', durationMs: 82799000, assignee: 'Ana Beatriz Santos', status: 'COMPLETED' },
  { id: 'a3', activityId: 'gw_conforme', activityName: 'Documentação Conforme?', activityType: 'gateway', startTime: '2024-03-11T08:00:00Z', endTime: '2024-03-11T08:00:01Z', durationMs: 50, assignee: null, status: 'COMPLETED' },
  { id: 'a4', activityId: 'task_regras_roteamento', activityName: 'Avaliar Regras de Roteamento', activityType: 'serviceTask', startTime: '2024-03-11T08:00:01Z', endTime: '2024-03-11T08:00:05Z', durationMs: 4000, assignee: null, status: 'COMPLETED' },
  { id: 'a5', activityId: 'gw_exige_juridico', activityName: 'Exige Parecer Jurídico?', activityType: 'gateway', startTime: '2024-03-11T08:00:05Z', endTime: '2024-03-11T08:00:06Z', durationMs: 100, assignee: null, status: 'COMPLETED' },
  { id: 'a6', activityId: 'task_parecer_juridico', activityName: 'Elaborar Parecer Jurídico', activityType: 'userTask', startTime: '2024-03-13T10:15:00Z', endTime: '2024-03-25T16:40:00Z', durationMs: 1066500000, assignee: 'Dra. Fernanda Rocha', status: 'COMPLETED' },
  { id: 'a7', activityId: 'gw_apos_juridico', activityName: 'Merge pós-jurídico', activityType: 'gateway', startTime: '2024-03-25T16:40:00Z', endTime: '2024-03-25T16:40:01Z', durationMs: 50, assignee: null, status: 'COMPLETED' },
  { id: 'a8', activityId: 'task_comissao', activityName: 'Análise em Comissão', activityType: 'userTask', startTime: '2024-03-27T09:00:00Z', endTime: null, durationMs: null, assignee: 'Ver. Patricia Alves (CMA)', status: 'ACTIVE' },
]

const tipoIcone: Record<string, { icon: typeof Play; cor: string; bg: string }> = {
  startEvent:  { icon: Play,         cor: 'text-brand-green', bg: 'bg-brand-green-soft' },
  endEvent:    { icon: CheckCircle,  cor: 'text-brand-green', bg: 'bg-brand-green-soft' },
  userTask:    { icon: Clock,        cor: 'text-brand-blue', bg: 'bg-brand-blue-soft' },
  serviceTask: { icon: GitBranch,   cor: 'text-brand-purple', bg: 'bg-brand-purple-soft' },
  gateway:     { icon: AlertCircle, cor: 'text-brand-amber', bg: 'bg-brand-amber-soft' },
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '...'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h`
  return `${Math.round(ms / 86400000)}d`
}

export default function ProcessoDetailPage({ params }: { params: { proposicaoId: string } }) {
  const [atualizando, setAtualizando] = useState(false)
  const instanciaAtiva = atividadesMock.find(a => a.status === 'ACTIVE')
  const pct = Math.round((atividadesMock.filter(a => a.status === 'COMPLETED').length / atividadesMock.length) * 100)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/processos" className="text-fg-3 hover:text-fg-2 transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-fg-1">Instância do Processo</h1>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-fg-3">
            <span className="font-mono text-brand-blue">PL-024/2024</span>
            <span>·</span>
            <span>Tramitação Básica v1</span>
            <span>·</span>
            <div className="flex items-center gap-1 text-brand-green">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              Em execução
            </div>
          </div>
        </div>
        <button
          onClick={() => { setAtualizando(true); setTimeout(() => setAtualizando(false), 800) }}
          className={`flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:text-fg-1 px-3 py-2 rounded-md transition-colors ${atualizando ? 'opacity-50' : ''}`}
        >
          <RefreshCw size={12} className={atualizando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Progresso */}
      <div className="bg-surface-1 border border-line rounded-lg p-5">
        <div className="flex items-center justify-between text-[12px] mb-3">
          <span className="text-fg-2">
            <span className="font-semibold">{atividadesMock.filter(a => a.status === 'COMPLETED').length}</span> atividades concluídas
            de <span className="font-semibold">{atividadesMock.length}</span>
          </span>
          <span className="font-mono text-fg-1 font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-blue rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {instanciaAtiva && (
          <div className="mt-3 text-[12px] text-fg-3">
            Etapa atual: <span className="text-brand-amber font-medium">{instanciaAtiva.activityName}</span>
            {instanciaAtiva.assignee && <span> · Responsável: {instanciaAtiva.assignee}</span>}
          </div>
        )}
      </div>

      {/* Lista de atividades */}
      <div className="bg-surface-1 border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div className="text-[13px] font-semibold text-fg-1">Histórico de Atividades Camunda</div>
          <div className="text-[11px] font-mono text-fg-3">cam_inst_pl024</div>
        </div>

        <div className="divide-y divide-line">
          {atividadesMock.map((ativ, i) => {
            const ti = tipoIcone[ativ.activityType] ?? tipoIcone.userTask
            const Icon = ti.icon

            return (
              <div key={ativ.id} className={`flex items-start gap-4 px-5 py-4 ${ativ.status === 'ACTIVE' ? 'bg-brand-blue-soft' : ''}`}>
                {/* Ícone */}
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${ti.bg}`}>
                  <Icon size={14} className={ti.cor} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-fg-1">{ativ.activityName}</span>
                    {ativ.status === 'ACTIVE' && (
                      <span className="text-[10px] bg-brand-green-soft text-brand-green border border-brand-green/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
                        Em andamento
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-[11px] text-fg-3">
                    <span className="font-mono text-fg-3">{ativ.activityId}</span>
                    {ativ.assignee && <span>· {ativ.assignee}</span>}
                    <span className="font-mono">
                      {new Date(ativ.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Duração */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-[12px] font-mono ${ativ.status === 'ACTIVE' ? 'text-brand-amber' : 'text-fg-2'}`}>
                    {ativ.status === 'ACTIVE' ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> em andamento
                      </span>
                    ) : (
                      formatDuration(ativ.durationMs)
                    )}
                  </div>
                  {ativ.endTime && (
                    <div className="text-[10px] text-fg-3 font-mono mt-0.5">
                      {new Date(ativ.endTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Variáveis do processo */}
      <div className="bg-surface-1 border border-line rounded-lg">
        <div className="px-5 py-3 border-b border-line">
          <div className="text-[13px] font-semibold text-fg-1">Variáveis do Processo</div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {[
            ['proposicaoId', 'p1', 'String'],
            ['tipoMateria', 'PL', 'String'],
            ['origem', 'VEREADOR', 'String'],
            ['regime', 'ORDINARIO', 'String'],
            ['exigeParecerJuridico', 'true', 'Boolean'],
            ['comissaoResponsavel', 'COMISSAO_LEGISLACAO', 'String'],
            ['prazoDias', '40', 'Integer'],
            ['conforme', 'true', 'Boolean'],
            ['parecerJuridico', 'FAVORAVEL_COM_RESSALVAS', 'String'],
          ].map(([chave, valor, tipo]) => (
            <div key={chave} className="flex items-center gap-3 bg-surface-0 border border-line rounded px-3 py-2">
              <span className="font-mono text-[11px] text-fg-2 flex-1 truncate">{chave}</span>
              <span className="font-mono text-[11px] text-brand-blue truncate max-w-[120px]">{valor}</span>
              <span className="text-[9px] text-fg-3 flex-shrink-0">{tipo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
