'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, CheckCircle2, Clock, User, Calendar, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/auth'

interface TarefaProcesso {
  id: string
  camundaTaskId: string
  nome: string
  tipo: string
  status: string
  prazo: string | null
  criadoEm: string
  atribuidoAId: string | null
  instancia: {
    proposicao: {
      id: string
      numero: string
      ementa: string
      status: string
      tipoMateria: { nome: string; sigla: string }
    } | null
  } | null
}

const TIPO_TAREFA_LABELS: Record<string, string> = {
  task_analise_inicial: 'Análise Inicial',
  task_parecer_juridico: 'Parecer Jurídico',
  task_comissao: 'Análise em Comissão',
  task_inclusao_pauta: 'Inclusão em Pauta',
  task_sessao_votacao: 'Sessão — Votação',
  task_redacao_final: 'Redação Final',
  task_assinatura: 'Assinatura',
  task_devolucao: 'Devolução ao Autor',
}

const STATUS_PROPOSICAO_COLORS: Record<string, string> = {
  PROTOCOLADO: 'text-cyan-600 bg-cyan-50',
  EM_ANALISE: 'text-blue-600 bg-blue-50',
  EM_COMISSAO: 'text-orange-600 bg-orange-50',
  EM_PAUTA: 'text-yellow-600 bg-yellow-50',
  EM_VOTACAO: 'text-purple-600 bg-purple-50',
  APROVADO: 'text-emerald-600 bg-emerald-50',
}

function isVencida(prazo: string | null) {
  if (!prazo) return false
  return new Date(prazo) < new Date()
}

function diasRestantes(prazo: string) {
  const diff = new Date(prazo).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ProcessosPage() {
  const [tarefas, setTarefas] = useState<TarefaProcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completando, setCompletando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'minhas' | 'vencidas'>('todas')

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<TarefaProcesso[]>('/api/v1/processos/tarefas/minhas')
      setTarefas(data)
    } catch {
      setError('Erro ao carregar tarefas. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const assumir = async (taskId: string) => {
    try {
      await apiFetch(`/api/v1/processos/tarefas/${taskId}/assumir`, { method: 'POST' })
      carregar()
    } catch {
      alert('Erro ao assumir tarefa')
    }
  }

  const completar = async (taskId: string) => {
    setCompletando(taskId)
    try {
      await apiFetch(`/api/v1/processos/tarefas/${taskId}/completar`, {
        method: 'POST',
        body: JSON.stringify({ descricao: 'Tarefa concluída pelo responsável' }),
      })
      carregar()
    } catch {
      alert('Erro ao completar tarefa')
    } finally {
      setCompletando(null)
    }
  }

  const tarefasFiltradas = tarefas.filter(t => {
    if (filtro === 'minhas') return !!t.atribuidoAId
    if (filtro === 'vencidas') return isVencida(t.prazo)
    return true
  })

  const contadores = {
    total: tarefas.length,
    minhas: tarefas.filter(t => !!t.atribuidoAId).length,
    vencidas: tarefas.filter(t => isVencida(t.prazo)).length,
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-fg-1">Tarefas do Processo</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">Gerencie as tarefas de tramitação legislativa</p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-[13px] border border-line rounded-lg text-fg-2 hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total de tarefas', value: contadores.total, icon: ClipboardList, color: 'text-brand-blue' },
          { label: 'Atribuídas a mim', value: contadores.minhas, icon: User, color: 'text-emerald-500' },
          { label: 'Prazo vencido', value: contadores.vencidas, icon: AlertCircle, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`${s.color} flex-shrink-0`}><s.icon size={22} /></div>
            <div>
              <div className="text-[22px] font-bold font-mono text-fg-1">{s.value}</div>
              <div className="text-[11px] text-fg-3">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {(['todas', 'minhas', 'vencidas'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition-colors capitalize ${
              filtro === f
                ? 'bg-brand-blue text-white'
                : 'border border-line text-fg-2 hover:bg-surface-2'
            }`}
          >
            {f === 'todas' ? `Todas (${contadores.total})` : f === 'minhas' ? `Minhas (${contadores.minhas})` : `Vencidas (${contadores.vencidas})`}
          </button>
        ))}
      </div>

      {/* Lista de tarefas */}
      {error ? (
        <div className="card flex items-center gap-3 text-red-600 text-[13px]">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-surface-2 rounded w-48 mb-3" />
              <div className="h-3 bg-surface-2 rounded w-full mb-2" />
              <div className="h-3 bg-surface-2 rounded w-64" />
            </div>
          ))}
        </div>
      ) : tarefasFiltradas.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-400" />
          <div className="text-fg-2 font-medium mb-1">Nenhuma tarefa pendente</div>
          <div className="text-fg-3 text-[13px]">Todas as tarefas estão em dia.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {tarefasFiltradas.map(tarefa => {
            const vencida = isVencida(tarefa.prazo)
            const dias = tarefa.prazo ? diasRestantes(tarefa.prazo) : null
            const prop = tarefa.instancia?.proposicao
            const nomeTarefa = TIPO_TAREFA_LABELS[tarefa.tipo] || tarefa.nome

            return (
              <div
                key={tarefa.id}
                className={`card border transition-shadow hover:shadow-md ${
                  vencida ? 'border-red-200 bg-red-50/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-[14px] text-fg-1">{nomeTarefa}</span>
                      {vencida && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          Prazo vencido
                        </span>
                      )}
                      {tarefa.atribuidoAId ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Assumida
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Disponível
                        </span>
                      )}
                    </div>

                    {prop && (
                      <a
                        href={`/proposicoes/${prop.id}`}
                        className="flex items-center gap-1.5 mb-2 group"
                      >
                        <span className="font-mono text-[12px] font-semibold text-brand-blue">
                          {prop.numero}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          STATUS_PROPOSICAO_COLORS[prop.status] || 'text-fg-3 bg-surface-0'
                        }`}>
                          {prop.tipoMateria.sigla}
                        </span>
                        <span className="text-[13px] text-fg-2 line-clamp-1 group-hover:text-fg-1 transition-colors">
                          {prop.ementa}
                        </span>
                        <ChevronRight size={12} className="text-fg-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-fg-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Criada {new Date(tarefa.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                      {dias !== null && (
                        <span className={`flex items-center gap-1 ${vencida ? 'text-red-600 font-medium' : dias <= 3 ? 'text-amber-600' : ''}`}>
                          <Clock size={11} />
                          {vencida
                            ? `${Math.abs(dias)} dia(s) atrasada`
                            : dias === 0
                              ? 'Vence hoje'
                              : `${dias} dia(s) restantes`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!tarefa.atribuidoAId && (
                      <button
                        onClick={() => assumir(tarefa.camundaTaskId)}
                        className="px-3 py-1.5 text-[12px] bg-surface-1 border border-line text-fg-2 hover:bg-surface-2 rounded-lg transition-colors font-medium"
                      >
                        Assumir
                      </button>
                    )}
                    <button
                      onClick={() => completar(tarefa.camundaTaskId)}
                      disabled={completando === tarefa.camundaTaskId}
                      className="px-3 py-1.5 text-[12px] bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {completando === tarefa.camundaTaskId ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Concluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
