'use client'

import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] border border-[var(--border)]"
      title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-[var(--text-muted)]" />
      ) : (
        <Moon className="w-5 h-5 text-[var(--text-muted)]" />
      )}
    </button>
  )
}
