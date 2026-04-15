'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  anterior?: number
  cor?: 'blue' | 'green' | 'amber' | 'red' | 'neutral'
  formato?: 'numero' | 'percentual'
}

const corConfig = {
  blue:    { text: 'text-brand-blue', bg: 'bg-brand-blue-soft' },
  green:   { text: 'text-brand-green', bg: 'bg-brand-green-soft' },
  amber:   { text: 'text-brand-amber', bg: 'bg-brand-amber-soft' },
  red:     { text: 'text-brand-red', bg: 'bg-brand-red-soft' },
  neutral: { text: 'text-fg-2', bg: 'bg-surface-2' },
}

export function StatCard({ label, value, anterior, cor = 'neutral', formato = 'numero' }: StatCardProps) {
  const cfg = corConfig[cor]

  const tendencia = useMemo(() => {
    if (anterior === undefined || anterior === 0) return null
    const diff = value - anterior
    const pct = Math.round((diff / anterior) * 100)
    return { diff, pct, positivo: diff >= 0 }
  }, [value, anterior])

  const valorFormatado = formato === 'percentual'
    ? `${value}%`
    : value.toLocaleString('pt-BR')

  return (
    <div className={`${cfg.bg} border border-line rounded-lg p-4`}>
      <div className={`text-[28px] font-bold font-mono leading-none ${cfg.text}`}>
        {valorFormatado}
      </div>
      <div className="text-[12px] font-medium text-fg-2 mt-1.5">{label}</div>
      {tendencia && (
        <div className={`flex items-center gap-1 mt-1.5 text-[11px] ${
          tendencia.positivo ? 'text-brand-green' : 'text-brand-red'
        }`}>
          {tendencia.positivo
            ? <TrendingUp size={11} />
            : tendencia.diff === 0
            ? <Minus size={11} />
            : <TrendingDown size={11} />
          }
          <span>{tendencia.positivo ? '+' : ''}{tendencia.pct}% vs. período anterior</span>
        </div>
      )}
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────

interface ProgressBarProps {
  label: string
  value: number
  max: number
  cor?: string
  showValue?: boolean
}

export function ProgressBar({ label, value, max, cor = 'var(--blue)', showValue = true }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <span className="text-fg-2">{label}</span>
        {showValue && <span className="text-fg-3 font-mono">{value}/{max}</span>}
      </div>
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  )
}

// ── Mini Timeline ──────────────────────────────────────────────────

interface MiniTimelineItem {
  data: string
  descricao: string
  tipo: string
  cor?: string
}

export function MiniTimeline({ itens }: { itens: MiniTimelineItem[] }) {
  return (
    <div className="space-y-0">
      {itens.map((item, i) => (
        <div key={i} className="flex gap-3 pb-4 relative">
          {/* Linha vertical */}
          {i < itens.length - 1 && (
            <div className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />
          )}

          {/* Ponto */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 z-10"
            style={{ backgroundColor: item.cor ?? 'var(--text-3)' }}
          />

          {/* Conteúdo */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[12px] text-fg-1 leading-snug">{item.descricao}</div>
            <div className="text-[10px] text-fg-3 mt-0.5 font-mono">{item.data}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Badge de tipo de matéria ───────────────────────────────────────

const tipoCorMap: Record<string, { bg: string; text: string }> = {
  PL:  { bg: 'bg-brand-blue-soft', text: 'text-brand-blue' },
  PDL: { bg: 'bg-brand-purple-soft', text: 'text-brand-purple' },
  PRL: { bg: 'bg-brand-purple-soft', text: 'text-brand-purple' },
  MOC: { bg: 'bg-brand-green-soft', text: 'text-brand-green' },
  REQ: { bg: 'bg-surface-2', text: 'text-fg-2' },
  IND: { bg: 'bg-brand-amber-soft', text: 'text-brand-amber' },
}

export function TipoBadge({ sigla, nome }: { sigla: string; nome?: string }) {
  const cfg = tipoCorMap[sigla] ?? { bg: 'bg-surface-2', text: 'text-fg-2' }
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
      {sigla}
      {nome && <span className="font-normal text-[10px] opacity-70">{nome}</span>}
    </span>
  )
}

// ── Regime badge ───────────────────────────────────────────────────

export function RegimeBadge({ regime }: { regime: string }) {
  if (regime === 'ORDINARIO') return null
  const label = regime === 'URGENTE' ? 'URGENTE'
    : regime === 'URGENCIA_ESPECIAL' ? 'URG. ESPECIAL'
    : regime

  return (
    <span className="text-[9px] font-bold bg-brand-amber-soft text-brand-amber px-1.5 py-0.5 rounded">
      {label}
    </span>
  )
}
