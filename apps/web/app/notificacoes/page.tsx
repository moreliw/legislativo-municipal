'use client'

import { useState } from 'react'
import {
  Bell, CheckCheck, Clock, GitBranch, FileText,
  PenLine, AlertTriangle, Info, Calendar
} from 'lucide-react'
import Link from 'next/link'

type TipoNotificacao =
  | 'TAREFA_PENDENTE'
  | 'PRAZO_VENCENDO'
  | 'PRAZO_VENCIDO'
  | 'ASSINATURA_PENDENTE'
  | 'MUDANCA_STATUS'
  | 'ENCAMINHAMENTO'
  | 'VOTACAO_AGENDADA'
  | 'PUBLICACAO'
  | 'SISTEMA'

interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  lida: boolean
  criadoEm: string
  acao?: string
  proposicaoNumero?: string
}

const notificacoesMock: Notificacao[] = [
  {
    id: 'n1',
    tipo: 'ASSINATURA_PENDENTE',
    titulo: 'Assinatura pendente — PL-024/2024',
    mensagem: 'O parecer da Comissão de Meio Ambiente aguarda sua assinatura.',
    lida: false,
    criadoEm: '2024-04-24T14:30:00Z',
    acao: '/proposicoes/p1/documentos',
    proposicaoNumero: 'PL-024/2024',
  },
  {
    id: 'n2',
    tipo: 'PRAZO_VENCENDO',
    titulo: 'Prazo vencendo — PDL-003/2024',
    mensagem: 'O parecer jurídico de PDL-003/2024 vence em 3 dias (28/04/2024).',
    lida: false,
    criadoEm: '2024-04-24T08:00:00Z',
    acao: '/proposicoes/p5',
    proposicaoNumero: 'PDL-003/2024',
  },
  {
    id: 'n3',
    tipo: 'ENCAMINHAMENTO',
    titulo: 'Nova proposição encaminhada',
    mensagem: 'REQ-031/2024 foi encaminhado para sua análise pela Secretaria Legislativa.',
    lida: false,
    criadoEm: '2024-04-22T09:15:00Z',
    acao: '/proposicoes/p2',
    proposicaoNumero: 'REQ-031/2024',
  },
  {
    id: 'n4',
    tipo: 'VOTACAO_AGENDADA',
    titulo: 'Votação agendada para 25/04',
    mensagem: 'PL-019/2024 e MOC-008/2024 estão na pauta da Sessão Ordinária 012/2024.',
    lida: false,
    criadoEm: '2024-04-21T16:00:00Z',
    acao: '/sessoes/s1',
  },
  {
    id: 'n5',
    tipo: 'MUDANCA_STATUS',
    titulo: 'Status atualizado — PL-024/2024',
    mensagem: 'PL-024/2024 passou de "Em Análise" para "Em Comissão".',
    lida: true,
    criadoEm: '2024-03-27T09:00:00Z',
    acao: '/proposicoes/p1',
    proposicaoNumero: 'PL-024/2024',
  },
  {
    id: 'n6',
    tipo: 'PUBLICACAO',
    titulo: 'Proposição publicada',
    mensagem: 'PL-019/2024 foi aprovada e publicada no Diário Oficial.',
    lida: true,
    criadoEm: '2024-04-15T11:30:00Z',
    acao: '/proposicoes/p4',
    proposicaoNumero: 'PL-019/2024',
  },
  {
    id: 'n7',
    tipo: 'PRAZO_VENCIDO',
    titulo: 'Prazo vencido — PL-017/2024',
    mensagem: 'A análise em comissão de PL-017/2024 ultrapassou o prazo definido.',
    lida: true,
    criadoEm: '2024-04-25T00:00:00Z',
    acao: '/proposicoes/p6',
    proposicaoNumero: 'PL-017/2024',
  },
  {
    id: 'n8',
    tipo: 'SISTEMA',
    titulo: 'Backup realizado com sucesso',
    mensagem: 'O backup diário do sistema foi concluído às 02:00.',
    lida: true,
    criadoEm: '2024-04-24T02:00:00Z',
  },
]

const tipoIcone: Record<TipoNotificacao, { Icon: typeof Bell; cor: string; bg: string }> = {
  TAREFA_PENDENTE:   { Icon: Clock,         cor: 'text-[#e8a020]', bg: 'bg-[#2e1f06]' },
  PRAZO_VENCENDO:    { Icon: AlertTriangle,  cor: 'text-[#e8a020]', bg: 'bg-[#2e1f06]' },
  PRAZO_VENCIDO:     { Icon: AlertTriangle,  cor: 'text-[#d94040]', bg: 'bg-[#2e0e0e]' },
  ASSINATURA_PENDENTE:{ Icon: PenLine,       cor: 'text-[#7c5cbf]', bg: 'bg-[#1a1030]' },
  MUDANCA_STATUS:    { Icon: GitBranch,      cor: 'text-[#2d7dd2]', bg: 'bg-[#0d1e35]' },
  ENCAMINHAMENTO:    { Icon: FileText,       cor: 'text-[#60b8a0]', bg: 'bg-[#0a2318]' },
  VOTACAO_AGENDADA:  { Icon: Calendar,       cor: 'text-[#2d7dd2]', bg: 'bg-[#0d1e35]' },
  PUBLICACAO:        { Icon: CheckCheck,     cor: 'text-[#1fa870]', bg: 'bg-[#0a2318]' },
  SISTEMA:           { Icon: Info,           cor: 'text-[#5c6282]', bg: 'bg-[#1c202e]' },
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const dias = Math.floor(hrs / 24)
  if (dias < 7) return `${dias}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function NotificacoesPage() {
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas')
  const [notificacoes, setNotificacoes] = useState(notificacoesMock)

  const filtradas = notificacoes.filter(n => {
    if (filtro === 'nao_lidas') return !n.lida
    if (filtro === 'lidas') return n.lida
    return true
  })

  const naoLidas = notificacoes.filter(n => !n.lida).length

  const marcarLida = (id: string) => {
    setNotificacoes(ns => ns.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  const marcarTodasLidas = () => {
    setNotificacoes(ns => ns.map(n => ({ ...n, lida: true })))
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Notificações</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        {naoLidas > 0 && (
          <button
            onClick={marcarTodasLidas}
            className="flex items-center gap-1.5 text-[12px] text-[#9198b0] border border-[#1e2333] hover:border-[#2a3048] hover:text-[#e8eaf0] px-3 py-1.5 rounded-md transition-colors"
          >
            <CheckCheck size={13} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {([
          { id: 'todas', label: 'Todas' },
          { id: 'nao_lidas', label: `Não lidas (${naoLidas})` },
          { id: 'lidas', label: 'Lidas' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
              filtro === f.id
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
        {filtradas.length === 0 ? (
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg py-16 text-center text-[#5c6282] text-[13px]">
            Nenhuma notificação {filtro === 'nao_lidas' ? 'não lida' : filtro === 'lidas' ? 'lida' : ''}.
          </div>
        ) : filtradas.map(n => {
          const { Icon, cor, bg } = tipoIcone[n.tipo]
          return (
            <div
              key={n.id}
              className={`border rounded-lg transition-all ${
                !n.lida
                  ? 'border-[#2a3048] bg-[#13161f]'
                  : 'border-[#1e2333] bg-[#0f1117]'
              }`}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                {/* Ícone */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${bg}`}>
                  <Icon size={15} className={cor} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-[13px] font-medium ${n.lida ? 'text-[#9198b0]' : 'text-[#e8eaf0]'}`}>
                        {n.titulo}
                      </div>
                      <div className="text-[12px] text-[#5c6282] mt-0.5 leading-snug">
                        {n.mensagem}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.lida && (
                        <div className="w-2 h-2 rounded-full bg-[#2d7dd2]" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-[#5c6282] font-mono">
                      {tempoRelativo(n.criadoEm)}
                    </span>
                    {n.proposicaoNumero && (
                      <>
                        <span className="text-[#1e2333]">·</span>
                        <span className="text-[11px] font-mono text-[#2d7dd2]">{n.proposicaoNumero}</span>
                      </>
                    )}
                    <div className="ml-auto flex gap-2">
                      {n.acao && (
                        <Link
                          href={n.acao}
                          className="text-[11px] text-[#2d7dd2] hover:underline"
                        >
                          Abrir →
                        </Link>
                      )}
                      {!n.lida && (
                        <button
                          onClick={() => marcarLida(n.id)}
                          className="text-[11px] text-[#5c6282] hover:text-[#9198b0] transition-colors"
                        >
                          Marcar lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
