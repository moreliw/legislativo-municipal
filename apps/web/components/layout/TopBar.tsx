'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, ChevronRight, Sun, Moon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { BuscaGlobal } from '../BuscaGlobal'
import { useTheme } from './ThemeProvider'

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Painel',
  proposicoes: 'Proposições',
  sessoes: 'Sessões',
  processos: 'Processos',
  documentos: 'Documentos',
  relatorios: 'Relatórios',
  notificacoes: 'Notificações',
  auditoria: 'Auditoria',
  portal: 'Portal Público',
  admin: 'Administração',
  usuarios: 'Usuários',
  fluxos: 'Fluxos BPMN',
  regras: 'Regras',
  configuracoes: 'Configurações',
  tramitacao: 'Tramitação',
  nova: 'Nova',
}

export function TopBar() {
  const pathname = usePathname()
  const [buscaAberta, setBuscaAberta] = useState(false)
  const { theme, toggle } = useTheme()

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => ({
    label: BREADCRUMB_LABELS[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setBuscaAberta(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="h-12 bg-surface-sidebar border-b border-line flex items-center px-6 gap-4 flex-shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-[13px] flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-fg-3" />}
              {crumb.isLast ? (
                <span className="text-fg-1 font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-fg-3 hover:text-fg-2 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search trigger */}
        <button
          onClick={() => setBuscaAberta(true)}
          className="flex items-center gap-2 bg-surface-2 border border-line rounded-md px-3 h-7 w-64 text-[12px] text-fg-3 hover:border-line-2 transition-colors"
        >
          <Search size={13} />
          <span className="flex-1 text-left">Buscar...</span>
          <span className="font-mono text-[10px]">⌘K</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Alternar tema"
          className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-2 transition-colors"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Notifications */}
        <Link
          href="/notificacoes"
          className="relative w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-2 transition-colors"
        >
          <Bell size={15} />
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-brand-red rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            4
          </span>
        </Link>
      </header>

      <BuscaGlobal aberta={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </>
  )
}
