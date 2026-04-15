'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Play, AlertCircle } from 'lucide-react'

type TipoRegra = 'ROTEAMENTO' | 'VALIDACAO' | 'PRAZO' | 'NOTIFICACAO' | 'BLOQUEIO' | 'QUORUM'
type Operador = 'IGUAL' | 'DIFERENTE' | 'CONTEM' | 'MAIOR' | 'MENOR' | 'EM'

interface Condicao {
  id: string
  campo: string
  operador: Operador
  valor: string
}

interface Acao {
  id: string
  tipo: string
  parametro: string
  valor: string
}

const camposDisponiveis = [
  { value: 'tipoMateria', label: 'Tipo de Matéria', tipo: 'enum' },
  { value: 'origem', label: 'Origem', tipo: 'enum' },
  { value: 'regime', label: 'Regime', tipo: 'enum' },
  { value: 'prioridade', label: 'Prioridade', tipo: 'enum' },
  { value: 'status', label: 'Status atual', tipo: 'enum' },
  { value: 'diasEmTramitacao', label: 'Dias em tramitação', tipo: 'numero' },
  { value: 'autorPerfil', label: 'Perfil do autor', tipo: 'enum' },
  { value: 'orgaoDestino', label: 'Órgão destino', tipo: 'enum' },
]

const operadoresPorTipo: Record<string, Operador[]> = {
  enum:   ['IGUAL', 'DIFERENTE', 'EM'],
  numero: ['IGUAL', 'MAIOR', 'MENOR'],
  texto:  ['IGUAL', 'DIFERENTE', 'CONTEM'],
}

const tiposAcao = [
  { value: 'ENCAMINHAR', label: 'Encaminhar para órgão' },
  { value: 'ALTERAR_STATUS', label: 'Alterar status' },
  { value: 'NOTIFICAR', label: 'Notificar usuário/perfil' },
  { value: 'BLOQUEAR', label: 'Bloquear ação' },
  { value: 'DEFINIR_PRAZO', label: 'Definir prazo (dias)' },
  { value: 'EXIGIR_VALIDACAO', label: 'Exigir validação adicional' },
]

const operadorLabel: Record<Operador, string> = {
  IGUAL: '=',
  DIFERENTE: '≠',
  CONTEM: 'contém',
  MAIOR: '>',
  MENOR: '<',
  EM: 'está em',
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

interface RuleBuilderProps {
  regraInicial?: {
    nome: string
    tipo: TipoRegra
    condicoes: Condicao[]
    acoes: Acao[]
  }
  onSalvar?: (regra: Record<string, unknown>) => void
  onCancelar?: () => void
}

export default function RuleBuilder({ regraInicial, onSalvar, onCancelar }: RuleBuilderProps) {
  const [nome, setNome] = useState(regraInicial?.nome ?? '')
  const [tipo, setTipo] = useState<TipoRegra>(regraInicial?.tipo ?? 'ROTEAMENTO')
  const [condicoes, setCondicoes] = useState<Condicao[]>(regraInicial?.condicoes ?? [
    { id: uid(), campo: 'tipoMateria', operador: 'IGUAL', valor: 'PL' },
  ])
  const [acoes, setAcoes] = useState<Acao[]>(regraInicial?.acoes ?? [
    { id: uid(), tipo: 'ENCAMINHAR', parametro: 'orgao', valor: 'PJU' },
  ])
  const [testando, setTestando] = useState(false)
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null)

  const adicionarCondicao = () => {
    setCondicoes(cs => [...cs, { id: uid(), campo: 'tipoMateria', operador: 'IGUAL', valor: '' }])
  }

  const removerCondicao = (id: string) => {
    setCondicoes(cs => cs.filter(c => c.id !== id))
  }

  const atualizarCondicao = (id: string, campo: keyof Condicao, valor: string) => {
    setCondicoes(cs => cs.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [campo]: valor }
      if (campo === 'campo') {
        const tipoCampo = camposDisponiveis.find(f => f.value === valor)?.tipo ?? 'texto'
        updated.operador = operadoresPorTipo[tipoCampo][0]
      }
      return updated
    }))
  }

  const adicionarAcao = () => {
    setAcoes(as => [...as, { id: uid(), tipo: 'ENCAMINHAR', parametro: 'orgao', valor: '' }])
  }

  const removerAcao = (id: string) => {
    setAcoes(as => as.filter(a => a.id !== id))
  }

  const atualizarAcao = (id: string, campo: keyof Acao, valor: string) => {
    setAcoes(as => as.map(a => a.id === id ? { ...a, [campo]: valor } : a))
  }

  const simularTeste = () => {
    setTestando(true)
    setResultadoTeste(null)
    setTimeout(() => {
      setTestando(false)
      setResultadoTeste(
        condicoes.length > 0 && acoes.length > 0
          ? `✓ Regra avaliada com sucesso. ${acoes.length} ação(ões) seriam executadas.`
          : '✗ Configure ao menos uma condição e uma ação.'
      )
    }, 800)
  }

  const handleSalvar = () => {
    if (!nome.trim()) return
    onSalvar?.({
      nome,
      tipo,
      condicoes: condicoes.map(({ id, ...c }) => c),
      acoes: acoes.map(({ id, ...a }) => a),
    })
  }

  const inputClass = "bg-surface-0 border border-line rounded px-2.5 py-1.5 text-[12px] text-fg-1 focus:outline-none focus:border-brand-blue transition-colors"
  const selectClass = `${inputClass} cursor-pointer`

  const tiposRegra: TipoRegra[] = ['ROTEAMENTO', 'VALIDACAO', 'PRAZO', 'NOTIFICACAO', 'BLOQUEIO', 'QUORUM']
  const tipoCorMap: Record<TipoRegra, string> = {
    ROTEAMENTO: 'text-brand-blue', VALIDACAO: 'text-brand-purple',
    PRAZO: 'text-brand-amber', NOTIFICACAO: 'text-fg-2',
    BLOQUEIO: 'text-brand-red', QUORUM: 'text-brand-green',
  }

  return (
    <div className="bg-surface-1 border border-line rounded-xl p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-fg-2 block mb-1.5">Nome da regra *</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: PL exige parecer jurídico"
            className={`w-full ${inputClass}`}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-fg-2 block mb-1.5">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoRegra)} className={`w-full ${selectClass}`}>
            {tiposRegra.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Seção SE (condições) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-brand-blue-soft text-brand-blue px-2 py-0.5 rounded">SE</span>
            <span className="text-[12px] text-fg-3">Todas as condições são verdadeiras:</span>
          </div>
          <button
            onClick={adicionarCondicao}
            className="flex items-center gap-1 text-[11px] text-brand-blue hover:underline"
          >
            <Plus size={11} /> Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {condicoes.map((c, i) => {
            const campoDef = camposDisponiveis.find(f => f.value === c.campo)
            const tipoCampo = campoDef?.tipo ?? 'texto'
            const ops = operadoresPorTipo[tipoCampo]

            return (
              <div key={c.id} className="flex items-center gap-2 bg-surface-0 border border-line rounded-lg px-3 py-2">
                {i > 0 && (
                  <span className="text-[10px] text-fg-3 w-8 text-right flex-shrink-0">E</span>
                )}
                {i === 0 && <span className="w-8 flex-shrink-0" />}

                <select
                  value={c.campo}
                  onChange={e => atualizarCondicao(c.id, 'campo', e.target.value)}
                  className={`flex-1 ${selectClass}`}
                >
                  {camposDisponiveis.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>

                <select
                  value={c.operador}
                  onChange={e => atualizarCondicao(c.id, 'operador', e.target.value as Operador)}
                  className={`w-28 ${selectClass}`}
                >
                  {ops.map(op => (
                    <option key={op} value={op}>{operadorLabel[op]}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={c.valor}
                  onChange={e => atualizarCondicao(c.id, 'valor', e.target.value)}
                  placeholder="valor..."
                  className={`flex-1 ${inputClass}`}
                />

                <button
                  onClick={() => removerCondicao(c.id)}
                  className="text-fg-3 hover:text-brand-red transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}

          {condicoes.length === 0 && (
            <div className="text-[12px] text-fg-3 bg-surface-0 border border-dashed border-line rounded-lg px-4 py-3 text-center">
              Nenhuma condição. A regra sempre será aplicada.
            </div>
          )}
        </div>
      </div>

      {/* Seção ENTÃO (ações) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-brand-green-soft text-brand-green px-2 py-0.5 rounded">ENTÃO</span>
            <span className="text-[12px] text-fg-3">Execute as ações:</span>
          </div>
          <button
            onClick={adicionarAcao}
            className="flex items-center gap-1 text-[11px] text-brand-green hover:underline"
          >
            <Plus size={11} /> Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {acoes.map(a => (
            <div key={a.id} className="flex items-center gap-2 bg-surface-0 border border-line rounded-lg px-3 py-2">
              <select
                value={a.tipo}
                onChange={e => atualizarAcao(a.id, 'tipo', e.target.value)}
                className={`flex-1 ${selectClass}`}
              >
                {tiposAcao.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <input
                type="text"
                value={a.parametro}
                onChange={e => atualizarAcao(a.id, 'parametro', e.target.value)}
                placeholder="parâmetro"
                className={`w-28 ${inputClass}`}
              />

              <span className="text-fg-3 text-[11px]">=</span>

              <input
                type="text"
                value={a.valor}
                onChange={e => atualizarAcao(a.id, 'valor', e.target.value)}
                placeholder="valor"
                className={`flex-1 ${inputClass}`}
              />

              <button
                onClick={() => removerAcao(a.id)}
                className="text-fg-3 hover:text-brand-red transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview JSON */}
      <div>
        <div className="text-[11px] font-semibold text-fg-3 uppercase tracking-wider mb-2">Preview JSON</div>
        <pre className="bg-surface-0 border border-line rounded-lg p-3 text-[11px] font-mono text-fg-2 overflow-x-auto max-h-32">
          {JSON.stringify({
            nome,
            tipo,
            condicoes: condicoes.map(({ id, ...c }) => c),
            acoes: acoes.map(({ id, ...a }) => a),
          }, null, 2)}
        </pre>
      </div>

      {/* Resultado do teste */}
      {resultadoTeste && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-[12px] ${
          resultadoTeste.startsWith('✓')
            ? 'bg-brand-green-soft border-brand-green/30 text-brand-green'
            : 'bg-brand-red-soft border-brand-red/30 text-brand-red'
        }`}>
          <AlertCircle size={13} />
          {resultadoTeste}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-3 pt-2 border-t border-line">
        <button
          onClick={simularTeste}
          disabled={testando}
          className="flex items-center gap-1.5 text-[12px] border border-line text-fg-2 hover:border-line-2 hover:text-fg-1 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          <Play size={12} className={testando ? 'animate-spin' : ''} />
          {testando ? 'Testando...' : 'Testar regra'}
        </button>
        {onCancelar && (
          <button
            onClick={onCancelar}
            className="text-[12px] text-fg-3 hover:text-fg-2 px-3 py-2 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSalvar}
          disabled={!nome.trim()}
          className="ml-auto flex items-center gap-1.5 text-[12px] bg-brand-blue hover:bg-brand-blue-2 text-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={13} />
          Salvar Regra
        </button>
      </div>
    </div>
  )
}
