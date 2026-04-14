'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('leg_token')
    if (token) {
      fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (r.ok) router.replace('/dashboard')
          else { localStorage.removeItem('leg_token'); setCheckingAuth(false) }
        }).catch(() => setCheckingAuth(false))
    } else { setCheckingAuth(false) }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !senha.trim()) { setErro('Preencha e-mail e senha'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.message || 'Credenciais inválidas'); return }
      localStorage.setItem('leg_token', data.accessToken)
      localStorage.setItem('leg_usuario', JSON.stringify(data.usuario))
      localStorage.setItem('leg_token_exp', String(Date.now() + data.expiresIn * 1000))
      if (data.usuario.precisaTrocar) router.replace('/trocar-senha')
      else router.replace('/dashboard')
    } catch { setErro('Erro de conexão. Verifique sua internet.') }
    finally { setLoading(false) }
  }

  if (checkingAuth) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117'}}>
      <div style={{width:32,height:32,border:'3px solid #2d7dd2',borderTop:'3px solid transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0d14 0%,#0f1117 50%,#0d1220 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,#1a3a6e 0%,#2d7dd2 100%)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 8px 32px rgba(45,125,210,0.35)'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M3 21H21M3 7L12 2L21 7M4 7V21M20 7V21M8 21V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{fontSize:24,fontWeight:700,color:'#e8eaf0',margin:'0 0 6px'}}>Sistema Legislativo Municipal</h1>
          <p style={{fontSize:14,color:'#5c6282',margin:0}}>Acesso restrito a usuários autorizados</p>
        </div>

        <div style={{background:'#13161f',borderRadius:16,border:'1px solid #1e2333',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',padding:'36px 32px'}}>
          <h2 style={{fontSize:18,fontWeight:600,color:'#e8eaf0',marginTop:0,marginBottom:6}}>Entrar no sistema</h2>
          <p style={{fontSize:13,color:'#5c6282',marginTop:0,marginBottom:28}}>Utilize suas credenciais institucionais</p>

          {erro && (
            <div style={{background:'#1f0a0a',border:'1px solid rgba(217,64,64,0.4)',borderLeft:'3px solid #d94040',borderRadius:8,padding:'12px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#d94040" strokeWidth="1.5"/>
                <path d="M12 8v5M12 16h.01" stroke="#d94040" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{fontSize:13,color:'#e07070'}}>{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>
                E-mail institucional
              </label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="seu@email.gov.br" autoComplete="username email" required
                style={{width:'100%',boxSizing:'border-box' as const,background:'#0f1117',border:'1px solid #2a3048',borderRadius:8,padding:'11px 14px',fontSize:14,color:'#e8eaf0',outline:'none'}}
              />
            </div>

            <div style={{marginBottom:24}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:600,color:'#9198b0',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Senha</label>
                <a href="/recuperar-senha" style={{fontSize:12,color:'#2d7dd2',textDecoration:'none'}}>Esqueci minha senha</a>
              </div>
              <div style={{position:'relative' as const}}>
                <input type={mostrarSenha?'text':'password'} value={senha} onChange={e=>setSenha(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={{width:'100%',boxSizing:'border-box' as const,background:'#0f1117',border:'1px solid #2a3048',borderRadius:8,padding:'11px 44px 11px 14px',fontSize:14,color:'#e8eaf0',outline:'none'}}
                />
                <button type="button" onClick={()=>setMostrarSenha(!mostrarSenha)}
                  style={{position:'absolute' as const,right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#5c6282',padding:2}}>
                  {mostrarSenha
                    ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'12px 16px',background:loading?'#1a3a6e':'linear-gradient(135deg,#1a3a6e,#2d7dd2)',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:loading?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 16px rgba(45,125,210,0.3)'}}>
              {loading
                ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Entrando...</>
                : <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Entrar no Sistema
                  </>
              }
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',marginTop:24}}>
          <p style={{fontSize:12,color:'#3a3f5a',margin:0}}>Sistema Legislativo Municipal © {new Date().getFullYear()}</p>
          <p style={{fontSize:11,color:'#2a2f45',margin:'4px 0 0'}}>Acesso monitorado e registrado conforme LGPD</p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:#3a3f5a}`}</style>
    </div>
  )
}
