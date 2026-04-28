'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  GitBranch,
  Play,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react'
import {
  CamundaDiagnostico,
  FluxoBpmnDetalhe,
  FluxoProcessoResumo,
  InstanciaProcessoResumo,
  deployFluxoNoCamunda,
  diagnosticoCamunda,
  formatarData,
  iniciarFluxoNoCamunda,
  listarFluxosBpmn,
  listarInstanciasFluxo,
  obterFluxoBpmn,
} from '@/lib/api'
import { BpmnViewer } from '@/components/processos/BpmnViewer'

const statusBadge: Record<string, string> = {
  ATIVO: 'bg-brand-green-soft text-brand-green',
  RASCUNHO: 'bg-surface-2 text-fg-3',
  DEPRECIADO: 'bg-brand-amber-soft text-brand-amber',
  ARQUIVADO: 'bg-brand-red-soft text-brand-red',
}

function getCamundaStatusText(camunda: CamundaDiagnostico | null): string {
  if (!camunda) return 'diagnóstico indisponível'
  if (camunda.authentication === 'unauthorized') return 'engine acessível, autenticação inválida'
  if (!camunda.reachable) return 'engine indisponível'
  return `online (${camunda.version || 'versão não informada'})`
}

export default function FluxosAdminPage() {
  const [fluxos, setFluxos] = useState<FluxoProcessoResumo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [camunda, setCamunda] = useState<CamundaDiagnostico | null>(null)

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [bpmn, setBpmn] = useState<FluxoBpmnDetalhe | null>(null)
  const [loadingBpmn, setLoadingBpmn] = useState(false)
  const [bpmnError, setBpmnError] = useState<string | null>(null)

  const [instancias, setInstancias] = useState<InstanciaProcessoResumo[]>([])
  const [loadingInstancias, setLoadingInstancias] = useState(false)

  const [deployingId, setDeployingId] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selected = useMemo(
    () => fluxos.find((fluxo) => fluxo.id === selectedId) ?? null,
    [fluxos, selectedId],
  )

  const activeTaskDefinitionKeys = useMemo(() => {
    return Array.from(new Set(
      instancias.flatMap((instancia) => instancia.tarefas.map((tarefa) => tarefa.tipo)),
    ))
  }, [instancias])

  const carregarFluxos = useCallback(async () => {
    setLoading(true)
    setPageError(null)

    try {
      const [fluxosData, camundaData] = await Promise.all([
        listarFluxosBpmn(),
        diagnosticoCamunda().catch(() => null),
      ])

      setFluxos(fluxosData)
      setCamunda(camundaData)
      setSelectedId((current) => {
        if (current && fluxosData.some((fluxo) => fluxo.id === current)) return current
        return fluxosData[0]?.id ?? null
      })
    } catch (err: any) {
      setPageError(err?.message ?? 'Falha ao carregar fluxos BPMN')
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarBpmn = useCallback(async (fluxoId: string) => {
    setLoadingBpmn(true)
    setBpmnError(null)
    try {
      const detalhe = await obterFluxoBpmn(fluxoId)
      setBpmn(detalhe)
    } catch (err: any) {
      setBpmn(null)
      setBpmnError(err?.message ?? 'Falha ao carregar XML BPMN')
    } finally {
      setLoadingBpmn(false)
    }
  }, [])

  const carregarInstancias = useCallback(async (fluxoId: string) => {
    setLoadingInstancias(true)
    try {
      const response = await listarInstanciasFluxo(fluxoId)
      setInstancias(response.data)
    } catch {
      setInstancias([])
    } finally {
      setLoadingInstancias(false)
    }
  }, [])

  const carregarDetalhes = useCallback(async (fluxoId: string) => {
    await Promise.all([carregarBpmn(fluxoId), carregarInstancias(fluxoId)])
  }, [carregarBpmn, carregarInstancias])

  useEffect(() => {
    carregarFluxos()
  }, [carregarFluxos])

  useEffect(() => {
    if (!selectedId) return
    carregarDetalhes(selectedId)
  }, [selectedId, carregarDetalhes])

  const onDeploy = async () => {
    if (!selected) return
    setDeployingId(selected.id)
    setFeedback(null)
    try {
      const response = await deployFluxoNoCamunda(selected.id)
      const key = response.deploy.processDefinitionKey || 'não retornada'
      const version = response.deploy.processDefinitionVersion ?? '-'
      setFeedback({ type: 'success', message: `Deploy concluído (key: ${key}, versão: ${version}).` })
      await carregarFluxos()
      await carregarDetalhes(selected.id)
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message ?? 'Falha no deploy do fluxo.' })
    } finally {
      setDeployingId(null)
    }
  }

  const onStartInstance = async () => {
    if (!selected) return
    setStartingId(selected.id)
    setFeedback(null)
    try {
      const response = await iniciarFluxoNoCamunda({
        fluxoId: selected.id,
        businessKey: `manual-${Date.now()}`,
        variaveis: {
          origem: 'admin_fluxos',
          iniciadoEm: new Date().toISOString(),
        },
      })
      setFeedback({
        type: 'success',
        message: `Instância iniciada com sucesso (${response.instanceId}).`,
      })
      await Promise.all([carregarFluxos(), carregarDetalhes(selected.id)])
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message ?? 'Falha ao iniciar instância no Camunda.',
      })
    } finally {
      setStartingId(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-surface-1 border border-line rounded-lg p-6 text-sm text-fg-3">
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Carregando fluxos BPMN...
          </span>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-red-700 text-sm flex gap-2">
          <AlertCircle size={16} className="mt-0.5" />
          <span>{pageError}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Fluxos BPMN</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">
            Gerenciamento de processos integrados ao Camunda
          </p>
          <p className="text-[12px] mt-1 text-fg-3">
            Camunda: <span className="font-medium text-fg-2">{getCamundaStatusText(camunda)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="flex items-center gap-2 border border-line text-fg-3 text-[13px] px-3 py-2 rounded-md opacity-60 cursor-not-allowed"
            title="Importação será habilitada na próxima etapa"
          >
            <Upload size={13} />
            Importar BPMN
          </button>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 bg-brand-blue text-white text-[13px] font-medium px-4 py-2 rounded-md opacity-60 cursor-not-allowed"
            title="Cadastro de novo fluxo será habilitado na próxima etapa"
          >
            <Plus size={14} />
            Novo Fluxo
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex gap-2 ${
          feedback.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-2">
          {fluxos.map((fluxo) => (
            <button
              key={fluxo.id}
              type="button"
              onClick={() => setSelectedId(fluxo.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selected?.id === fluxo.id
                  ? 'border-brand-blue bg-brand-blue-soft'
                  : 'border-line bg-surface-1 hover:bg-surface-2'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitBranch size={13} className={selected?.id === fluxo.id ? 'text-brand-blue' : 'text-fg-3'} />
                  <span className="text-[13px] font-medium text-fg-1 leading-snug">{fluxo.nome}</span>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[fluxo.status] || statusBadge.RASCUNHO}`}>
                  {fluxo.status.toLowerCase()}
                </span>
              </div>
              <div className="text-[11px] text-fg-3 mt-2 flex items-center gap-3">
                <span className="font-mono">v{fluxo.versao}</span>
                <span className="flex items-center gap-1">
                  <Play size={9} /> {fluxo.instanciasAtivas} ativas
                </span>
                <span>{fluxo.tipoMateria?.sigla || 'Todos'}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-surface-1 border border-line rounded-lg p-5 text-sm text-fg-3">
              Nenhum fluxo disponível.
            </div>
          ) : (
            <>
              <div className="bg-surface-1 border border-line rounded-lg p-5">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-fg-1">{selected.nome}</h2>
                    <p className="text-[12px] text-fg-3 mt-1">{selected.descricao || 'Sem descrição'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onDeploy}
                      disabled={deployingId === selected.id}
                      className="flex items-center gap-1.5 text-[12px] bg-brand-green hover:bg-brand-green text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
                    >
                      {deployingId === selected.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      Deploy no Camunda
                    </button>
                    <button
                      type="button"
                      onClick={onStartInstance}
                      disabled={startingId === selected.id}
                      className="flex items-center gap-1.5 text-[12px] bg-brand-blue hover:bg-brand-blue text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
                    >
                      {startingId === selected.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      Iniciar instância
                    </button>
                    <button
                      type="button"
                      onClick={() => carregarDetalhes(selected.id)}
                      className="flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:text-fg-1 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Eye size={12} />
                      Visualizar BPMN
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Versão', value: selected.versao, mono: true },
                    { label: 'Camunda Key', value: selected.camundaKey || '-', mono: true },
                    { label: 'Instâncias ativas', value: String(selected.instanciasAtivas) },
                    { label: 'Última atualização', value: formatarData(selected.atualizadoEm) },
                  ].map((item) => (
                    <div key={item.label} className="bg-surface-0 rounded-md p-3">
                      <div className="text-[10px] text-fg-3 mb-1">{item.label}</div>
                      <div className={`text-[12px] text-fg-2 ${item.mono ? 'font-mono' : ''}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-1 border border-line rounded-lg p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-4">
                  Diagrama BPMN
                </div>
                <BpmnViewer
                  xml={bpmn?.bpmnXml || null}
                  loading={loadingBpmn}
                  error={bpmnError}
                  highlightedElementIds={activeTaskDefinitionKeys}
                />
                <div className="text-[11px] text-fg-3 mt-3">
                  Destaque verde indica tarefas com instâncias ativas no banco local.
                </div>
              </div>

              <div className="bg-surface-1 border border-line rounded-lg p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3">
                  Instâncias em execução ({selected.instanciasAtivas})
                </div>

                {loadingInstancias ? (
                  <div className="text-[12px] text-fg-3 inline-flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />
                    Carregando instâncias...
                  </div>
                ) : instancias.length === 0 ? (
                  <div className="text-[12px] text-fg-3">Nenhuma instância ativa no momento.</div>
                ) : (
                  <div className="space-y-2">
                    {instancias.slice(0, 6).map((instancia) => (
                      <div key={instancia.id} className="flex items-center gap-3 text-[12px] bg-surface-0 rounded-md px-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse flex-shrink-0" />
                        <span className="font-mono text-brand-blue">
                          {instancia.proposicao?.numero || instancia.id.slice(0, 8)}
                        </span>
                        <span className="text-fg-3">
                          {instancia.tarefas[0]?.tipo || instancia.etapaAtual || 'sem etapa'}
                        </span>
                        <span className="ml-auto text-fg-3 flex items-center gap-1">
                          <Clock size={10} />
                          {formatarData(instancia.criadoEm)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
