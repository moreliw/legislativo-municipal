'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { BuscaGlobal } from '../BuscaGlobal'

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Painel', proposicoes: 'Proposições', sessoes: 'Sessões',
  processos: 'Processos', documentos: 'Documentos', relatorios: 'Relatórios',
  notificacoes: 'Notificações', auditoria: 'Auditoria', portal: 'Portal Público',
  admin: 'Administração', usuarios: 'Usuários', fluxos: 'Fluxos BPMN',
  regras: 'Regras', configuracoes: 'Configurações', tramitacao: 'Tramitação', nova: 'Nova',
}

export function TopBar() {
  const pathname = usePathname()
  const [buscaAberta, setBuscaAberta] = useState(false)
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => ({
    label: breadcrumbMap[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setBuscaAberta(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  return (
    <>
      <header className="h-12 bg-[#0d0f16] border-b border-[#1e2333] flex items-center px-6 gap-4 flex-shrink-0">
        <nav className="flex items-center gap-1 text-[13px] flex-1 min-w-0">
          {breadcrumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-[#5c6282]" />}
              {c.isLast ? <span className="text-[#e8eaf0] font-medium">{c.label}</span>
                : <Link href={c.href} className="text-[#5c6282] hover:text-[#9198b0] transition-colors">{c.label}</Link>}
            </span>
          ))}
        </nav>
        <button onClick={() => setBuscaAberta(true)} className="flex items-center gap-2 bg-[#13161f] border border-[#1e2333] rounded-md px-3 h-7 w-64 text-[12px] text-[#5c6282] hover:border-[#2a3048] transition-colors">
          <Search size={13} /><span className="flex-1 text-left">Buscar...</span><span className="font-mono text-[10px]">⌘K</span>
        </button>
        <Link href="/notificacoes" className="relative w-7 h-7 flex items-center justify-center text-[#5c6282] hover:text-[#9198b0] transition-colors">
          <Bell size={15} />
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#d94040] rounded-full text-[9px] text-white flex items-center justify-center font-bold">4</span>
        </Link>
      </header>
      <BuscaGlobal aberta={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </>
  )
}
