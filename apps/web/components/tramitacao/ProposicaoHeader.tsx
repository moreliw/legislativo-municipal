'use client'

import Link from 'next/link'
import { ArrowLeft, GitBranch, MoreHorizontal } from 'lucide-react'
import type { Proposicao } from '@/lib/api'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  RASCUNHO:                    { label: 'Rascunho',        bg: 'bg-surface-2', text: 'text-fg-3' },
  EM_ELABORACAO:               { label: 'Em elaboração',   bg: 'bg-surface-2', text: 'text-fg-2' },
  PROTOCOLADO:                 { label: 'Protocolado',     bg: 'bg-brand-blue-soft', text: 'text-brand-blue' },
  EM_ANALISE:                  { label: 'Em análise',      bg: 'bg-brand-purple-soft', text: 'text-brand-purple' },
  EM_COMISSAO:                 { label: 'Em comissão',     bg: 'bg-brand-purple-soft', text: 'text-brand-purple' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico',    bg: 'bg-brand-amber-soft', text: 'text-brand-amber' },
  EM_PAUTA:                    { label: 'Em pauta',        bg: 'bg-brand-amber-soft', text: 'text-brand-amber' },
  EM_VOTACAO:                  { label: 'Em votação',      bg: 'bg-brand-amber-soft', text: 'text-brand-amber' },
  APROVADO:                    { label: 'Aprovado',        bg: 'bg-brand-green-soft', text: 'text-brand-green' },
  REJEITADO:                   { label: 'Rejeitado',       bg: 'bg-brand-red-soft', text: 'text-brand-red' },
  DEVOLVIDO:                   { label: 'Devolvido',       bg: 'bg-brand-red-soft', text: 'text-brand-red' },
  PUBLICADO:                   { label: 'Publicado',       bg: 'bg-brand-green-soft', text: 'text-brand-green' },
  ARQUIVADO:                   { label: 'Arquivado',       bg: 'bg-surface-2', text: 'text-fg-3' },
  SUSPENSO:                    { label: 'Suspenso',        bg: 'bg-brand-amber-soft', text: 'text-brand-amber' },
}

interface ProposicaoHeaderProps {
  proposicao: Pick<Proposicao, 'id' | 'numero' | 'ementa' | 'status' | 'regime' | 'tipoMateria' | 'autor' | 'protocoladoEm' | 'orgaoDestino'>
}

export default function ProposicaoHeader({ proposicao }: ProposicaoHeaderProps) {
  const s = statusConfig[proposicao.status] ?? statusConfig['RASCUNHO']

  return (
    <header className="sticky top-0 z-20 bg-surface-0 border-b border-line">
      <div className="px-6 py-3 flex items-center gap-4">
        {/* Back */}
        <Link
          href={`/proposicoes/${proposicao.id}`}
          className="text-fg-3 hover:text-fg-2 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Número + status */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="font-mono text-[13px] font-semibold text-brand-blue">
            {proposicao.numero}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          {proposicao.regime === 'URGENTE' && (
            <span className="text-[9px] font-bold bg-brand-amber-soft text-brand-amber px-1.5 py-0.5 rounded tracking-wide">
              URG
            </span>
          )}
        </div>

        {/* Ementa */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-fg-2 truncate">{proposicao.ementa}</p>
        </div>

        {/* Metadados */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-fg-3 flex-shrink-0">
          <span>{proposicao.tipoMateria.nome}</span>
          {proposicao.autor && <span>· {proposicao.autor.nome}</span>}
          {proposicao.orgaoDestino && (
            <span className="text-brand-purple">· {proposicao.orgaoDestino.sigla}</span>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/proposicoes/${proposicao.id}`}
            className="text-[11px] border border-line text-fg-3 hover:text-fg-2 px-3 py-1.5 rounded-md transition-colors"
          >
            Detalhes
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] bg-brand-blue-active border border-brand-blue text-brand-blue px-3 py-1.5 rounded-md">
            <GitBranch size={11} />
            Timeline
          </div>
          <button className="w-7 h-7 flex items-center justify-center border border-line text-fg-3 hover:text-fg-2 rounded-md transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
