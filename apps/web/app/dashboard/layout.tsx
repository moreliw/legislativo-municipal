'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUsuario, logout, temPermissao } from '@/lib/auth'

type NavItem = { href: string; icon: React.ReactNode; label: string; permissao?: string }

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ICONS = {
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  doc:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  folder:   "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  gear:     "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  proc:     "M12 22V12M12 12l-3-3M12 12l3-3M2 17l3-3 4 4 3-4 4 3",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe:    "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  home:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  chevdown: "M6 9l6 6 6-6",
  chevup:   "M18 15l-6-6-6 6",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<ReturnType<typeof getUsuario>>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setUsuario(getUsuario()) }, [])
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const initials = usuario?.nome
    ? usuario.nome.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase()
    : '?'

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      fontSize: 13, fontWeight: isActive(href) ? 600 : 400,
      color: isActive(href) ? 'var(--text)' : 'var(--text-3)',
      background: isActive(href) ? 'var(--bg-raised)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.12s',
      marginBottom: 1,
      border: isActive(href) ? '1px solid var(--border)' : '1px solid transparent',
    }}>
      <span style={{ color: isActive(href) ? 'var(--brand)' : 'var(--text-4)', display: 'flex' }}>
        {icon}
      </span>
      {label}
    </Link>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 224, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.4 8.4 13 9 13H15C15.6 13 16 13.4 16 14V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.casaSigla || 'Legislativo'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario ? `${usuario.municipio} · ${usuario.uf}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            <NavLink href="/dashboard"   icon={<Icon d={ICONS.home} />}     label="Painel" />
            <NavLink href="/proposicoes" icon={<Icon d={ICONS.doc} />}      label="Proposições" />
            <NavLink href="/sessoes"     icon={<Icon d={ICONS.calendar} />} label="Sessões" />
            <NavLink href="/documentos"  icon={<Icon d={ICONS.folder} />}   label="Documentos" />
            <NavLink href="/processos"   icon={<Icon d={ICONS.proc} />}     label="Processos" />
            <NavLink href="/relatorios"  icon={<Icon d={ICONS.chart} />}    label="Relatórios" />
            <NavLink href="/notificacoes" icon={<Icon d={ICONS.bell} />}   label="Notificações" />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 4px 12px' }} />

          <div style={{ padding: '0 4px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-4)' }}>
            Administração
          </div>
          <NavLink href="/admin/usuarios"      icon={<Icon d={ICONS.users} />}  label="Usuários" />
          <NavLink href="/admin/configuracoes" icon={<Icon d={ICONS.gear} />}   label="Configurações" />
          <NavLink href="/auditoria"           icon={<Icon d={ICONS.shield} />} label="Auditoria" />
          <NavLink href="/portal"              icon={<Icon d={ICONS.globe} />}  label="Portal Público" />
        </nav>

        {/* User */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', position: 'relative' as const }}>
          {menuOpen && (
            <div style={{
              position: 'absolute' as const, bottom: '100%', left: 8, right: 8,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 6, marginBottom: 4,
              boxShadow: 'var(--shadow-lg)', zIndex: 50,
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ padding: '8px 10px', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{usuario?.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{usuario?.email}</div>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <Link href="/trocar-senha" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>
                <Icon d={ICONS.lock} size={13} /> Alterar senha
              </Link>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button onClick={() => logout()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <Icon d={ICONS.logout} size={13} /> Sair do sistema
              </button>
            </div>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', background: menuOpen ? 'var(--bg-raised)' : 'none',
            border: menuOpen ? '1px solid var(--border)' : '1px solid transparent',
            borderRadius: 8, cursor: 'pointer', textAlign: 'left' as const,
            transition: 'all 0.12s', fontFamily: 'var(--font-sans)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #312e81, #4c1d95)',
              border: '1px solid var(--border-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#a78bfa',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' as const }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.nome?.split(' ')[0]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.perfis?.[0]?.replace(/_/g, ' ')}
              </div>
            </div>
            <Icon d={menuOpen ? ICONS.chevup : ICONS.chevdown} size={13} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: 50, flexShrink: 0,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Breadcrumb */}
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
              {usuario?.casaNome || 'Câmara Municipal'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
