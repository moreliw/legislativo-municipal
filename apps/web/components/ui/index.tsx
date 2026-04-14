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
  RASCUNHO:                     { label: 'Rascunho',        bg: 'bg-[#1c202e]',   text: 'text-[#5c6282]',  dot: '#5c6282' },
  EM_ELABORACAO:                { label: 'Em elaboração',   bg: 'bg-[#1c202e]',   text: 'text-[#9198b0]',  dot: '#9198b0' },
  PROTOCOLADO:                  { label: 'Protocolado',     bg: 'bg-[#0d1e35]',   text: 'text-[#2d7dd2]',  dot: '#2d7dd2' },
  EM_ANALISE:                   { label: 'Em análise',      bg: 'bg-[#1a1030]',   text: 'text-[#b09de0]',  dot: '#7c5cbf' },
  EM_COMISSAO:                  { label: 'Em comissão',     bg: 'bg-[#1a1030]',   text: 'text-[#b09de0]',  dot: '#7c5cbf' },
  AGUARDANDO_PARECER_JURIDICO:  { label: 'Ag. Jurídico',   bg: 'bg-[#2e1f06]',   text: 'text-[#e8a020]',  dot: '#e8a020' },
  EM_PAUTA:                     { label: 'Em pauta',        bg: 'bg-[#2e1f06]',   text: 'text-[#e8a020]',  dot: '#e8a020' },
  EM_VOTACAO:                   { label: 'Em votação',      bg: 'bg-[#2e1f06]',   text: 'text-[#f5a623]',  dot: '#f5a623' },
  APROVADO:                     { label: 'Aprovado',        bg: 'bg-[#0a2318]',   text: 'text-[#1fa870]',  dot: '#1fa870' },
  REJEITADO:                    { label: 'Rejeitado',       bg: 'bg-[#2e0e0e]',   text: 'text-[#d94040]',  dot: '#d94040' },
  DEVOLVIDO:                    { label: 'Devolvido',       bg: 'bg-[#2e0e0e]',   text: 'text-[#e07070]',  dot: '#d94040' },
  PUBLICADO:                    { label: 'Publicado',       bg: 'bg-[#0a2318]',   text: 'text-[#1fa870]',  dot: '#1fa870' },
  ARQUIVADO:                    { label: 'Arquivado',       bg: 'bg-[#1c202e]',   text: 'text-[#5c6282]',  dot: '#5c6282' },
  SUSPENSO:                     { label: 'Suspenso',        bg: 'bg-[#2e0e0e]',   text: 'text-[#e07070]',  dot: '#d94040' },
  RETIRADO:                     { label: 'Retirado',        bg: 'bg-[#1c202e]',   text: 'text-[#5c6282]',  dot: '#5c6282' },
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
    <span className="font-mono text-[#2d7dd2] font-semibold text-[13px]">{numero}</span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-[#1e2333] rounded', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5 space-y-3">
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
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1e2333]">
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
      <div className="w-12 h-12 rounded-full bg-[#1c202e] border border-[#1e2333] flex items-center justify-center mb-4">
        <span className="text-[#5c6282] text-xl">·</span>
      </div>
      <h3 className="text-[14px] font-medium text-[#9198b0] mb-1">{title}</h3>
      {description && (
        <p className="text-[12px] text-[#5c6282] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── ErrorMessage ──────────────────────────────────────────────────
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#2e0e0e] border border-[#d94040]/30 rounded-lg px-4 py-3">
      <AlertTriangle size={14} className="text-[#d94040] flex-shrink-0" />
      <span className="text-[12px] text-[#e07070]">{message}</span>
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────
export function LoadingSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Loader2 size={size} className={cn('animate-spin text-[#2d7dd2]', className)} />
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
      <div className="relative bg-[#13161f] border border-[#1e2333] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#5c6282] hover:text-[#9198b0] transition-colors"
        >
          <X size={15} />
        </button>

        <h2 className="text-[15px] font-semibold text-[#e8eaf0] mb-2">{title}</h2>
        <p className="text-[13px] text-[#9198b0] leading-relaxed mb-6">{description}</p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 text-[13px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] py-2 rounded-md transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 text-[13px] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60',
              variant === 'danger'
                ? 'bg-[#d94040] hover:bg-[#b33030] text-white'
                : 'bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white',
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
    success: { bg: 'bg-[#0a2318]', border: 'border-[#1fa870]/30', text: 'text-[#1fa870]' },
    error:   { bg: 'bg-[#2e0e0e]', border: 'border-[#d94040]/30', text: 'text-[#e07070]' },
    info:    { bg: 'bg-[#0d1e35]', border: 'border-[#2d7dd2]/30', text: 'text-[#2d7dd2]' },
    warning: { bg: 'bg-[#2e1f06]', border: 'border-[#e8a020]/30', text: 'text-[#e8a020]' },
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
    <nav className="flex items-center gap-1 text-[12px] text-[#5c6282] mb-5">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-[#9198b0] transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-[#9198b0] font-medium">{item.label}</span>
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
    <div className="border-b border-[#1e2333] mb-5">
      <div className="flex gap-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors',
              active === tab.id
                ? 'border-[#2d7dd2] text-[#2d7dd2]'
                : 'border-transparent text-[#5c6282] hover:text-[#9198b0]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                active === tab.id ? 'bg-[#0d1e35] text-[#2d7dd2]' : 'bg-[#1c202e] text-[#5c6282]',
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
        <h1 className="text-xl font-semibold text-[#e8eaf0]">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-[#5c6282] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
