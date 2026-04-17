// lib/auth.ts — Gerenciamento de autenticação no frontend

export interface Usuario {
  id: string
  nome: string
  email: string
  casaId: string
  casaNome: string
  casaSigla: string
  municipio: string
  uf: string
  perfis: string[]
  permissoes: string[]
  precisaTrocar: boolean
  avatar: string | null
}

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')
const TOKEN_KEY    = 'leg_token'
const USUARIO_KEY  = 'leg_usuario'
const EXP_KEY      = 'leg_token_exp'

// ── Getters ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsuario(): Usuario | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USUARIO_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function isLoggedIn(): boolean {
  const token = getToken()
  if (!token) return false
  const exp = localStorage.getItem(EXP_KEY)
  if (!exp) return false
  // Considera expirado 60s antes para renovar com margem
  return Date.now() < parseInt(exp) - 60_000
}

// ── Logout ───────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const token = getToken()
  try {
    await fetch(`${API}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch { /* ignora erros de rede no logout */ }
  clearAuth()
  window.location.href = '/login'
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USUARIO_KEY)
  localStorage.removeItem(EXP_KEY)
}

// ── Refresh automático ────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null

export async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise  // evita múltiplos refreshes simultâneos

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) { clearAuth(); return false }
      const data = await res.json()
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(EXP_KEY, String(Date.now() + data.expiresIn * 1000))
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ── Fetch autenticado ─────────────────────────────────────────────────

// Controle de loop de autenticação: se token inválido repete, parar
let authFailCount = 0
let authFailResetTimer: ReturnType<typeof setTimeout> | null = null

function recordAuthFail() {
  authFailCount++
  if (authFailResetTimer) clearTimeout(authFailResetTimer)
  authFailResetTimer = setTimeout(() => { authFailCount = 0 }, 5000)
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  let token = getToken()

  // Se token está próximo do vencimento, renovar antes
  const exp = localStorage.getItem(EXP_KEY)
  if (!isRetry && exp && Date.now() > parseInt(exp) - 60_000) {
    const ok = await refreshToken()
    if (!ok) {
      clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Sessão expirada')
    }
    token = getToken()
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    recordAuthFail()

    // Se já fez retry ou muitas falhas consecutivas, desistir (prevenir loop)
    if (isRetry || authFailCount > 3) {
      clearAuth()
      if (typeof window !== 'undefined') {
        console.error('[auth] Loop detectado, redirecionando para login')
        window.location.href = '/login'
      }
      throw new Error('Sessão inválida')
    }

    // Tentar renovar UMA vez
    const ok = await refreshToken()
    if (!ok) {
      clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Sessão expirada')
    }

    // Retry com flag isRetry=true (não renova de novo se falhar)
    return apiFetch<T>(path, options, true)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// ── Verificação de permissão ──────────────────────────────────────────

export function temPermissao(permissao: string): boolean {
  const usuario = getUsuario()
  if (!usuario) return false
  if (usuario.permissoes.includes('*:*')) return true
  const [modulo, acao] = permissao.split(':')
  return usuario.permissoes.some(p => {
    const [pm, pa] = p.split(':')
    return (pm === '*' || pm === modulo) && (pa === '*' || pa === acao)
  })
}

export function temPerfil(perfil: string): boolean {
  const usuario = getUsuario()
  if (!usuario) return false
  return usuario.perfis.includes(perfil)
}
