'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Clock, Users, FileText, CheckCircle, XCircle } from 'lucide-react'

interface Sessao {
  id: string
  numero: string
  tipo: string
  data: string
  hora: string
  local: string
  status: string
  presentes: number | null
  itens: number
  quorumMinimo: number
}

const SESSOES_MOCK: Sessao[] = [
  { id: 's1', numero: '012/2024', tipo: 'ORDINARIA',     data: '25/04/2024', hora: '19h00', local: 'Plenário Vereador José Santos',         status: 'AGENDADA',  presentes: null, itens: 5, quorumMinimo: 6 },
  { id: 's2', numero: '011/2024', tipo: 'ORDINARIA',     data: '18/04/2024', hora: '19h00', local: 'Plenário Vereador José Santos',         status: 'ENCERRADA', presentes: 9,    itens: 3, quorumMinimo: 6 },
  { id: 's3', numero: '010/2024', tipo: 'EXTRAORDINARIA',data: '10/04/2024', hora: '14h00', local: 'Plenário Vereador José Santos',         status: 'ENCERRADA', presentes: 11,   itens: 2, quorumMinimo: 6 },
  { id: 's4', numero: '009/2024', tipo: 'ORDINARIA',     data: '04/04/2024', hora: '19h00', local: 'Plenário Vereador José Santos',         status: 'ENCERRADA', presentes: 8,    itens: 4, quorumMinimo: 6 },
  { id: 's5', numero: '002/2024', tipo: 'SOLENE',        data: '01/03/2024', hora: '10h00', local: 'Câmara Municipal — Plenário Principal', status: 'ENCERRADA', presentes: 11,   itens: 1, quorumMinimo: 9 },
]

const TIPO_LABEL: Record<string, string> = {
  ORDINARIA:     'Ordinária',
  EXTRAORDINARIA:'Extraordinária',
  ESPECIAL:      'Especial',
  SOLENE:        'Solene',
  SECRETA:       'Secreta',
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; textClass: string }> = {
  AGENDADA:  { label: 'Agendada',     dot: 'var(--blue)',  textClass: 'text-brand-blue' },
  ABERTA:    { label: 'Em andamento', dot: 'var(--green)', textClass: 'text-brand-green' },
  ENCERRADA: { label: 'Encerrada',    dot: 'var(--text-3)',textClass: 'text-fg-3' },
  CANCELADA: { label: 'Cancelada',    dot: 'var(--red)',   textClass: 'text-brand-red' },
  SUSPENSA:  { label: 'Suspensa',     dot: 'var(--amber)', textClass: 'text-brand-amber' },
}

const STATUS_FILTROS = [
  { label: 'Todas',      value: '' },
  { label: 'Agendadas',  value: 'AGENDADA' },
  { label: 'Encerradas', value: 'ENCERRADA' },
  { label: 'Canceladas', value: 'CANCELADA' },
]

export default function SessoesPage() {
  const [filtroStatus, setFiltroStatus] = useState('')

  const filtradas = SESSOES_MOCK.filter(s => !filtroStatus || s.status === filtroStatus)

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Sessões Legislativas</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">2ª Legislatura 2021–2024</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
          <Plus size={14} />
          Agendar Sessão
        </button>
      </div>

      {/* Next session highlight */}
      <div className="bg-brand-blue-soft border border-line rounded-lg p-5">
        <div className="text-[11px] font-semibold tracking-wider text-brand-blue uppercase mb-3">Próxima Sessão</div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[17px] font-semibold text-fg-1">Sessão Ordinária 012/2024</div>
            <div className="text-[14px] text-fg-2 mt-1">25 de Abril de 2024, às 19h00</div>
            <div className="text-[13px] text-fg-3 mt-0.5">Plenário Vereador José Santos</div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[12px] text-fg-2">
                <FileText size={13} /> <span>5 itens na pauta</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-fg-2">
                <Users size={13} /> <span>Quórum mínimo: 6 vereadores</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-[12px] border border-line text-fg-2 hover:text-fg-1 px-4 py-2 rounded-md transition-colors">
              Ver Pauta
            </button>
            <button className="text-[12px] bg-brand-blue hover:bg-brand-blue-2 text-white px-4 py-2 rounded-md transition-colors">
              Abrir Sessão
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroStatus(f.value)}
            className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
              filtroStatus === f.value
                ? 'bg-brand-blue-active border-brand-blue text-brand-blue'
                : 'border-line text-fg-2 hover:border-line-2'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtradas.map(sessao => {
          const s = STATUS_CONFIG[sessao.status] ?? STATUS_CONFIG['ENCERRADA']
          const [day, month, year] = sessao.data.split('/')
          return (
            <Link
              key={sessao.id}
              href={`/sessoes/${sessao.id}`}
              className="bg-surface-1 border border-line rounded-lg p-4 flex items-center gap-5 hover:bg-surface-2 hover:border-line-2 transition-all"
            >
              {/* Date */}
              <div className="w-16 text-center flex-shrink-0">
                <div className="text-[10px] text-fg-3 font-mono uppercase">{month}/{year.slice(2)}</div>
                <div className="text-[24px] font-bold text-brand-blue font-mono leading-none">{day}</div>
                <div className="text-[10px] text-fg-3 flex items-center justify-center gap-1">
                  <Clock size={9} /> {sessao.hora}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-fg-1">
                    Sessão {TIPO_LABEL[sessao.tipo]} {sessao.numero}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-fg-3">
                    {TIPO_LABEL[sessao.tipo]}
                  </span>
                </div>
                <div className="text-[12px] text-fg-3 mt-0.5">{sessao.local}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-fg-2">
                    <FileText size={11} /> {sessao.itens} itens na pauta
                  </div>
                  {sessao.presentes !== null && (
                    <div className={`flex items-center gap-1 text-[11px] ${
                      sessao.presentes >= sessao.quorumMinimo ? 'text-brand-green' : 'text-brand-red'
                    }`}>
                      <Users size={11} /> {sessao.presentes} presentes
                      {sessao.presentes >= sessao.quorumMinimo
                        ? <CheckCircle size={10} />
                        : <XCircle size={10} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                <span className={`text-[12px] ${s.textClass}`}>{s.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
