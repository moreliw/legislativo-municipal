'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Registrar o erro em serviço de monitoramento (Sentry, etc.)
    console.error('Erro global não tratado:', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ background: 'var(--surface-0)', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'var(--red-soft)',
            border: '1px solid rgba(217,64,64,0.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <AlertTriangle size={24} color="var(--red)" />
          </div>

          <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            Algo deu errado
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 8, maxWidth: 400 }}>
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
          {error.digest && (
            <p style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'monospace', marginBottom: 24 }}>
              Código: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--blue)', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 20px', fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
