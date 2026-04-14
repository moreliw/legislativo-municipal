'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Clock, Users, FileText, CheckCircle, XCircle } from 'lucide-react'

const sessoesMock = [
  {
    id: 's1', numero: '012/2024', tipo: 'ORDINARIA', data: '25/04/2024', hora: '19h00',
    local: 'Plenário Vereador José Santos', status: 'AGENDADA', presentes: null, itens: 5,
    quorumMinimo: 6,
  },
  {
    id: 's2', numero: '011/2024', tipo: 'ORDINARIA', data: '18/04/2024', hora: '19h00',
    local: 'Plenário Vereador José Santos', status: 'ENCERRADA', presentes: 9, itens: 3,
    quorumMinimo: 6,
  },
  {
    id: 's3', numero: '010/2024', tipo: 'EXTRAORDINARIA', data: '10/04/2024', hora: '14h00',
    local: 'Plenário Vereador José Santos', status: 'ENCERRADA', presentes: 11, itens: 2,
    quorumMinimo: 6,
  },
  {
    id: 's4', numero: '009/2024', tipo: 'ORDINARIA', data: '04/04/2024', hora: '19h00',
    local: 'Plenário Vereador José Santos', status: 'ENCERRADA', presentes: 8, itens: 4,
    quorumMinimo: 6,
  },
  {
    id: 's5', numero: '002/2024', tipo: 'SOLENE', data: '01/03/2024', hora: '10h00',
    local: 'Câmara Municipal — Plenário Principal', status: 'ENCERRADA', presentes: 11, itens: 1,
    quorumMinimo: 9,
  },
]

const tipoLabel: Record<string, string> = {
  ORDINARIA: 'Ordinária', EXTRAORDINARIA: 'Extraordinária',
  ESPECIAL: 'Especial', SOLENE: 'Solene', SECRETA: 'Secreta',
}

const statusConfig: Record<string, { label: string; dot: string; textClass: string }> = {
  AGENDADA: { label: 'Agendada', dot: '#2d7dd2', textClass: 'text-[#2d7dd2]' },
  ABERTA: { label: 'Em andamento', dot: '#1fa870', textClass: 'text-[#1fa870]' },
  ENCERRADA: { label: 'Encerrada', dot: '#5c6282', textClass: 'text-[#5c6282]' },
  CANCELADA: { label: 'Cancelada', dot: '#d94040', textClass: 'text-[#d94040]' },
  SUSPENSA: { label: 'Suspensa', dot: '#e8a020', textClass: 'text-[#e8a020]' },
}

export default function SessoesPage() {
  const [filtroStatus, setFiltroStatus] = useState('')

  const filtradas = sessoesMock.filter(s => !filtroStatus || s.status === filtroStatus)

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Sessões Legislativas</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">2ª Legislatura 2021–2024</p>
        </div>
        <button className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
          <Plus size={14} />
          Agendar Sessão
        </button>
      </div>

      {/* Próxima sessão destaque */}
      <div className="bg-[#0d1e35] border border-[#2d7dd2]/30 rounded-lg p-5">
        <div className="text-[11px] font-semibold tracking-wider text-[#2d7dd2] uppercase mb-3">Próxima Sessão</div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[17px] font-semibold text-[#e8eaf0]">Sessão Ordinária 012/2024</div>
            <div className="text-[14px] text-[#9198b0] mt-1">25 de Abril de 2024, às 19h00</div>
            <div className="text-[13px] text-[#5c6282] mt-0.5">Plenário Vereador José Santos</div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[12px] text-[#9198b0]">
                <FileText size={13} /> <span>5 itens na pauta</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#9198b0]">
                <Users size={13} /> <span>Quórum mínimo: 6 vereadores</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-[12px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-4 py-2 rounded-md transition-colors">
              Ver Pauta
            </button>
            <button className="text-[12px] bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white px-4 py-2 rounded-md transition-colors">
              Abrir Sessão
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { label: 'Todas', value: '' },
          { label: 'Agendadas', value: 'AGENDADA' },
          { label: 'Encerradas', value: 'ENCERRADA' },
          { label: 'Canceladas', value: 'CANCELADA' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroStatus(f.value)}
            className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
              filtroStatus === f.value
                ? 'bg-[#162d4a] border-[#2d7dd2] text-[#2d7dd2]'
                : 'border-[#1e2333] text-[#9198b0] hover:border-[#2a3048]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.map(sessao => {
          const s = statusConfig[sessao.status]
          return (
            <Link
              key={sessao.id}
              href={`/sessoes/${sessao.id}`}
              className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4 flex items-center gap-5 hover:bg-[#1c202e] hover:border-[#2a3048] transition-all group"
            >
              {/* Data */}
              <div className="w-16 text-center flex-shrink-0">
                <div className="text-[10px] text-[#5c6282] font-mono uppercase">
                  {sessao.data.split('/')[1]}/{sessao.data.split('/')[2].slice(2)}
                </div>
                <div className="text-[24px] font-bold text-[#2d7dd2] font-mono leading-none">
                  {sessao.data.split('/')[0]}
                </div>
                <div className="text-[10px] text-[#5c6282] flex items-center justify-center gap-1">
                  <Clock size={9} /> {sessao.hora}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[#e8eaf0]">
                    Sessão {tipoLabel[sessao.tipo]} {sessao.numero}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c202e] text-[#5c6282]">
                    {tipoLabel[sessao.tipo]}
                  </span>
                </div>
                <div className="text-[12px] text-[#5c6282] mt-0.5">{sessao.local}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-[#9198b0]">
                    <FileText size={11} /> {sessao.itens} itens na pauta
                  </div>
                  {sessao.presentes !== null && (
                    <div className={`flex items-center gap-1 text-[11px] ${sessao.presentes >= sessao.quorumMinimo ? 'text-[#1fa870]' : 'text-[#d94040]'}`}>
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
