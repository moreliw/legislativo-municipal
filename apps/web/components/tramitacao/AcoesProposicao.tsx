'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GitBranch, FileText, Users, MoreHorizontal,
  ArrowLeft, Download, Send, RotateCcw,
  Archive, AlertTriangle, CheckCircle
} from 'lucide-react'

// Componente de Modal de Ação
function ModalAcao({
  titulo, placeholder, onConfirmar, onCancelar, tipo
}: {
  titulo: string
  placeholder: string
  onConfirmar: (texto: string) => void
  onCancelar: () => void
  tipo: 'danger' | 'warning' | 'info'
}) {
  const [texto, setTexto] = useState('')
  const cores = {
    danger: { btn: 'bg-[#d94040] hover:bg-[#b83333]', border: 'border-[#d94040]/30', bg: 'bg-[#2e0e0e]' },
    warning: { btn: 'bg-[#e8a020] hover:bg-[#c88a18]', border: 'border-[#e8a020]/30', bg: 'bg-[#2e1f06]' },
    info: { btn: 'bg-[#2d7dd2] hover:bg-[#1e6fbf]', border: 'border-[#2d7dd2]/30', bg: 'bg-[#0d1e35]' },
  }
  const c = cores[tipo]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl border ${c.border} ${c.bg} p-6 shadow-2xl`}>
        <h3 className="text-[15px] font-semibold text-[#e8eaf0] mb-4">{titulo}</h3>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] resize-none"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={onCancelar}
            className="text-[13px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-4 py-2 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(texto)}
            disabled={!texto.trim()}
            className={`text-[13px] font-medium text-white px-5 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${c.btn}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente de seleção de órgão
function SeletorOrgao({
  onSelecionar, onCancelar
}: {
  onSelecionar: (orgaoId: string, orgaoNome: string, obs: string) => void
  onCancelar: () => void
}) {
  const [orgaoId, setOrgaoId] = useState('')
  const [obs, setObs] = useState('')

  const orgaos = [
    { id: 'pju', nome: 'Procuradoria Jurídica', sigla: 'PJU' },
    { id: 'sec', nome: 'Secretaria Legislativa', sigla: 'SEC' },
    { id: 'cma', nome: 'Comissão de Meio Ambiente', sigla: 'CMA' },
    { id: 'cfo', nome: 'Comissão de Finanças', sigla: 'CFO' },
    { id: 'cjl', nome: 'Comissão de Constituição e Justiça', sigla: 'CJL' },
    { id: 'pre', nome: 'Presidência', sigla: 'PRE' },
    { id: 'pln', nome: 'Plenário', sigla: 'PLN' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#2d7dd2]/30 bg-[#0d1e35] p-6 shadow-2xl">
        <h3 className="text-[15px] font-semibold text-[#e8eaf0] mb-4">Encaminhar Proposição</h3>

        <label className="text-[11px] text-[#5c6282] mb-1.5 block">Órgão de destino</label>
        <select
          value={orgaoId}
          onChange={e => setOrgaoId(e.target.value)}
          className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] focus:outline-none focus:border-[#2d7dd2] mb-4"
        >
          <option value="">Selecione o órgão...</option>
          {orgaos.map(o => (
            <option key={o.id} value={o.id}>{o.sigla} — {o.nome}</option>
          ))}
        </select>

        <label className="text-[11px] text-[#5c6282] mb-1.5 block">Observação</label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          placeholder="Informe o motivo ou instrução para o encaminhamento..."
          rows={3}
          className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] resize-none"
        />

        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancelar} className="text-[13px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-4 py-2 rounded-md transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => {
              const orgao = orgaos.find(o => o.id === orgaoId)
              if (orgao) onSelecionar(orgaoId, orgao.nome, obs)
            }}
            disabled={!orgaoId}
            className="text-[13px] font-medium bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white px-5 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Encaminhar
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast de feedback
function Toast({ mensagem, tipo }: { mensagem: string; tipo: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-medium shadow-xl ${
      tipo === 'success' ? 'bg-[#1fa870] text-white' : 'bg-[#d94040] text-white'
    }`}>
      {tipo === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
      {mensagem}
    </div>
  )
}

export default function AcoesProposicao({ proposicaoId, status }: { proposicaoId: string; status: string }) {
  const [modal, setModal] = useState<null | 'devolver' | 'suspender' | 'arquivar' | 'encaminhar'>(null)
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const mostrarToast = (mensagem: string, tipo: 'success' | 'error') => {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const executarAcao = async (endpoint: string, body: object) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/proposicoes/${proposicaoId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      setModal(null)
      mostrarToast('Ação registrada com sucesso', 'success')
    } catch {
      mostrarToast('Erro ao executar ação', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botões de ação */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setModal('encaminhar')}
          className="flex items-center gap-1.5 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          <Send size={12} /> Encaminhar
        </button>

        <button
          onClick={() => setModal('devolver')}
          className="flex items-center gap-1.5 border border-[#1e2333] text-[#e8a020] hover:bg-[#2e1f06] text-[12px] px-3 py-1.5 rounded-md transition-colors"
        >
          <RotateCcw size={12} /> Devolver
        </button>

        {status === 'SUSPENSO' ? (
          <button
            onClick={() => executarAcao('reativar', { motivo: 'Reativado manualmente' })}
            className="flex items-center gap-1.5 border border-[#1e2333] text-[#1fa870] hover:bg-[#0a2318] text-[12px] px-3 py-1.5 rounded-md transition-colors"
          >
            <CheckCircle size={12} /> Reativar
          </button>
        ) : (
          <button
            onClick={() => setModal('suspender')}
            className="flex items-center gap-1.5 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] text-[12px] px-3 py-1.5 rounded-md transition-colors"
          >
            <AlertTriangle size={12} /> Suspender
          </button>
        )}

        <button
          onClick={() => setModal('arquivar')}
          className="flex items-center gap-1.5 border border-[#1e2333] text-[#d94040] hover:bg-[#2e0e0e] text-[12px] px-3 py-1.5 rounded-md transition-colors"
        >
          <Archive size={12} /> Arquivar
        </button>
      </div>

      {/* Modais */}
      {modal === 'encaminhar' && (
        <SeletorOrgao
          onSelecionar={(orgaoId, _, obs) => executarAcao('encaminhar', { orgaoDestinoId: orgaoId, observacao: obs })}
          onCancelar={() => setModal(null)}
        />
      )}

      {modal === 'devolver' && (
        <ModalAcao
          titulo="Devolver ao Autor"
          placeholder="Informe o motivo da devolução e o que precisa ser corrigido..."
          tipo="warning"
          onConfirmar={motivo => executarAcao('devolver', { motivo })}
          onCancelar={() => setModal(null)}
        />
      )}

      {modal === 'suspender' && (
        <ModalAcao
          titulo="Suspender Tramitação"
          placeholder="Informe o motivo da suspensão..."
          tipo="warning"
          onConfirmar={motivo => executarAcao('suspender', { motivo })}
          onCancelar={() => setModal(null)}
        />
      )}

      {modal === 'arquivar' && (
        <ModalAcao
          titulo="Arquivar Proposição"
          placeholder="Informe o motivo do arquivamento. Esta ação é definitiva."
          tipo="danger"
          onConfirmar={motivo => executarAcao('arquivar', { motivo })}
          onCancelar={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} />}
    </>
  )
}
