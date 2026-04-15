'use client'

import { useState, useCallback, useRef, createContext, useContext, ReactNode } from 'react'
import { X, AlertTriangle } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────

interface ConfirmOptions {
  titulo: string
  descricao: string
  confirmLabel?: string
  cancelLabel?: string
  variante?: 'danger' | 'default'
}

interface ConfirmContextValue {
  confirmar: (opcoes: ConfirmOptions) => Promise<boolean>
}

// ── Context ────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirmar = useCallback((opcoes: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      resolverRef.current = resolve
      setEstado({ ...opcoes, open: true })
    })
  }, [])

  const responder = useCallback((resultado: boolean) => {
    resolverRef.current?.(resultado)
    resolverRef.current = null
    setEstado(null)
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}

      {/* Modal de confirmação global */}
      {estado?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => responder(false)} />

          <div className="relative bg-surface-1 border border-line-2 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => responder(false)}
              className="absolute top-4 right-4 text-fg-3 hover:text-fg-3 transition-colors"
            >
              <X size={15} />
            </button>

            {/* Ícone de aviso para variante danger */}
            {estado.variante === 'danger' && (
              <div className="w-10 h-10 rounded-full bg-brand-red-soft border border-brand-red/30 flex items-center justify-center mb-4">
                <AlertTriangle size={18} className="text-brand-red" />
              </div>
            )}

            <h2 className="text-[15px] font-semibold text-fg-1 mb-2">{estado.titulo}</h2>
            <p className="text-[13px] text-fg-3 leading-relaxed mb-6">{estado.descricao}</p>

            <div className="flex gap-2">
              <button
                onClick={() => responder(false)}
                className="flex-1 text-[13px] border border-line text-fg-3 hover:text-fg-1 py-2.5 rounded-md transition-colors"
              >
                {estado.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => responder(true)}
                className={`flex-1 text-[13px] font-medium py-2.5 rounded-md transition-colors ${
                  estado.variante === 'danger'
                    ? 'bg-brand-red hover:bg-brand-red text-white'
                    : 'bg-brand-blue hover:bg-brand-blue-2 text-white'
                }`}
              >
                {estado.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider')
  return ctx.confirmar
}

// ── Hook: useToast ─────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  mensagem: string
  tipo: ToastType
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const mostrar = useCallback((mensagem: string, tipo: ToastType = 'info') => {
    const id = `toast-${Date.now()}`
    setToasts(ts => [...ts, { id, mensagem, tipo }])
    setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remover = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  return { toasts, mostrar, remover }
}

// ── ToastContainer ─────────────────────────────────────────────────

const toastConfig = {
  success: { bg: 'bg-brand-green-soft', border: 'border-brand-green/30', text: 'text-brand-green', dot: 'bg-brand-green' },
  error:   { bg: 'bg-brand-red-soft', border: 'border-brand-red/30', text: 'text-brand-red', dot: 'bg-brand-red' },
  info:    { bg: 'bg-brand-blue-soft', border: 'border-brand-blue/30', text: 'text-brand-blue', dot: 'bg-brand-blue' },
  warning: { bg: 'bg-brand-amber-soft', border: 'border-brand-amber/30', text: 'text-brand-amber', dot: 'bg-brand-amber' },
}

export function ToastContainer({
  toasts,
  onRemover,
}: {
  toasts: ToastItem[]
  onRemover: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => {
        const cfg = toastConfig[toast.tipo]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-[13px] shadow-lg max-w-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="flex-1">{toast.mensagem}</span>
            <button
              onClick={() => onRemover(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity ml-1"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Hook: useDebounce ──────────────────────────────────────────────

import { useEffect } from 'react'

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Hook: usePaginacao ─────────────────────────────────────────────

export function usePaginacao(totalItems: number, pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    proximo: () => setPage(p => Math.min(p + 1, totalPages)),
    anterior: () => setPage(p => Math.max(p - 1, 1)),
    irPara: (n: number) => setPage(Math.max(1, Math.min(n, totalPages))),
    reset: () => setPage(1),
    offset: (page - 1) * pageSize,
  }
}
