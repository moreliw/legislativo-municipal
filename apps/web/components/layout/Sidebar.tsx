'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText, GitBranch, Calendar, Users, Settings,
  BarChart2, Bell, Archive, Shield, Home, ChevronRight, Globe
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    icon: Home,     label: 'Painel' },
  { href: '/proposicoes',  icon: FileText, label: 'Proposições' },
  { href: '/sessoes',      icon: Calendar, label: 'Sessões' },
  { href: '/processos',    icon: GitBranch,label: 'Processos' },
  { href: '/documentos',   icon: Archive,  label: 'Documentos' },
  { href: '/relatorios',   icon: BarChart2,label: 'Relatórios' },
  { href: '/notificacoes', icon: Bell,     label: 'Notificações', badge: 4 },
]

const adminItems = [
  { href: '/admin/usuarios',      icon: Users,    label: 'Usuários' },
  { href: '/admin/fluxos',        icon: GitBranch,label: 'Fluxos BPMN' },
  { href: '/admin/regras',        icon: Shield,   label: 'Regras' },
  { href: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
  { href: '/auditoria',           icon: Shield,   label: 'Auditoria' },
  { href: '/portal',              icon: Globe,    label: 'Portal Público' },
]

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-60 bg-[#0d0f16] border-r border-[#1e2333] flex flex-col flex-shrink-0">
      <div className="px-5 py-4 border-b border-[#1e2333]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#2d7dd2] flex items-center justify-center">
            <span className="text-white font-bold text-xs">CM</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#e8eaf0]">Câmara Municipal</div>
            <div className="text-[10px] text-[#5c6282] font-mono">São Francisco · MG</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-100 group ${
                active ? 'bg-[#162d4a] text-[#2d7dd2]' : 'text-[#9198b0] hover:bg-[#13161f] hover:text-[#e8eaf0]'
              }`}
            >
              <item.icon size={15} className={active ? 'text-[#2d7dd2]' : 'text-[#5c6282] group-hover:text-[#9198b0]'} />
              <span className="flex-1">{item.label}</span>
              {'badge' in item && (item as any).badge ? (
                <span className="w-4 h-4 bg-[#d94040] rounded-full text-[9px] text-white flex items-center justify-center font-bold">{(item as any).badge}</span>
              ) : active ? <ChevronRight size={12} /> : null}
            </Link>
          )
        })}

        <div className="pt-4 pb-1">
          <div className="text-[10px] font-semibold tracking-widest text-[#5c6282] uppercase px-3 mb-2">Administração</div>
          {adminItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-100 group ${
                  active ? 'bg-[#162d4a] text-[#2d7dd2]' : 'text-[#9198b0] hover:bg-[#13161f] hover:text-[#e8eaf0]'
                }`}
              >
                <item.icon size={15} className={active ? 'text-[#2d7dd2]' : 'text-[#5c6282] group-hover:text-[#9198b0]'} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-[#1e2333]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#1a1030] border border-[#2a3048] flex items-center justify-center text-[#7c5cbf] text-[11px] font-semibold">CE</div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#e8eaf0] truncate">Carlos Eduardo Lima</div>
            <div className="text-[10px] text-[#5c6282] truncate">Secretário Legislativo</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
