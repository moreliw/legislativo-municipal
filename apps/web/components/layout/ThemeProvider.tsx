'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getToken, getUsuario, setUsuarioParcial } from '@/lib/auth'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

  // Read persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const usuario = getUsuario()
    const temaUsuario = usuario?.preferencias?.tema
    const resolved = temaUsuario === 'dark' || temaUsuario === 'light' ? temaUsuario : (stored ?? 'light')
    setTheme(resolved)
    applyTheme(resolved)

    const token = getToken()
    if (!token) return

    fetch(`${API}/api/v1/usuarios/me/preferencias`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        return data?.preferencias?.tema as Theme | undefined
      })
      .then((temaRemoto) => {
        if (temaRemoto !== 'dark' && temaRemoto !== 'light') return
        localStorage.setItem('theme', temaRemoto)
        setUsuarioParcial({ preferencias: { ...(usuario?.preferencias ?? {}), tema: temaRemoto } })
        setTheme(temaRemoto)
        applyTheme(temaRemoto)
      })
      .catch(() => {
        // Falha de sincronização não deve quebrar renderização
      })
  }, [])

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      applyTheme(next)
      const usuario = getUsuario()
      setUsuarioParcial({ preferencias: { ...(usuario?.preferencias ?? {}), tema: next } })

      const token = getToken()
      if (token) {
        fetch(`${API}/api/v1/usuarios/me/preferencias`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tema: next }),
        }).catch(() => {
          // Mantém UX local mesmo se a persistência remota falhar
        })
      }
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
