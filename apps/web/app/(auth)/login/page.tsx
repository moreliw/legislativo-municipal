'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      // Em produção: redirecionar para Keycloak OIDC
      // window.location.href = `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/legislativo/protocol/openid-connect/auth?...`

      // Para desenvolvimento: login direto
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Credenciais inválidas')
      }

      const { token } = await res.json()
      localStorage.setItem('access_token', token)
      window.location.href = '/dashboard'

    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setCarregando(false)
    }
  }

  const inputClass = `w-full bg-[#0d0f16] border rounded-lg px-4 py-3 text-[14px] text-[#e8eaf0]
    placeholder:text-[#5c6282] focus:outline-none transition-colors
    border-[#1e2333] focus:border-[#2d7dd2]`

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0b0d14', fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Logo e nome */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2d7dd2] mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#e8eaf0]">Sistema Legislativo</h1>
          <p className="text-[13px] text-[#5c6282] mt-1">Câmara Municipal de São Francisco</p>
        </div>

        {/* Card de login */}
        <div className="bg-[#13161f] border border-[#1e2333] rounded-2xl p-8">
          <h2 className="text-[16px] font-semibold text-[#e8eaf0] mb-6">Entrar no sistema</h2>

          {/* Aviso Keycloak */}
          <div className="bg-[#0d1e35] border border-[#2d7dd2]/20 rounded-lg px-4 py-3 mb-5">
            <p className="text-[12px] text-[#5c6282]">
              Em produção, o acesso é gerenciado pelo <span className="text-[#2d7dd2]">Keycloak</span>.
              Você será redirecionado automaticamente.
            </p>
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 bg-[#2e0e0e] border border-[#d94040]/30 rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={14} className="text-[#d94040] flex-shrink-0" />
              <span className="text-[12px] text-[#e07070]">{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[12px] font-medium text-[#9198b0] block mb-1.5">
                E-mail institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@camaramunicipal.gov.br"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-[12px] font-medium text-[#9198b0] block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c6282] hover:text-[#9198b0] transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Esqueceu a senha */}
            <div className="flex justify-end">
              <button type="button" className="text-[12px] text-[#2d7dd2] hover:underline">
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={carregando || !email || !senha}
              className="w-full bg-[#2d7dd2] hover:bg-[#1e6fbf] disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-[14px] font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-[11px] text-[#5c6282] mt-6">
          Acesso restrito a servidores e agentes públicos autorizados.
          <br />
          Em caso de problemas, contate a Secretaria Legislativa.
        </p>
      </div>
    </div>
  )
}
