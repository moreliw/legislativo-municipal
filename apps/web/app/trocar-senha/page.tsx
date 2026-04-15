'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, logout } from '@/lib/auth'

export default function TrocarSenhaPage() {
  const router = useRouter()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem'); return }
    setLoading(true); setErro('')
    try {
      await apiFetch('/api/v1/auth/trocar-senha', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      // Forçar novo login com a nova senha
      await logout()
    } catch (err: any) {
      setErro(err.message || 'Erro ao trocar senha')
    } finally { setLoading(false) }
  }

  const inputStyle = {width:'100%',boxSizing:'border-box' as const,background:'#0f1117',border:'1px solid #2a3048',borderRadius:8,padding:'11px 14px',fontSize:14,color:'#e8eaf0',outline:'none'}

  return (
    <div style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{background:'#13161f',border:'1px solid #1e2333',borderRadius:16,padding:'36px 32px',maxWidth:420,width:'100%'}}>
        <div style={{background:'#2e1f06',border:'1px solid rgba(232,160,32,0.3)',borderRadius:10,padding:'12px 16px',marginBottom:24,display:'flex',gap:10,alignItems:'flex-start'}}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#e8a020" strokeWidth="1.5"/><path d="M12 9v4M12 17h.01" stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <div>
            <p style={{color:'#e8a020',fontSize:13,fontWeight:600,margin:'0 0 2px'}}>Troca de senha obrigatória</p>
            <p style={{color:'#9198b0',fontSize:12,margin:0}}>Por segurança, você precisa definir uma nova senha antes de continuar.</p>
          </div>
        </div>

        <h1 style={{fontSize:20,fontWeight:600,color:'#e8eaf0',margin:'0 0 24px'}}>Criar nova senha</h1>

        {erro && <div style={{background:'#1f0a0a',border:'1px solid rgba(217,64,64,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#e07070'}}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const}}>Senha atual</label>
            <input type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} required style={inputStyle}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const}}>Nova senha</label>
            <input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} required style={inputStyle}/>
            <p style={{fontSize:11,color:'#5c6282',margin:'6px 0 0'}}>8+ caracteres, maiúscula, minúscula, número e símbolo</p>
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#9198b0',marginBottom:8,textTransform:'uppercase' as const}}>Confirmar nova senha</label>
            <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} required style={inputStyle}/>
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'11px 16px',background:'linear-gradient(135deg,#1a3a6e,#2d7dd2)',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
            {loading ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
