'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText, GitBranch, Calendar, Users, Settings,
  BarChart2, Bell, Archive, Shield, Home, ChevronRight, Globe,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    icon: Home,      label: 'Painel' },
  { href: '/proposicoes',  icon: FileText,  label: 'Proposições' },
  { href: '/sessoes',      icon: Calendar,  label: 'Sessões' },
  { href: '/processos',    icon: GitBranch, label: 'Processos' },
  { href: '/documentos',   icon: Archive,   label: 'Documentos' },
  { href: '/relatorios',   icon: BarChart2, label: 'Relatórios' },
  { href: '/notificacoes', icon: Bell,      label: 'Notificações', badge: 4 },
]

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/usuarios',      icon: Users,    label: 'Usuários' },
  { href: '/admin/fluxos',        icon: GitBranch,label: 'Fluxos BPMN' },
  { href: '/admin/regras',        icon: Shield,   label: 'Regras' },
  { href: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
  { href: '/auditoria',           icon: Shield,   label: 'Auditoria' },
  { href: '/portal',              icon: Globe,    label: 'Portal Público' },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
        active
          ? 'bg-brand-blue-active text-brand-blue'
          : 'text-fg-2 hover:bg-surface-2 hover:text-fg-1'
      }`}
    >
      <item.icon
        size={15}
        className={active ? 'text-brand-blue' : 'text-fg-3 group-hover:text-fg-2'}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="w-4 h-4 bg-brand-red rounded-full text-[9px] text-white flex items-center justify-center font-bold">
          {item.badge}
        </span>
      ) : active ? (
        <ChevronRight size={12} />
      ) : null}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-60 bg-surface-sidebar border-r border-line flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-brand-blue flex items-center justify-center">
            <span className="text-white font-bold text-xs">CM</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-fg-1">Câmara Municipal</div>
            <div className="text-[10px] text-fg-3 font-mono">São Francisco · MG</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <div className="pt-4 pb-1">
          <div className="text-[10px] font-semibold tracking-widest text-fg-3 uppercase px-3 mb-2">
            Administração
          </div>
          {ADMIN_ITEMS.map(item => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-purple-soft border border-line-2 flex items-center justify-center text-brand-purple text-[11px] font-semibold">
            CE
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-fg-1 truncate">Carlos Eduardo Lima</div>
            <div className="text-[10px] text-fg-3 truncate">Secretário Legislativo</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
