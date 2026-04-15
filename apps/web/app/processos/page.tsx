'use client'

import { useState } from 'react'
import { GitBranch, Play, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const instanciasMock = [
  {
    id: 'i1', proposicaoNumero: 'PL-024/2024', fluxo: 'Tramitação Básica', etapaAtual: 'task_comissao',
    etapaLabel: 'Análise em Comissão', status: 'ACTIVE', duracao: '46d', responsavel: 'CMA',
    prazo: '27/04/2024', vencido: false,
  },
  {
    id: 'i2', proposicaoNumero: 'PL-017/2024', fluxo: 'Tramitação Urgente', etapaAtual: 'task_comissao',
    etapaLabel: 'Análise em Comissão', status: 'ACTIVE', duracao: '35d', responsavel: 'CMA',
    prazo: '25/04/2024', vencido: true,
  },
  {
    id: 'i3', proposicaoNumero: 'PDL-003/2024', fluxo: 'Tramitação Básica', etapaAtual: 'task_parecer_juridico',
    etapaLabel: 'Parecer Jurídico', status: 'ACTIVE', duracao: '43d', responsavel: 'PJU',
    prazo: '28/04/2024', vencido: false,
  },
  {
    id: 'i4', proposicaoNumero: 'REQ-031/2024', fluxo: 'Requerimento', etapaAtual: 'task_analise_inicial',
    etapaLabel: 'Análise Inicial', status: 'ACTIVE', duracao: '2d', responsavel: 'SEC',
    prazo: '02/05/2024', vencido: false,
  },
  {
    id: 'i5', proposicaoNumero: 'PL-019/2024', fluxo: 'Tramitação Básica', etapaAtual: 'task_publicacao',
    etapaLabel: 'Publicação', status: 'ACTIVE', duracao: '68d', responsavel: 'PUB',
    prazo: '26/04/2024', vencido: false,
  },
]

const tarefasPendentes = [
  { id: 't1', nome: 'Elaborar Parecer Jurídico', proposicao: 'PDL-003/2024', perfil: 'PROCURADORIA', prazo: '28/04', criada: '10/04' },
  { id: 't2', nome: 'Análise em Comissão', proposicao: 'PL-024/2024', perfil: 'COMISSAO_PERMANENTE', prazo: '27/04', criada: '27/03' },
  { id: 't3', nome: 'Análise em Comissão', proposicao: 'PL-017/2024', perfil: 'COMISSAO_PERMANENTE', prazo: '25/04', criada: '20/03' },
  { id: 't4', nome: 'Análise Inicial', proposicao: 'REQ-031/2024', perfil: 'PROTOCOLO', prazo: '02/05', criada: '22/04' },
  { id: 't5', nome: 'Publicar no Diário Oficial', proposicao: 'PL-019/2024', perfil: 'PUBLICACAO', prazo: '26/04', criada: '15/04' },
]

const perfilConfig: Record<string, string> = {
  PROCURADORIA: 'text-brand-purple',
  COMISSAO_PERMANENTE: 'text-brand-blue',
  PROTOCOLO: 'text-fg-2',
  PUBLICACAO: 'text-brand-green',
  MESA_DIRETORA: 'text-brand-amber',
  PRESIDENCIA: 'text-brand-amber',
}

export default function ProcessosPage() {
  const [abaAtiva, setAbaAtiva] = useState<'instancias' | 'tarefas' | 'definicoes'>('instancias')
  const [atualizando, setAtualizando] = useState(false)

  const simularAtualizar = () => {
    setAtualizando(true)
    setTimeout(() => setAtualizando(false), 800)
  }

  const vencidas = instanciasMock.filter(i => i.vencido).length

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Motor de Processos</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">Monitoramento de instâncias Camunda em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] text-brand-green">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Camunda conectado
          </div>
          <button
            onClick={simularAtualizar}
            className={`flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:text-fg-1 px-3 py-1.5 rounded-md transition-colors ${atualizando ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={12} className={atualizando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <Link
            href="/admin/fluxos"
            className="flex items-center gap-1.5 text-[12px] bg-brand-blue hover:bg-brand-blue-2 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            <GitBranch size={12} />
            Gerenciar Fluxos
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Instâncias ativas', value: instanciasMock.length, color: 'text-brand-blue', bg: 'bg-brand-blue-soft' },
          { label: 'Tarefas pendentes', value: tarefasPendentes.length, color: 'text-brand-amber', bg: 'bg-brand-amber-soft' },
          { label: 'Vencidas', value: vencidas, color: vencidas > 0 ? 'text-brand-red' : 'text-brand-green', bg: vencidas > 0 ? 'bg-brand-red-soft' : 'bg-brand-green-soft' },
          { label: 'Fluxos ativos', value: 3, color: 'text-brand-green', bg: 'bg-brand-green-soft' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-line rounded-lg p-4`}>
            <div className={`text-[26px] font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-fg-3 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <div className="flex gap-0">
          {[
            { id: 'instancias', label: `Instâncias (${instanciasMock.length})` },
            { id: 'tarefas', label: `Tarefas Pendentes (${tarefasPendentes.length})` },
            { id: 'definicoes', label: 'Definições de Processo' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setAbaAtiva(t.id as typeof abaAtiva)}
              className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                abaAtiva === t.id
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-fg-3 hover:text-fg-2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Instâncias */}
      {abaAtiva === 'instancias' && (
        <div className="space-y-2">
          {instanciasMock.map(inst => (
            <div key={inst.id} className={`bg-surface-1 border rounded-lg px-5 py-3.5 flex items-center gap-4 ${
              inst.vencido ? 'border-brand-red/40' : 'border-line'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                inst.vencido ? 'bg-brand-red' : 'bg-brand-green animate-pulse'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="font-mono text-[13px] font-semibold text-brand-blue">{inst.proposicaoNumero}</span>
                  <span className="text-[10px] bg-surface-2 text-fg-2 px-2 py-0.5 rounded-full">{inst.fluxo}</span>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-fg-2">
                  <span className="flex items-center gap-1">
                    <Play size={10} className="text-brand-blue" />
                    {inst.etapaLabel}
                  </span>
                  <span className="text-fg-3">Responsável: <span className="font-mono text-fg-2">{inst.responsavel}</span></span>
                  <span className="flex items-center gap-1 text-fg-3">
                    <Clock size={10} /> {inst.duracao}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-[12px] font-mono ${inst.vencido ? 'text-brand-red' : 'text-fg-2'}`}>
                  {inst.vencido && '⚠ '}Prazo: {inst.prazo}
                </div>
                {inst.vencido && (
                  <div className="text-[10px] text-brand-red">Vencido</div>
                )}
              </div>
              <Link
                href={`/proposicoes/${inst.id}/tramitacao`}
                className="text-fg-3 hover:text-fg-2 transition-colors flex-shrink-0"
              >
                <ChevronRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Tarefas */}
      {abaAtiva === 'tarefas' && (
        <div className="space-y-2">
          {tarefasPendentes.map(tarefa => (
            <div key={tarefa.id} className="bg-surface-1 border border-line rounded-lg px-5 py-3.5 flex items-center gap-4 hover:bg-surface-2 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-fg-1">{tarefa.nome}</div>
                <div className="flex items-center gap-3 mt-1 text-[11px]">
                  <span className="font-mono text-brand-blue">{tarefa.proposicao}</span>
                  <span className={`${perfilConfig[tarefa.perfil] ?? 'text-fg-2'}`}>{tarefa.perfil.replace(/_/g, ' ')}</span>
                  <span className="text-fg-3">Aberta em {tarefa.criada}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] text-fg-2">Prazo: <span className="font-mono">{tarefa.prazo}</span></div>
              </div>
              <button className="text-[12px] border border-line text-fg-2 hover:border-brand-blue hover:text-brand-blue px-3 py-1.5 rounded-md transition-colors flex-shrink-0">
                Assumir
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Definições */}
      {abaAtiva === 'definicoes' && (
        <div className="space-y-3">
          {[
            { key: 'tramitacao_proposicao_basica', nome: 'Tramitação Básica — PL/PDL', versao: 3, instancias: 12 },
            { key: 'tramitacao_urgente', nome: 'Tramitação Urgente', versao: 1, instancias: 2 },
            { key: 'tramitacao_moc_req', nome: 'Moção / Requerimento', versao: 2, instancias: 7 },
          ].map(def => (
            <div key={def.key} className="bg-surface-1 border border-line rounded-lg px-5 py-4 flex items-center gap-4">
              <GitBranch size={16} className="text-brand-blue flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-fg-1">{def.nome}</div>
                <div className="text-[11px] text-fg-3 font-mono mt-0.5">{def.key}</div>
              </div>
              <div className="text-[12px] text-fg-2">v{def.versao}</div>
              <div className="flex items-center gap-1 text-[12px] text-brand-green">
                <Play size={11} /> {def.instancias} ativas
              </div>
              <Link
                href="/admin/fluxos"
                className="text-[11px] border border-line text-fg-2 hover:text-fg-1 px-3 py-1.5 rounded-md transition-colors"
              >
                Gerenciar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
