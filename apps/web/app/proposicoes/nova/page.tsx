'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Plus, X } from 'lucide-react'
import Link from 'next/link'

const tiposMateria = [
  { id: 'pl', sigla: 'PL', nome: 'Projeto de Lei' },
  { id: 'pdl', sigla: 'PDL', nome: 'Projeto de Decreto Legislativo' },
  { id: 'prl', sigla: 'PRL', nome: 'Projeto de Resolução' },
  { id: 'moc', sigla: 'MOC', nome: 'Moção' },
  { id: 'req', sigla: 'REQ', nome: 'Requerimento' },
  { id: 'ind', sigla: 'IND', nome: 'Indicação' },
]

const origems = [
  { value: 'VEREADOR', label: 'Vereador' },
  { value: 'MESA_DIRETORA', label: 'Mesa Diretora' },
  { value: 'COMISSAO', label: 'Comissão' },
  { value: 'PREFEITURA', label: 'Prefeitura' },
  { value: 'POPULAR', label: 'Iniciativa Popular' },
  { value: 'EXTERNA', label: 'Externa' },
]

const regimes = [
  { value: 'ORDINARIO', label: 'Ordinário' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'URGENCIA_ESPECIAL', label: 'Urgência Especial' },
  { value: 'SUMARIO', label: 'Sumário' },
]

export default function NovaProposicaoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [palavras, setPalavras] = useState<string[]>([])
  const [novaPalavra, setNovaPalavra] = useState('')
  const [form, setForm] = useState({
    tipoMateriaId: '',
    ementa: '',
    textoCompleto: '',
    origem: 'VEREADOR',
    regime: 'ORDINARIO',
    prioridade: 'NORMAL',
    assunto: '',
    observacoes: '',
  })

  const tipoSelecionado = tiposMateria.find(t => t.id === form.tipoMateriaId)
  const proximoNumero = tipoSelecionado ? `${tipoSelecionado.sigla}-062/2024` : '—'

  const addPalavra = () => {
    if (novaPalavra.trim() && !palavras.includes(novaPalavra.trim())) {
      setPalavras([...palavras, novaPalavra.trim()])
      setNovaPalavra('')
    }
  }

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-[#9198b0]">
        {label}{required && <span className="text-[#d94040] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )

  const inputClass = "w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] transition-colors"

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/proposicoes" className="text-[#5c6282] hover:text-[#9198b0] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Nova Proposição</h1>
          <p className="text-[13px] text-[#5c6282]">Preencha os dados e protocole no sistema</p>
        </div>
        {tipoSelecionado && (
          <div className="ml-auto bg-[#0d1e35] border border-[#2d7dd2] rounded-md px-4 py-2">
            <div className="text-[10px] text-[#5c6282] font-mono uppercase">Próximo número</div>
            <div className="text-[#2d7dd2] font-mono font-semibold text-[15px]">{proximoNumero}</div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Identificação' },
          { n: 2, label: 'Conteúdo' },
          { n: 3, label: 'Documentos' },
          { n: 4, label: 'Revisão' },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 flex-1 cursor-pointer`}
              onClick={() => setStep(s.n)}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
                step === s.n
                  ? 'bg-[#2d7dd2] border-[#2d7dd2] text-white'
                  : step > s.n
                  ? 'bg-[#0a2318] border-[#1fa870] text-[#1fa870]'
                  : 'bg-transparent border-[#1e2333] text-[#5c6282]'
              }`}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`text-[12px] font-medium ${step === s.n ? 'text-[#e8eaf0]' : 'text-[#5c6282]'}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`h-px flex-1 mx-2 transition-colors ${step > s.n ? 'bg-[#1fa870]' : 'bg-[#1e2333]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-6">

        {/* Step 1: Identificação */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
              Identificação da Proposição
            </h2>

            <Field label="Tipo de Matéria" required>
              <div className="grid grid-cols-3 gap-2">
                {tiposMateria.map(tipo => (
                  <button
                    key={tipo.id}
                    onClick={() => setForm({ ...form, tipoMateriaId: tipo.id })}
                    className={`text-left p-3 rounded-md border transition-all ${
                      form.tipoMateriaId === tipo.id
                        ? 'border-[#2d7dd2] bg-[#0d1e35]'
                        : 'border-[#1e2333] bg-[#0f1117] hover:border-[#2a3048]'
                    }`}
                  >
                    <div className={`font-mono text-[13px] font-bold ${form.tipoMateriaId === tipo.id ? 'text-[#2d7dd2]' : 'text-[#9198b0]'}`}>
                      {tipo.sigla}
                    </div>
                    <div className="text-[11px] text-[#5c6282] mt-0.5">{tipo.nome}</div>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Origem" required>
                <select
                  value={form.origem}
                  onChange={e => setForm({ ...form, origem: e.target.value })}
                  className={inputClass}
                >
                  {origems.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label="Regime de Tramitação">
                <select
                  value={form.regime}
                  onChange={e => setForm({ ...form, regime: e.target.value })}
                  className={inputClass}
                >
                  {regimes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Assunto">
              <input
                type="text"
                value={form.assunto}
                onChange={e => setForm({ ...form, assunto: e.target.value })}
                placeholder="Ex: Política Ambiental e Energética"
                className={inputClass}
              />
            </Field>

            <Field label="Palavras-chave">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={novaPalavra}
                  onChange={e => setNovaPalavra(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPalavra())}
                  placeholder="Digite e pressione Enter"
                  className={`${inputClass} flex-1`}
                />
                <button onClick={addPalavra} className="px-3 py-2 bg-[#1e2333] hover:bg-[#252a3a] rounded-md text-[#9198b0] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              {palavras.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {palavras.map(p => (
                    <span key={p} className="flex items-center gap-1 bg-[#0d1e35] text-[#2d7dd2] text-[11px] px-2 py-1 rounded">
                      {p}
                      <button onClick={() => setPalavras(palavras.filter(x => x !== p))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>
        )}

        {/* Step 2: Conteúdo */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
              Conteúdo da Proposição
            </h2>

            <Field label="Ementa" required>
              <textarea
                value={form.ementa}
                onChange={e => setForm({ ...form, ementa: e.target.value })}
                placeholder="Descreva de forma clara e objetiva o conteúdo da proposição..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
              <div className="text-[11px] text-[#5c6282] text-right">{form.ementa.length}/2000</div>
            </Field>

            <Field label="Texto Integral">
              <textarea
                value={form.textoCompleto}
                onChange={e => setForm({ ...form, textoCompleto: e.target.value })}
                placeholder="Texto completo da proposição, incluindo artigos, parágrafos e incisos..."
                rows={12}
                className={`${inputClass} resize-y font-mono text-[12px]`}
              />
            </Field>

            <Field label="Observações Internas">
              <textarea
                value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Informações adicionais para uso interno (não publicadas)"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        )}

        {/* Step 3: Documentos */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
              Documentos e Anexos
            </h2>

            <div className="border-2 border-dashed border-[#1e2333] rounded-lg p-8 text-center hover:border-[#2a3048] transition-colors cursor-pointer">
              <Upload size={24} className="mx-auto text-[#5c6282] mb-3" />
              <div className="text-[13px] font-medium text-[#9198b0]">Arraste arquivos ou clique para selecionar</div>
              <div className="text-[11px] text-[#5c6282] mt-1">PDF, DOCX, DOC — Máx. 50MB por arquivo</div>
            </div>

            <div className="bg-[#0d1e35] border border-[#1e2333] rounded-md p-3">
              <div className="text-[11px] font-semibold text-[#2d7dd2] mb-2">Documentos obrigatórios para {tipoSelecionado?.sigla || 'PL'}:</div>
              <div className="space-y-1">
                {['Texto da proposição (PDF ou DOCX)', 'Justificativa fundamentada', 'Informação sobre impacto financeiro (se aplicável)'].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-[#9198b0]">
                    <div className="w-3 h-3 rounded-full border border-[#2d7dd2]" />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
              Revisão e Confirmação
            </h2>

            <div className="bg-[#0f1117] border border-[#1e2333] rounded-md divide-y divide-[#1e2333]">
              {[
                ['Tipo', tipoSelecionado?.nome || '—'],
                ['Número (gerado automaticamente)', proximoNumero],
                ['Origem', origems.find(o => o.value === form.origem)?.label || '—'],
                ['Regime', regimes.find(r => r.value === form.regime)?.label || '—'],
                ['Assunto', form.assunto || '—'],
                ['Ementa', form.ementa || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 px-4 py-3">
                  <div className="text-[12px] text-[#5c6282] w-48 flex-shrink-0">{label}</div>
                  <div className="text-[12px] text-[#e8eaf0] flex-1">{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#2e1f06] border border-[#e8a020]/30 rounded-md px-4 py-3">
              <div className="text-[12px] font-semibold text-[#e8a020] mb-1">⚠ Atenção</div>
              <div className="text-[12px] text-[#e8a020]/80">
                Ao protocolar, a proposição receberá um número definitivo e entrará no fluxo de tramitação. Esta ação não pode ser desfeita diretamente — será necessário solicitar devolução.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 text-[13px] text-[#9198b0] hover:text-[#e8eaf0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={14} /> Anterior
        </button>

        <div className="flex gap-3">
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-6 py-2 rounded-md transition-colors"
            >
              Próximo →
            </button>
          ) : (
            <>
              <button className="border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] text-[13px] font-medium px-5 py-2 rounded-md transition-colors">
                Salvar Rascunho
              </button>
              <button className="bg-[#1fa870] hover:bg-[#178a5c] text-white text-[13px] font-medium px-6 py-2 rounded-md transition-colors">
                ✓ Protocolar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
