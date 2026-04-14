'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUsuario, logout, temPermissao } from '@/lib/auth'

interface NavItem { href: string; icon: string; label: string; permissao?: string }

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: '⊞', label: 'Painel' },
  { href: '/proposicoes', icon: '📄', label: 'Proposições', permissao: 'proposicoes:ler' },
  { href: '/sessoes',     icon: '📅', label: 'Sessões',      permissao: 'sessoes:ler' },
  { href: '/documentos',  icon: '🗂',  label: 'Documentos',  permissao: 'documentos:ler' },
  { href: '/processos',   icon: '⚙️',  label: 'Processos',   permissao: 'processos:ler' },
  { href: '/relatorios',  icon: '📊', label: 'Relatórios',  permissao: 'relatorios:ler' },
  { href: '/notificacoes',icon: '🔔', label: 'Alertas' },
]

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/usuarios',      icon: '👤', label: 'Usuários',     permissao: 'usuarios:ler' },
  { href: '/admin/configuracoes', icon: '⚙️',  label: 'Configurações' },
  { href: '/auditoria',           icon: '🔒', label: 'Auditoria',    permissao: 'auditoria:ler' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<ReturnType<typeof getUsuario>>(null)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    setUsuario(getUsuario())
  }, [])

  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  const navLinkStyle = (href: string) => ({
    display: 'flex' as const, alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: 8, fontSize: 13, textDecoration: 'none',
    color: pathname.startsWith(href) ? '#e8eaf0' : '#9198b0',
    background: pathname.startsWith(href) ? '#1c2033' : 'transparent',
    fontWeight: pathname.startsWith(href) ? 600 : 400,
    transition: 'all 0.15s',
    borderLeft: pathname.startsWith(href) ? '2px solid #2d7dd2' : '2px solid transparent',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: 228, background: '#0d0f16', borderRight: '1px solid #1e2333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo da câmara */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1e2333' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#1a3a6e,#2d7dd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(45,125,210,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.casaSigla || 'Câmara Municipal'}
              </div>
              <div style={{ fontSize: 10, color: '#5c6282', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario ? `${usuario.municipio} - ${usuario.uf}` : 'Carregando...'}
              </div>
            </div>
          </div>
        </div>

        {/* Navegação principal */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            {NAV_ITEMS.filter(item => !item.permissao || temPermissao(item.permissao)).map(item => (
              <Link key={item.href} href={item.href} style={navLinkStyle(item.href)}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div>
            <div style={{ padding: '0 12px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#3a3f5a' }}>
              Administração
            </div>
            {ADMIN_ITEMS.filter(item => !item.permissao || temPermissao(item.permissao)).map(item => (
              <Link key={item.href} href={item.href} style={navLinkStyle(item.href)}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <Link href="/portal" style={navLinkStyle('/portal')}>
              <span style={{ fontSize: 15 }}>🌐</span>
              <span>Portal Público</span>
            </Link>
          </div>
        </nav>

        {/* Usuário logado */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #1e2333' }}>
          <div style={{ position: 'relative' as const }}>
            <button onClick={() => setMenuAberto(!menuAberto)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left' as const }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1030', border: '1.5px solid #2a3048', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7c5cbf', flexShrink: 0 }}>
                {iniciais}
              </div>
              <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' as const }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.nome?.split(' ')[0] || 'Usuário'}
                </div>
                <div style={{ fontSize: 10, color: '#5c6282', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.perfis?.[0] || ''}
                </div>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ color: '#5c6282', flexShrink: 0 }}>
                <path d={menuAberto ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>

            {menuAberto && (
              <div style={{ position: 'absolute' as const, bottom: '100%', left: 0, right: 0, background: '#13161f', border: '1px solid #1e2333', borderRadius: 10, padding: 6, marginBottom: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <Link href="/perfil" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: '#9198b0', textDecoration: 'none' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Meu perfil
                </Link>
                <Link href="/trocar-senha" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: '#9198b0', textDecoration: 'none' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Alterar senha
                </Link>
                <div style={{ height: 1, background: '#1e2333', margin: '4px 0' }} />
                <button onClick={() => logout()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: '#d94040', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Sair do sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 52, background: '#0d0f16', borderBottom: '1px solid #1e2333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#5c6282' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#3a3f5a', fontFamily: 'monospace' }}>
              {usuario?.casaNome}
            </div>
          </div>
        </header>

        {/* Página */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
