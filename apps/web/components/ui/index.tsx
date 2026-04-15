// components/ui/index.tsx
// Componentes reutilizáveis do design system legislativo

import { ReactNode, useState } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import type { StatusProposicao } from '@/lib/api'

// ── cn helper ─────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// ── StatusBadge ───────────────────────────────────────────────────
const statusMap: Record<
  StatusProposicao,
  { label: string; bg: string; text: string; dot: string }
> = {
  RASCUNHO:                     { label: 'Rascunho',        bg: 'bg-surface-2',   text: 'text-fg-3',  dot: 'var(--text-3)' },
  EM_ELABORACAO:                { label: 'Em elaboração',   bg: 'bg-surface-2',   text: 'text-fg-2',  dot: 'var(--text-3)' },
  PROTOCOLADO:                  { label: 'Protocolado',     bg: 'bg-brand-blue-soft',   text: 'text-brand-blue',  dot: 'var(--blue)' },
  EM_ANALISE:                   { label: 'Em análise',      bg: 'bg-brand-purple-soft',   text: 'text-brand-purple',  dot: 'var(--purple)' },
  EM_COMISSAO:                  { label: 'Em comissão',     bg: 'bg-brand-purple-soft',   text: 'text-brand-purple',  dot: 'var(--purple)' },
  AGUARDANDO_PARECER_JURIDICO:  { label: 'Ag. Jurídico',   bg: 'bg-brand-amber-soft',   text: 'text-brand-amber',  dot: 'var(--amber)' },
  EM_PAUTA:                     { label: 'Em pauta',        bg: 'bg-brand-amber-soft',   text: 'text-brand-amber',  dot: 'var(--amber)' },
  EM_VOTACAO:                   { label: 'Em votação',      bg: 'bg-brand-amber-soft',   text: 'text-brand-amber',  dot: 'var(--amber)' },
  APROVADO:                     { label: 'Aprovado',        bg: 'bg-brand-green-soft',   text: 'text-brand-green',  dot: 'var(--green)' },
  REJEITADO:                    { label: 'Rejeitado',       bg: 'bg-brand-red-soft',   text: 'text-brand-red',  dot: 'var(--red)' },
  DEVOLVIDO:                    { label: 'Devolvido',       bg: 'bg-brand-red-soft',   text: 'text-brand-red',  dot: 'var(--red)' },
  PUBLICADO:                    { label: 'Publicado',       bg: 'bg-brand-green-soft',   text: 'text-brand-green',  dot: 'var(--green)' },
  ARQUIVADO:                    { label: 'Arquivado',       bg: 'bg-surface-2',   text: 'text-fg-3',  dot: 'var(--text-3)' },
  SUSPENSO:                     { label: 'Suspenso',        bg: 'bg-brand-red-soft',   text: 'text-brand-red',  dot: 'var(--red)' },
  RETIRADO:                     { label: 'Retirado',        bg: 'bg-surface-2',   text: 'text-fg-3',  dot: 'var(--text-3)' },
}

export function StatusBadge({ status }: { status: StatusProposicao }) {
  const cfg = statusMap[status] ?? statusMap.RASCUNHO
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium', cfg.bg, cfg.text)}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ── NumeroBadge ───────────────────────────────────────────────────
export function NumeroBadge({ numero }: { numero: string }) {
  return (
    <span className="font-mono text-brand-blue font-semibold text-[13px]">{numero}</span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-line rounded', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-1 border border-line rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-24 h-5" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-3/4 h-4" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-24 h-3" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-line">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-20 h-5 rounded-full" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-2 border border-line flex items-center justify-center mb-4">
        <span className="text-fg-3 text-xl">·</span>
      </div>
      <h3 className="text-[14px] font-medium text-fg-2 mb-1">{title}</h3>
      {description && (
        <p className="text-[12px] text-fg-3 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── ErrorMessage ──────────────────────────────────────────────────
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-brand-red-soft border border-brand-red/30 rounded-lg px-4 py-3">
      <AlertTriangle size={14} className="text-brand-red flex-shrink-0" />
      <span className="text-[12px] text-brand-red">{message}</span>
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────
export function LoadingSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Loader2 size={size} className={cn('animate-spin text-brand-blue', className)} />
  )
}

// ── Modal / ConfirmDialog ─────────────────────────────────────────
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-surface-1 border border-line rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-fg-3 hover:text-fg-2 transition-colors"
        >
          <X size={15} />
        </button>

        <h2 className="text-[15px] font-semibold text-fg-1 mb-2">{title}</h2>
        <p className="text-[13px] text-fg-2 leading-relaxed mb-6">{description}</p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 text-[13px] border border-line text-fg-2 hover:text-fg-1 py-2 rounded-md transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 text-[13px] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60',
              variant === 'danger'
                ? 'bg-brand-red hover:bg-brand-red text-white'
                : 'bg-brand-blue hover:bg-brand-blue-2 text-white',
            )}
          >
            {loading && <LoadingSpinner size={13} className="text-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast notification (simples) ──────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning'

export function Toast({
  message,
  type = 'info',
  onClose,
}: {
  message: string
  type?: ToastType
  onClose: () => void
}) {
  const configs = {
    success: { bg: 'bg-brand-green-soft', border: 'border-brand-green/30', text: 'text-brand-green' },
    error:   { bg: 'bg-brand-red-soft', border: 'border-brand-red/30', text: 'text-brand-red' },
    info:    { bg: 'bg-brand-blue-soft', border: 'border-brand-blue/30', text: 'text-brand-blue' },
    warning: { bg: 'bg-brand-amber-soft', border: 'border-brand-amber/30', text: 'text-brand-amber' },
  }
  const cfg = configs[type]

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border text-[13px] shadow-lg max-w-sm',
      cfg.bg, cfg.border, cfg.text,
    )}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────
export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>
}) {
  return (
    <nav className="flex items-center gap-1 text-[12px] text-fg-3 mb-5">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-fg-2 transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-fg-2 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="border-b border-line mb-5">
      <div className="flex gap-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors',
              active === tab.id
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-fg-3 hover:text-fg-2',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                active === tab.id ? 'bg-brand-blue-soft text-brand-blue' : 'bg-surface-2 text-fg-3',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-xl font-semibold text-fg-1">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-fg-3 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
