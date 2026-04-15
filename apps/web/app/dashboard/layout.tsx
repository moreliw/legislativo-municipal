'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getToken, getUsuario, logout, apiFetch } from '@/lib/auth'

// Ícones SVG inline
const ICONS: Record<string, string> = {
  home:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  doc:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  folder:   "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  proc:     "M12 22V12M12 12l-3-3M12 12l3-3M2 17l3-3 4 4 3-4 4 3",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  gear:     "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe:    "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  chevdown: "M6 9l6 6 6-6",
  chevup:   "M18 15l-6-6-6 6",
  sistema:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
}

interface MenuItem {
  id: string
  label: string
  href: string
  icon: string
  secao?: string
  ordem: number
}

interface MenuData {
  menus: MenuItem[]
  isSuperAdmin: boolean
  usuario: { id: string; nome: string; email: string; casaId: string; perfis: string[] }
}

function IconSvg({ name, size = 15 }: { name: string; size?: number }) {
  const d = ICONS[name] || ICONS.home
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      ))}
    </svg>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const usuario = getUsuario()

  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }

    apiFetch<MenuData>('/api/v1/menus')
      .then(data => { setMenuData(data); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const initials = usuario?.nome
    ? usuario.nome.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase()
    : '?'

  const mainMenus  = menuData?.menus.filter(m => !m.secao) ?? []
  const adminMenus = menuData?.menus.filter(m => m.secao === 'admin') ?? []
  const sistemMenus = menuData?.menus.filter(m => m.secao === 'sistema') ?? []

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  function NavLink({ href, icon, label, accent }: { href: string; icon: string; label: string; accent?: string }) {
    const active = isActive(href)
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', borderRadius: 7, marginBottom: 1,
        fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? 'var(--text)' : 'var(--text-3)',
        background: active ? 'var(--bg-raised)' : 'transparent',
        textDecoration: 'none', transition: 'all 0.12s',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
      }}>
        <span style={{ color: active ? (accent || 'var(--brand)') : 'var(--text-4)', display: 'flex', flexShrink: 0 }}>
          <IconSvg name={icon} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: menuData?.isSuperAdmin
                ? 'linear-gradient(135deg,#7c3aed,#5b21b6)'
                : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: menuData?.isSuperAdmin
                ? '0 2px 10px rgba(124,58,237,0.3)'
                : '0 2px 10px rgba(59,130,246,0.3)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.4 8.4 13 9 13H15C15.6 13 16 13.4 16 14V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                {menuData?.isSuperAdmin ? 'Sistema' : (usuario?.casaSigla || 'Legislativo')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {menuData?.isSuperAdmin ? 'Administração Geral' : (usuario ? `${usuario.municipio} · ${usuario.uf}` : '')}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ width: 16, height: 16, border: '2px solid var(--border-md)', borderTop: '2px solid var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}/>
            </div>
          ) : (
            <>
              {/* Menus principais */}
              <div style={{ marginBottom: 16 }}>
                {mainMenus.map(m => (
                  <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} />
                ))}
              </div>

              {/* Seção Admin */}
              {adminMenus.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 4px 10px' }}/>
                  <div style={{ padding: '0 4px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-4)' }}>
                    Administração
                  </div>
                  {adminMenus.map(m => (
                    <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} />
                  ))}
                </div>
              )}

              {/* Seção Sistema (superadmin) */}
              {sistemMenus.length > 0 && (
                <div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 4px 10px' }}/>
                  <div style={{ padding: '0 4px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--purple)' }}>
                    Sistema
                  </div>
                  {sistemMenus.map(m => (
                    <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} accent="var(--purple)" />
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User menu */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', position: 'relative' as const }}>
          {menuOpen && (
            <div style={{
              position: 'absolute' as const, bottom: '100%', left: 8, right: 8,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 6, marginBottom: 4,
              boxShadow: 'var(--shadow-lg)', zIndex: 50,
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ padding: '8px 10px', marginBottom: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{usuario?.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>{usuario?.email}</div>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
              <Link href="/trocar-senha" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>
                <IconSvg name="lock" /> Alterar senha
              </Link>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
              <button onClick={() => logout()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, fontSize: 13, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <IconSvg name="logout" /> Sair do sistema
              </button>
            </div>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px',
            background: menuOpen ? 'var(--bg-raised)' : 'transparent',
            border: menuOpen ? '1px solid var(--border)' : '1px solid transparent',
            borderRadius: 8, cursor: 'pointer', textAlign: 'left' as const,
            transition: 'all 0.12s', fontFamily: 'var(--font-sans)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: menuData?.isSuperAdmin
                ? 'linear-gradient(135deg,#312e81,#4c1d95)'
                : 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',
              border: '1px solid var(--border-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              color: menuData?.isSuperAdmin ? '#a78bfa' : '#60a5fa',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' as const, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.nome?.split(' ')[0]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {menuData?.usuario?.perfis?.[0]?.replace(/_/g, ' ') || ''}
              </div>
            </div>
            <IconSvg name={menuOpen ? 'chevup' : 'chevdown'} size={12} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          height: 48, flexShrink: 0,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
            {menuData?.isSuperAdmin ? 'Administração Geral do Sistema' : (usuario?.casaNome || 'Câmara Municipal')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
            {new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })}
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
