'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

function LoginForm() {
  const router     = useRouter()
  const params     = useSearchParams()
  const nextUrl    = params.get('next') || '/dashboard'

  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
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
      localStorage.setItem('leg_token',     data.accessToken)
      localStorage.setItem('leg_usuario',   JSON.stringify(data.usuario))
      localStorage.setItem('leg_token_exp', String(Date.now() + data.expiresIn * 1000))
      router.replace(data.usuario.precisaTrocar ? '/trocar-senha' : nextUrl)
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--surface-0)' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--border-2)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'var(--font-sans)', background:'var(--surface-0)' }}>

      {/* ── Left branding panel ── */}
      <aside style={{
        flex: '0 0 400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 44px',
        background: 'linear-gradient(160deg, #0c1628 0%, #090e1a 50%, #060810 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle, rgba(37,99,192,0.10) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, right:-80, width:300, height:300, background:'radial-gradient(circle, rgba(91,62,168,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Logo */}
          <div style={{
            width:50, height:50,
            background:'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            borderRadius:14,
            display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:32,
            boxShadow:'0 8px 32px rgba(59,130,246,0.35)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.4 8.4 13 9 13H15C15.6 13 16 13.4 16 14V21"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{ fontSize:28, fontWeight:800, color:'#e8edf7', letterSpacing:'-0.03em', marginBottom:10 }}>PLENO</div>
          <div style={{ fontSize:14, color:'#3a4a60', lineHeight:1.75, marginBottom:44 }}>
            Plataforma Legislativa Nacional Online para câmaras municipais
          </div>

          {/* Features */}
          {[
            { icon:'📋', text:'Gestão de proposições e tramitação' },
            { icon:'🗳️', text:'Controle de sessões e votações' },
            { icon:'📁', text:'Documentos e publicação oficial' },
            { icon:'⚖️', text:'Fluxos BPM integrados com Camunda' },
          ].map(f => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{
                width:34, height:34, borderRadius:9,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.06)',
                flexShrink:0, fontSize:15,
              }}>{f.icon}</div>
              <span style={{ fontSize:13, color:'#3d4f66', lineHeight:1.4 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ height:1, background:'rgba(255,255,255,0.05)', marginBottom:16 }} />
          <p style={{ fontSize:11, color:'#1e2a3a', lineHeight:1.6 }}>
            Acesso monitorado e registrado conforme LGPD · Lei 13.709/2018
          </p>
        </div>
      </aside>

      {/* ── Right form panel ── */}
      <main style={{
        flex:1,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        padding:'40px 24px',
        background:'var(--surface-0)',
      }}>
        <div style={{ width:'100%', maxWidth:400, animation:'fadeIn 0.35s ease forwards' }}>

          {/* Heading */}
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text-1)', marginBottom:0, letterSpacing:'-0.02em' }}>
              Entrar na conta
            </h2>
          </div>

          {/* Error */}
          {erro && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:10,
              padding:'12px 14px', marginBottom:20,
              background:'var(--red-soft)',
              border:'1px solid rgba(184,32,32,0.2)',
              borderRadius:8,
              animation:'fadeIn 0.2s ease',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="12" cy="12" r="10" stroke="var(--red)" strokeWidth="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize:13, color:'var(--red)', lineHeight:1.5 }}>{erro}</span>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>
                E-mail institucional
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@email.gov.br"
                autoComplete="email"
                required
                disabled={loading}
                style={{ borderRadius:9, padding:'11px 14px', fontSize:14, width:'100%' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Senha
                </label>
                <a href="/recuperar-senha" style={{ fontSize:12, color:'var(--blue)', textDecoration:'none' }}>
                  Esqueceu a senha?
                </a>
              </div>
              <div style={{ position:'relative', width:'100%' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ borderRadius:9, padding:'11px 44px 11px 14px', fontSize:14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--text-3)', padding:4,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'color 0.15s',
                  }}
                >
                  {showPwd
                    ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:'100%', marginTop:24,
                padding:'12px 20px',
                background: loading ? 'var(--blue-2)' : 'var(--blue)',
                color:'#fff', border:'none', borderRadius:9,
                fontSize:14, fontWeight:600,
                fontFamily:'var(--font-sans)',
                cursor: loading ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all 0.15s',
                boxShadow: loading ? 'none' : '0 4px 20px var(--brand-glow)',
                letterSpacing:'0.01em',
              }}
              onMouseOver={e => { if (!loading) (e.currentTarget.style.transform = 'translateY(-1px)') }}
              onMouseOut={e => { (e.currentTarget.style.transform = 'translateY(0)') }}
            >
              {loading ? (
                <>
                  <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Mobile LGPD note */}
          <p style={{ marginTop:32, fontSize:11, color:'var(--text-3)', textAlign:'center', lineHeight:1.6, display:'none' }}
            className="login-mobile-footer">
            Acesso monitorado conforme LGPD · Lei 13.709/2018
          </p>
        </div>
      </main>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
          main  { padding: 48px 20px !important; align-items: flex-start !important; padding-top: 60px !important; }
          .login-mobile-footer { display: block !important; }
        }
        @media (max-width: 420px) {
          main { padding: 40px 16px !important; }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
