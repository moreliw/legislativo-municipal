'use client'

import { useState, useEffect } from 'react'
import { Play, Plus, RefreshCw, CheckCircle } from 'lucide-react'

interface ProcessDefinition {
  id: string
  key: string
  name: string
  version: number
}

interface ProcessInstance {
  id: string
  definitionId: string
  suspended: boolean
}

interface Task {
  id: string
  name: string
  processInstanceId: string
  assignee?: string
}

export default function ProcessosPage() {
  const [definitions, setDefinitions] = useState<ProcessDefinition[]>([])
  const [instances, setInstances] = useState<ProcessInstance[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [defsRes, instsRes, tasksRes] = await Promise.all([
        fetch('/api/v1/camunda/definitions'),
        fetch('/api/v1/camunda/instances'),
        fetch('/api/v1/camunda/tasks'),
      ])

      if (defsRes.ok) setDefinitions(await defsRes.json())
      if (instsRes.ok) setInstances(await instsRes.json())
      if (tasksRes.ok) setTasks(await tasksRes.json())
    } catch (err) {
      console.error('Erro ao carregar processos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function startProcess(processKey: string) {
    try {
      await fetch(`/api/v1/camunda/start/${processKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} }),
      })
      loadData()
    } catch (err) {
      console.error('Erro ao iniciar processo:', err)
    }
  }

  async function completeTask(taskId: string) {
    try {
      await fetch(`/api/v1/camunda/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} }),
      })
      loadData()
    } catch (err) {
      console.error('Erro ao completar tarefa:', err)
    }
  }

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand)]" />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-8">
        <h1>Processos BPM</h1>
        <button className="btn flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Novo Processo
        </button>
      </div>

      <div className="grid gap-6">
        {/* Definições de Processos */}
        <div className="card">
          <h2 className="mb-4">Processos Disponíveis</h2>
          {definitions.length === 0 ? (
            <p className="text-[var(--text-muted)]">Nenhum processo implantado</p>
          ) : (
            <div className="space-y-3">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]"
                >
                  <div>
                    <p className="font-medium">{def.name || def.key}</p>
                    <p className="text-sm text-[var(--text-muted)]">v{def.version}</p>
                  </div>
                  <button
                    onClick={() => startProcess(def.key)}
                    className="btn flex items-center gap-2 text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instâncias Ativas */}
        <div className="card">
          <h2 className="mb-4">Instâncias Ativas ({instances.length})</h2>
          {instances.length === 0 ? (
            <p className="text-[var(--text-muted)]">Nenhuma instância em execução</p>
          ) : (
            <div className="space-y-2">
              {instances.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
                >
                  <span className="font-mono">{inst.id}</span>
                  {inst.suspended && <span className="ml-3 text-[var(--warning)]">(Suspenso)</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tarefas Pendentes */}
        <div className="card">
          <h2 className="mb-4">Tarefas Pendentes ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <p className="text-[var(--text-muted)]">Nenhuma tarefa pendente</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]"
                >
                  <div>
                    <p className="font-medium">{task.name}</p>
                    <p className="text-sm text-[var(--text-muted)] font-mono">{task.id}</p>
                  </div>
                  <button
                    onClick={() => completeTask(task.id)}
                    className="btn flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Completar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
