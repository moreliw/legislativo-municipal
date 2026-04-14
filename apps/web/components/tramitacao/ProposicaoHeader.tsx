'use client'

import Link from 'next/link'
import { ArrowLeft, GitBranch, MoreHorizontal } from 'lucide-react'
import type { Proposicao } from '@/lib/api'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  RASCUNHO:                    { label: 'Rascunho',        bg: 'bg-[#1c202e]', text: 'text-[#5c6282]' },
  EM_ELABORACAO:               { label: 'Em elaboração',   bg: 'bg-[#1c202e]', text: 'text-[#9198b0]' },
  PROTOCOLADO:                 { label: 'Protocolado',     bg: 'bg-[#0d1e35]', text: 'text-[#2d7dd2]' },
  EM_ANALISE:                  { label: 'Em análise',      bg: 'bg-[#1a1030]', text: 'text-[#b09de0]' },
  EM_COMISSAO:                 { label: 'Em comissão',     bg: 'bg-[#1a1030]', text: 'text-[#b09de0]' },
  AGUARDANDO_PARECER_JURIDICO: { label: 'Ag. Jurídico',    bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]' },
  EM_PAUTA:                    { label: 'Em pauta',        bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]' },
  EM_VOTACAO:                  { label: 'Em votação',      bg: 'bg-[#2e1f06]', text: 'text-[#f5a623]' },
  APROVADO:                    { label: 'Aprovado',        bg: 'bg-[#0a2318]', text: 'text-[#1fa870]' },
  REJEITADO:                   { label: 'Rejeitado',       bg: 'bg-[#2e0e0e]', text: 'text-[#d94040]' },
  DEVOLVIDO:                   { label: 'Devolvido',       bg: 'bg-[#2e0e0e]', text: 'text-[#e07070]' },
  PUBLICADO:                   { label: 'Publicado',       bg: 'bg-[#0a2318]', text: 'text-[#1fa870]' },
  ARQUIVADO:                   { label: 'Arquivado',       bg: 'bg-[#1c202e]', text: 'text-[#5c6282]' },
  SUSPENSO:                    { label: 'Suspenso',        bg: 'bg-[#2e1f06]', text: 'text-[#e8a020]' },
}

interface ProposicaoHeaderProps {
  proposicao: Pick<Proposicao, 'id' | 'numero' | 'ementa' | 'status' | 'regime' | 'tipoMateria' | 'autor' | 'protocoladoEm' | 'orgaoDestino'>
}

export default function ProposicaoHeader({ proposicao }: ProposicaoHeaderProps) {
  const s = statusConfig[proposicao.status] ?? statusConfig['RASCUNHO']

  return (
    <header className="sticky top-0 z-20 bg-[#0d0f16] border-b border-[#1e2333]">
      <div className="px-6 py-3 flex items-center gap-4">
        {/* Back */}
        <Link
          href={`/proposicoes/${proposicao.id}`}
          className="text-[#5c6282] hover:text-[#9198b0] transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Número + status */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="font-mono text-[13px] font-semibold text-[#2d7dd2]">
            {proposicao.numero}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          {proposicao.regime === 'URGENTE' && (
            <span className="text-[9px] font-bold bg-[#2e1f06] text-[#e8a020] px-1.5 py-0.5 rounded tracking-wide">
              URG
            </span>
          )}
        </div>

        {/* Ementa */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#9198b0] truncate">{proposicao.ementa}</p>
        </div>

        {/* Metadados */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-[#5c6282] flex-shrink-0">
          <span>{proposicao.tipoMateria.nome}</span>
          {proposicao.autor && <span>· {proposicao.autor.nome}</span>}
          {proposicao.orgaoDestino && (
            <span className="text-[#b09de0]">· {proposicao.orgaoDestino.sigla}</span>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/proposicoes/${proposicao.id}`}
            className="text-[11px] border border-[#1e2333] text-[#5c6282] hover:text-[#9198b0] px-3 py-1.5 rounded-md transition-colors"
          >
            Detalhes
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] bg-[#162d4a] border border-[#2d7dd2] text-[#2d7dd2] px-3 py-1.5 rounded-md">
            <GitBranch size={11} />
            Timeline
          </div>
          <button className="w-7 h-7 flex items-center justify-center border border-[#1e2333] text-[#5c6282] hover:text-[#9198b0] rounded-md transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
