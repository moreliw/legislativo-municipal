'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario, apiFetch } from '@/lib/auth'

interface Stats {
  totalCasas: number
  totalUsuarios: number
  totalProposicoes: number
  totalSessoes: number
  casasPorUF: { uf: string; total: number }[]
}

interface Casa {
  id: string
  nome: string
  sigla: string
  municipio: string
  uf: string
  ativo: boolean
  criadoEm: string
  _count: { usuarios: number; proposicoes: number; sessoes: number }
}

export default function SistemaPage() {
  const router = useRouter()
  const usuario = getUsuario()
  const [stats, setStats]   = useState<Stats | null>(null)
  const [casas, setCasas]   = useState<Casa[]>([])
  const [tab, setTab]       = useState<'dashboard'|'casas'|'nova'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [msg, setMsg]         = useState<{type:'ok'|'err', text:string}|null>(null)

  // Verificar acesso
  useEffect(() => {
    if (!usuario) { router.replace('/login'); return }
    if (usuario.casaId !== 'sistema' && !usuario.permissoes.includes('sistema:*')) {
      router.replace('/dashboard')
      return
    }
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([
        apiFetch<Stats>('/api/v1/sistema/stats'),
        apiFetch<Casa[]>('/api/v1/sistema/casas'),
      ])
      setStats(s)
      setCasas(c)
    } catch {}
    finally { setLoading(false) }
  }

  // Form nova câmara
  const [form, setForm] = useState({
    nome: '', sigla: '', cnpj: '', municipio: '', uf: '',
    email: '', telefone: '', totalVereadores: 9,
    adminNome: '', adminEmail: '', adminSenha: '',
  })

  async function criarCamara(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true); setMsg(null)
    try {
      const res = await apiFetch<any>('/api/v1/sistema/casas', {
        method: 'POST',
        body: JSON.stringify({ ...form, totalVereadores: Number(form.totalVereadores) }),
      })
      setMsg({ type: 'ok', text: `✅ ${res.message} — Login: ${res.adminLogin.email}` })
      setForm({ nome:'',sigla:'',cnpj:'',municipio:'',uf:'',email:'',telefone:'',totalVereadores:9,adminNome:'',adminEmail:'',adminSenha:'' })
      await carregarDados()
      setTab('casas')
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Erro ao criar câmara' })
    } finally { setCriando(false) }
  }

  const S = {
    page: { background:'var(--bg-base)', fontFamily:'var(--font-sans)', color:'var(--text)' },
    card: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 },
    inp: { width:'100%', background:'var(--bg-base)', border:'1px solid var(--border-md)', borderRadius:8, padding:'10px 14px', fontSize:14, color:'var(--text)', outline:'none', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const },
    lbl: { display:'block', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase' as const, letterSpacing:'0.08em', marginBottom:6 },
    btn: { padding:'10px 20px', background:'var(--brand)', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)' },
  }

  return (
    <div style={S.page}>
      <div style={{ padding:'28px 32px', maxWidth:1200 }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
          {([['dashboard','Dashboard'],['casas','Câmaras'],['nova','+ Nova Câmara']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:'10px 20px', border:'none', background:'none', cursor:'pointer',
              fontSize:13, fontWeight:tab===k?600:400, fontFamily:'var(--font-sans)',
              color: tab===k ? 'var(--brand)' : 'var(--text-3)',
              borderBottom: tab===k ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom:-1, transition:'all 0.1s',
            }}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:64, color:'var(--text-3)' }}>Carregando...</div>
        ) : (
          <>
            {/* DASHBOARD */}
            {tab === 'dashboard' && stats && (
              <div style={{ animation:'fadeIn 0.3s ease' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
                  {[
                    { label:'Câmaras Ativas',    value: stats.totalCasas,       color:'var(--brand)',  bg:'var(--brand-dim)' },
                    { label:'Usuários Totais',   value: stats.totalUsuarios,    color:'var(--green)',  bg:'var(--green-dim)' },
                    { label:'Proposições',       value: stats.totalProposicoes, color:'var(--amber)',  bg:'var(--amber-dim)' },
                    { label:'Sessões',           value: stats.totalSessoes,     color:'var(--purple)', bg:'var(--purple-dim)' },
                  ].map(s => (
                    <div key={s.label} style={{ ...S.card, background: s.bg }}>
                      <div style={{ fontSize:32, fontWeight:700, color:s.color, fontFamily:'var(--font-mono)' }}>{s.value}</div>
                      <div style={{ fontSize:12, color:'var(--text-3)', marginTop:6 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={S.card}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Câmaras por Estado</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {stats.casasPorUF.map(c => (
                      <div key={c.uf} style={{ padding:'6px 12px', background:'var(--bg-raised)', border:'1px solid var(--border)', borderRadius:8, fontSize:13 }}>
                        <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'var(--font-mono)' }}>{c.uf}</span>
                        <span style={{ color:'var(--text-3)', marginLeft:8 }}>{c.total}</span>
                      </div>
                    ))}
                    {stats.casasPorUF.length === 0 && (
                      <span style={{ color:'var(--text-4)', fontSize:13 }}>Nenhuma câmara cadastrada ainda.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE CÂMARAS */}
            {tab === 'casas' && (
              <div style={{ animation:'fadeIn 0.3s ease' }}>
                <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>Câmaras Municipais ({casas.length})</span>
                    <button onClick={() => setTab('nova')} style={S.btn}>+ Nova Câmara</button>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-base)' }}>
                        {['Câmara','Município / UF','Usuários','Proposições','Status','Ações'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {casas.map(c => (
                        <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'14px 20px' }}>
                            <div style={{ fontWeight:600, fontSize:13 }}>{c.nome}</div>
                            <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--font-mono)' }}>{c.sigla}</div>
                          </td>
                          <td style={{ padding:'14px 20px', fontSize:13, color:'var(--text-2)' }}>{c.municipio} · {c.uf}</td>
                          <td style={{ padding:'14px 20px', fontSize:13, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>{c._count.usuarios}</td>
                          <td style={{ padding:'14px 20px', fontSize:13, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>{c._count.proposicoes}</td>
                          <td style={{ padding:'14px 20px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600,
                              background: c.ativo ? 'var(--green-dim)' : 'var(--red-dim)',
                              color: c.ativo ? 'var(--green)' : 'var(--red)' }}>
                              {c.ativo ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>
                          <td style={{ padding:'14px 20px' }}>
                            <button
                              onClick={async () => {
                                await apiFetch(`/api/v1/sistema/casas/${c.id}`, { method:'PATCH', body: JSON.stringify({ ativo: !c.ativo }) })
                                carregarDados()
                              }}
                              style={{ fontSize:12, color: c.ativo ? 'var(--red)' : 'var(--green)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                              {c.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {casas.length === 0 && (
                        <tr><td colSpan={6} style={{ padding:48, textAlign:'center', color:'var(--text-4)', fontSize:14 }}>
                          Nenhuma câmara cadastrada. <button onClick={()=>setTab('nova')} style={{ color:'var(--brand)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)' }}>Criar primeira câmara →</button>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* NOVA CÂMARA */}
            {tab === 'nova' && (
              <div style={{ animation:'fadeIn 0.3s ease', maxWidth:680 }}>
                <div style={S.card}>
                  <h2 style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>Cadastrar Nova Câmara Municipal</h2>
                  <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:28 }}>
                    O sistema criará automaticamente: 5 perfis, 7 órgãos, 7 tipos de matéria e o usuário administrador inicial.
                  </p>

                  {msg && (
                    <div style={{ padding:'12px 16px', marginBottom:20, borderRadius:8,
                      background: msg.type==='ok' ? 'var(--green-dim)' : 'var(--red-dim)',
                      border: `1px solid ${msg.type==='ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: msg.type==='ok' ? 'var(--green)' : 'var(--red)', fontSize:13 }}>
                      {msg.text}
                    </div>
                  )}

                  <form onSubmit={criarCamara}>
                    <div style={{ marginBottom:20, paddingBottom:20, borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--brand)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                        Dados da Câmara
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={S.lbl}>Nome completo *</label>
                          <input className="input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Câmara Municipal de ..." required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>Sigla *</label>
                          <input className="input" value={form.sigla} onChange={e=>setForm({...form,sigla:e.target.value.toUpperCase()})} placeholder="CMNC" maxLength={10} required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>CNPJ *</label>
                          <input className="input" value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} placeholder="00.000.000/0001-00" required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>Município *</label>
                          <input className="input" value={form.municipio} onChange={e=>setForm({...form,municipio:e.target.value})} required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>UF *</label>
                          <select value={form.uf} onChange={e=>setForm({...form,uf:e.target.value})} required style={{...S.inp,cursor:'pointer'}}>
                            <option value="">Selecione</option>
                            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={S.lbl}>Total de Vereadores</label>
                          <input type="number" min={7} max={55} value={form.totalVereadores} onChange={e=>setForm({...form,totalVereadores:+e.target.value})} style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>E-mail institucional</label>
                          <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="contato@camara.gov.br" style={S.inp}/>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom:24 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                        Administrador Inicial da Câmara
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={S.lbl}>Nome completo *</label>
                          <input value={form.adminNome} onChange={e=>setForm({...form,adminNome:e.target.value})} required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>E-mail *</label>
                          <input type="email" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})} required style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.lbl}>Senha inicial *</label>
                          <input type="password" value={form.adminSenha} onChange={e=>setForm({...form,adminSenha:e.target.value})} placeholder="min. 8 caracteres" required minLength={8} style={S.inp}/>
                        </div>
                      </div>
                      <p style={{ fontSize:11, color:'var(--text-4)', marginTop:8 }}>
                        ⚠️ O administrador será obrigado a trocar a senha no primeiro acesso.
                      </p>
                    </div>

                    <button type="submit" disabled={criando} style={{ ...S.btn, width:'100%', padding:'12px', fontSize:14, opacity: criando ? 0.7 : 1 }}>
                      {criando ? 'Criando câmara...' : '🏛️ Criar Câmara Municipal'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
