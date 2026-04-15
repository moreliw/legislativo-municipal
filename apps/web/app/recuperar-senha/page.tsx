'use client'
import { useState } from 'react'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API}/api/v1/auth/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setEnviado(true)
    } finally { setLoading(false) }
  }

  const card = { background:'#13161f', border:'1px solid #1e2333', borderRadius:16, padding:'36px 32px', maxWidth:420, width:'100%' }

  return (
    <div style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={card}>
        <a href="/login" style={{display:'flex',alignItems:'center',gap:8,color:'#5c6282',textDecoration:'none',fontSize:13,marginBottom:24}}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Voltar ao login
        </a>
        <h1 style={{fontSize:20,fontWeight:600,color:'#e8eaf0',margin:'0 0 8px'}}>Recuperar senha</h1>
        <p style={{fontSize:13,color:'#5c6282',margin:'0 0 24px'}}>Digite seu e-mail institucional para receber as instruções.</p>

        {enviado ? (
          <div style={{background:'#0a2318',border:'1px solid rgba(31,168,112,0.3)',borderRadius:10,padding:'16px 18px',textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>✉️</div>
            <p style={{color:'#1fa870',fontSize:14,fontWeight:500,margin:'0 0 4px'}}>Instruções enviadas!</p>
            <p style={{color:'#5c6282',fontSize:13,margin:0}}>Verifique sua caixa de entrada e spam.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>E-mail institucional</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder="seu@email.gov.br"
                style={{width:'100%',boxSizing:'border-box' as const,background:'#0f1117',border:'1px solid #2a3048',borderRadius:8,padding:'11px 14px',fontSize:14,color:'#e8eaf0',outline:'none'}}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'11px 16px',background:'linear-gradient(135deg,#1a3a6e,#2d7dd2)',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
