'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

function RedefinirForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem'); return }
    if (novaSenha.length < 8) { setErro('Mínimo de 8 caracteres'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch(`${API}/api/v1/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.message || data.erros?.join(', ') || 'Erro'); return }
      setSucesso(true)
      setTimeout(() => router.replace('/login'), 3000)
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div style={{color:'#e07070',textAlign:'center',padding:32}}>Token inválido. <a href="/recuperar-senha" style={{color:'#2d7dd2'}}>Solicitar novo link</a></div>
  )

  const inputStyle = {width:'100%',boxSizing:'border-box' as const,background:'#0f1117',border:'1px solid #2a3048',borderRadius:8,padding:'11px 14px',fontSize:14,color:'#e8eaf0',outline:'none'}

  return (
    <div style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{background:'#13161f',border:'1px solid #1e2333',borderRadius:16,padding:'36px 32px',maxWidth:420,width:'100%'}}>
        <h1 style={{fontSize:20,fontWeight:600,color:'#e8eaf0',margin:'0 0 8px'}}>Criar nova senha</h1>
        <p style={{fontSize:13,color:'#5c6282',margin:'0 0 24px'}}>A senha deve ter pelo menos 8 caracteres, maiúscula, minúscula, número e símbolo.</p>

        {sucesso ? (
          <div style={{background:'#0a2318',border:'1px solid rgba(31,168,112,0.3)',borderRadius:10,padding:20,textAlign:'center'}}>
            <p style={{color:'#1fa870',fontWeight:500,margin:'0 0 4px'}}>✅ Senha alterada com sucesso!</p>
            <p style={{color:'#5c6282',fontSize:13,margin:0}}>Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {erro && <div style={{background:'#1f0a0a',border:'1px solid rgba(217,64,64,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#e07070'}}>{erro}</div>}
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const}}>Nova senha</label>
              <input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} required style={inputStyle}/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const}}>Confirmar senha</label>
              <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} required style={inputStyle}/>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'11px 16px',background:'linear-gradient(135deg,#1a3a6e,#2d7dd2)',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return <Suspense><RedefinirForm /></Suspense>
}
