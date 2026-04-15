'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isLoggedIn, getUsuario, refreshToken } from '@/lib/auth'

// Rotas que não precisam de autenticação
const ROTAS_PUBLICAS = [
  '/login',
  '/recuperar-senha',
  '/redefinir-senha',
  '/portal',
  '/portal/',
]

function isRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r))
}

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [autorizado, setAutorizado] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    async function verificarAuth() {
      // Rota pública: sempre liberar
      if (isRotaPublica(pathname)) {
        setAutorizado(true)
        setVerificando(false)
        return
      }

      // Verificar token local
      if (isLoggedIn()) {
        const usuario = getUsuario()
        // Se precisa trocar senha e não está na rota de troca
        if (usuario?.precisaTrocar && pathname !== '/trocar-senha') {
          router.replace('/trocar-senha')
          return
        }
        setAutorizado(true)
        setVerificando(false)
        return
      }

      // Token expirado — tentar renovar via refresh cookie
      const renovado = await refreshToken()
      if (renovado) {
        const usuario = getUsuario()
        if (usuario?.precisaTrocar && pathname !== '/trocar-senha') {
          router.replace('/trocar-senha')
          return
        }
        setAutorizado(true)
        setVerificando(false)
        return
      }

      // Sem sessão válida — redirecionar para login
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }

    verificarAuth()
  }, [pathname, router])

  if (verificando) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f1117', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid #1e2333',
          borderTop: '3px solid #2d7dd2',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#5c6282', fontSize: 14, margin: 0 }}>Verificando sessão...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!autorizado) return null

  return <>{children}</>
}
