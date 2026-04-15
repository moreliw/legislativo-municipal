'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
      const res = await fetch(`${API_URL}/auth/login`, {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-0">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-blue mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-fg-1">Sistema Legislativo</h1>
          <p className="text-[13px] text-fg-3 mt-1">Câmara Municipal de São Francisco</p>
        </div>

        {/* Card */}
        <div className="bg-surface-1 border border-line rounded-2xl p-8">
          <h2 className="text-[16px] font-semibold text-fg-1 mb-6">Entrar no sistema</h2>

          {/* Keycloak notice */}
          <div className="bg-brand-blue-soft border border-line rounded-lg px-4 py-3 mb-5">
            <p className="text-[12px] text-fg-3">
              Em produção, o acesso é gerenciado pelo{' '}
              <span className="text-brand-blue">Keycloak</span>.
              Você será redirecionado automaticamente.
            </p>
          </div>

          {/* Error */}
          {erro && (
            <div className="flex items-center gap-2 bg-brand-red-soft border border-brand-red/30 rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={14} className="text-brand-red flex-shrink-0" />
              <span className="text-[12px] text-brand-red">{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-fg-2 block mb-1.5">
                E-mail institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@camaramunicipal.gov.br"
                required
                autoComplete="email"
                className="w-full bg-surface-0 border border-line rounded-lg px-4 py-3 text-[14px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-fg-2 block mb-1.5">
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
                  className="w-full bg-surface-0 border border-line rounded-lg px-4 py-3 pr-12 text-[14px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-[12px] text-brand-blue hover:underline">
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={carregando || !email || !senha}
              className="w-full bg-brand-blue hover:bg-brand-blue-2 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-fg-3 mt-6">
          Acesso restrito a servidores e agentes públicos autorizados.
          <br />
          Em caso de problemas, contate a Secretaria Legislativa.
        </p>
      </div>
    </div>
  )
}
