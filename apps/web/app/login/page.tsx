'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const nextUrl = params.get('next') || '/dashboard'

  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('leg_token')
    const exp   = localStorage.getItem('leg_token_exp')
    if (token && exp && Date.now() < parseInt(exp) - 60_000) {
      router.replace(nextUrl)
    } else {
      setChecking(false)
    }
  }, [router, nextUrl])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) { setErro('Preencha todos os campos'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.message || 'Credenciais inválidas'); return }
      localStorage.setItem('leg_token', data.accessToken)
      localStorage.setItem('leg_usuario', JSON.stringify(data.usuario))
      localStorage.setItem('leg_token_exp', String(Date.now() + data.expiresIn * 1000))
      router.replace(data.usuario.precisaTrocar ? '/trocar-senha' : nextUrl)
    } catch { setErro('Não foi possível conectar ao servidor.') }
    finally { setLoading(false) }
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border-md)', borderTop: '2px solid var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 420px',
        background: 'linear-gradient(160deg, #0d1829 0%, #0a1220 40%, #080b12 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 44px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 40, right: -60,
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.4 8.4 13 9 13H15C15.6 13 16 13.4 16 14V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f4', lineHeight: 1.3, marginBottom: 12 }}>
            Sistema Legislativo<br />Municipal
          </h1>
          <p style={{ fontSize: 14, color: '#4a556e', lineHeight: 1.7, marginBottom: 40 }}>
            Plataforma integrada de gestão de proposições,
            sessões e tramitação legislativa.
          </p>

          {/* Features */}
          {[
            { icon: '⚡', text: 'Tramitação automatizada com BPM' },
            { icon: '🔒', text: 'Conformidade LGPD e auditoria total' },
            { icon: '🏛️', text: 'Multi-tenant por câmara municipal' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#4a556e' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />
          <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
            Acesso monitorado e registrado conforme LGPD · Lei 13.709/2018
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn 0.4s ease forwards' }}>

          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Entrar na conta
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
              Use suas credenciais institucionais
            </p>
          </div>

          {/* Error */}
          {erro && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', marginBottom: 20,
              background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, animation: 'fadeIn 0.2s ease',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>{erro}</span>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label className="label">E-mail institucional</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@email.gov.br"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label className="label" style={{ marginBottom: 0 }}>Senha</label>
                <a href="/recuperar-senha" style={{ fontSize: 12, color: 'var(--brand)' }}>
                  Esqueceu a senha?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', padding: 4, display: 'flex',
                  }}
                >
                  {showPwd
                    ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24, marginTop: 20 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  background: loading ? '#1d3d7a' : 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.25)',
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Verificando...
                  </>
                ) : (
                  <>
                    Entrar no Sistema
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security note */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--green)', flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Conexão segura · Sessão criptografada com JWT
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
