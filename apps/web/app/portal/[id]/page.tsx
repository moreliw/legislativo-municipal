'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, FileText, Calendar, User, Building2,
  CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Proposicao {
  id: string
  numero: string
  ano: number
  ementa: string
  textoCompleto: string | null
  status: string
  origem: string
  regime: string
  prioridade: string
  palavrasChave: string[]
  assunto: string | null
  criadoEm: string
  protocoladoEm: string | null
  atualizadoEm: string
  arquivadoEm: string | null
  tipoMateria: { nome: string; sigla: string }
  autor: { nome: string; cargo: string } | null
  autorExterno: string | null
  orgaoDestino: { nome: string; sigla: string } | null
  publicacoes: Array<{ id: string; tipo: string; data: string; url: string | null; numero: string | null }>
  documentos: Array<{
    id: string; nome: string; tipo: string; criadoEm: string
    versoes: Array<{ url: string }>
  }>
  _count: { tramitacoes: number }
}

interface TramitacaoEvento {
  id: string
  sequencia: number
  tipo: string
  descricao: string
  statusAntes: string
  statusDepois: string
  observacao: string | null
  criadoEm: string
  usuario: { nome: string; cargo: string | null } | null
  orgaoOrigem: { nome: string; sigla: string } | null
  documentosGerados: Array<{ documento: { id: string; nome: string; tipo: string } }>
}

const STATUS_LABELS: Record<string, string> = {
  PROTOCOLADO: 'Protocolado',
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_PARECER_JURIDICO: 'Aguardando Parecer Jurídico',
  EM_COMISSAO: 'Em Comissão',
  EM_PAUTA: 'Em Pauta',
  EM_VOTACAO: 'Em Votação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  PUBLICADO: 'Publicado',
  ARQUIVADO: 'Arquivado',
  DEVOLVIDO: 'Devolvido',
  SUSPENSO: 'Suspenso',
}

const TIPO_EVENTO_LABELS: Record<string, string> = {
  PROTOCOLO: 'Protocolo',
  ENCAMINHAMENTO: 'Encaminhamento',
  DESPACHO: 'Despacho',
  PARECER: 'Parecer',
  VOTACAO: 'Votação',
  APROVACAO: 'Aprovação',
  REJEICAO: 'Rejeição',
  ARQUIVAMENTO: 'Arquivamento',
  DEVOLUCAO: 'Devolução',
  SUSPENSAO: 'Suspensão',
  PUBLICACAO: 'Publicação',
  REDACAO_FINAL: 'Redação Final',
  ASSINATURA: 'Assinatura',
}

function getEventoIcon(tipo: string) {
  if (['APROVACAO', 'PUBLICACAO'].includes(tipo))
    return <CheckCircle2 size={18} className="text-emerald-500" />
  if (['REJEICAO', 'ARQUIVAMENTO', 'DEVOLUCAO'].includes(tipo))
    return <XCircle size={18} className="text-red-500" />
  if (tipo === 'VOTACAO')
    return <CheckCircle2 size={18} className="text-purple-500" />
  return <Clock size={18} className="text-brand-blue" />
}

export default function PortalProposicaoPage() {
  const { id } = useParams<{ id: string }>()
  const [proposicao, setProposicao] = useState<Proposicao | null>(null)
  const [historico, setHistorico] = useState<TramitacaoEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`${API_BASE}/api/v1/publico/proposicoes/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/v1/publico/proposicoes/${id}/tramitacao`).then(r => r.ok ? r.json() : []),
    ]).then(([prop, hist]) => {
      if (!prop) setError('Proposição não encontrada')
      else {
        setProposicao(prop)
        setHistorico(hist)
      }
    }).catch(() => setError('Erro ao carregar proposição')).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-fg-3 text-[14px]">Carregando...</div>
      </div>
    )
  }

  if (error || !proposicao) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-fg-3" />
          <div className="text-fg-2 text-[14px]">{error || 'Proposição não encontrada'}</div>
          <a href="/portal" className="mt-4 inline-flex items-center gap-1 text-brand-blue text-[13px] hover:underline">
            <ArrowLeft size={14} /> Voltar ao portal
          </a>
        </div>
      </div>
    )
  }

  const autor = proposicao.autor?.nome || proposicao.autorExterno || '—'
  const cargo = proposicao.autor?.cargo || ''

  return (
    <div className="min-h-screen bg-surface-0" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-brand-blue-soft border-b border-line">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-brand-blue flex items-center justify-center">
              <span className="text-white font-bold text-xs">CM</span>
            </div>
            <span className="text-[15px] font-semibold text-fg-1">Câmara Municipal</span>
          </div>
          <a href="/portal" className="flex items-center gap-1 text-[12px] text-fg-2 hover:text-fg-1 transition-colors">
            <ArrowLeft size={13} /> Portal
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Cabeçalho da proposição */}
        <div className="bg-surface-1 border border-line rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-blue-soft flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[13px] font-bold text-brand-blue">{proposicao.numero}</span>
                <span className="text-[11px] font-mono bg-surface-0 border border-line text-fg-3 px-2 py-0.5 rounded">
                  {proposicao.tipoMateria.sigla}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-blue-soft text-brand-blue">
                  {STATUS_LABELS[proposicao.status] || proposicao.status}
                </span>
              </div>
              <h1 className="text-[16px] font-medium text-fg-1 leading-snug mb-4">
                {proposicao.ementa}
              </h1>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    icon: Calendar,
                    label: 'Protocolado em',
                    value: proposicao.protocoladoEm
                      ? new Date(proposicao.protocoladoEm).toLocaleDateString('pt-BR')
                      : new Date(proposicao.criadoEm).toLocaleDateString('pt-BR'),
                  },
                  { icon: User, label: 'Autoria', value: `${autor}${cargo ? ` · ${cargo}` : ''}` },
                  { icon: Building2, label: 'Origem', value: proposicao.origem.replace('_', ' ') },
                  { icon: FileText, label: 'Tipo', value: proposicao.tipoMateria.nome },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[11px] text-fg-3">
                      <item.icon size={11} />
                      {item.label}
                    </div>
                    <div className="text-[13px] text-fg-1 font-medium leading-snug">{item.value}</div>
                  </div>
                ))}
              </div>

              {proposicao.assunto && (
                <div className="mt-4 pt-4 border-t border-line">
                  <div className="text-[11px] text-fg-3 mb-1">Assunto</div>
                  <div className="text-[13px] text-fg-2">{proposicao.assunto}</div>
                </div>
              )}

              {proposicao.palavrasChave?.length > 0 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {proposicao.palavrasChave.map(tag => (
                    <span key={tag} className="text-[11px] bg-surface-0 border border-line text-fg-3 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documentos públicos */}
        {proposicao.documentos.length > 0 && (
          <div className="bg-surface-1 border border-line rounded-xl p-6 mb-6">
            <h2 className="text-[13px] font-semibold text-fg-1 mb-4">Documentos</h2>
            <div className="space-y-2">
              {proposicao.documentos.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[13px] text-fg-1">
                    <FileText size={14} className="text-fg-3" />
                    {doc.nome}
                    <span className="text-[11px] text-fg-3">({doc.tipo})</span>
                  </div>
                  {doc.versoes[0]?.url && (
                    <a
                      href={doc.versoes[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-brand-blue hover:underline flex items-center gap-1"
                    >
                      Baixar <ChevronRight size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de tramitação */}
        <div className="bg-surface-1 border border-line rounded-xl p-6">
          <h2 className="text-[13px] font-semibold text-fg-1 mb-6">
            Histórico de Tramitação ({historico.length} eventos)
          </h2>

          {historico.length === 0 ? (
            <div className="text-center py-8 text-fg-3 text-[13px]">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="relative">
              {historico.map((evento, index) => (
                <div key={evento.id} className="flex gap-4 pb-6">
                  {/* Linha vertical */}
                  <div className="flex flex-col items-center">
                    <div className="flex-shrink-0 mt-0.5">{getEventoIcon(evento.tipo)}</div>
                    {index < historico.length - 1 && (
                      <div className="w-px flex-1 bg-line mt-2 min-h-[24px]" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-fg-1">{evento.descricao}</span>
                        <span className="text-[10px] bg-surface-0 border border-line text-fg-3 px-1.5 py-0.5 rounded font-mono">
                          {TIPO_EVENTO_LABELS[evento.tipo] || evento.tipo}
                        </span>
                      </div>
                      <span className="text-[11px] text-fg-3 font-mono flex-shrink-0">
                        {new Date(evento.criadoEm).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {evento.orgaoOrigem && (
                      <div className="text-[12px] text-fg-3 mb-1 flex items-center gap-1">
                        <Building2 size={11} />
                        {evento.orgaoOrigem.nome}
                      </div>
                    )}

                    {evento.usuario && (
                      <div className="text-[12px] text-fg-3 mb-1 flex items-center gap-1">
                        <User size={11} />
                        {evento.usuario.nome}{evento.usuario.cargo ? ` · ${evento.usuario.cargo}` : ''}
                      </div>
                    )}

                    {evento.observacao && (
                      <div className="mt-2 p-2.5 bg-surface-0 border border-line rounded-md text-[12px] text-fg-2 leading-relaxed">
                        {evento.observacao}
                      </div>
                    )}

                    {evento.documentosGerados.length > 0 && (
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {evento.documentosGerados.map(dg => (
                          <span
                            key={dg.documento.id}
                            className="text-[11px] bg-brand-blue-soft text-brand-blue border border-brand-blue/20 px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            <FileText size={10} />
                            {dg.documento.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-line mt-8 py-6">
        <div className="max-w-4xl mx-auto px-6 text-[11px] text-fg-3 flex items-center justify-between flex-wrap gap-2">
          <span>Câmara Municipal — Sistema Legislativo Municipal</span>
          <span>Dados abertos conforme Lei 12.527/2011 (LAI)</span>
        </div>
      </footer>
    </div>
  )
}
