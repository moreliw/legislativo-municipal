'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Shield, Mail, ChevronDown } from 'lucide-react'
import { apiFetch, temPermissao, temPerfil } from '@/lib/auth'

interface Perfil {
  id: string
  nome: string
  descricao: string | null
  permissoes: string[]
}

interface UsuarioLista {
  id: string
  nome: string
  email: string
  cargo: string | null
  ativo: boolean
  perfis: Array<{ perfil: Perfil }>
  orgaos: Array<{ orgao: { id: string; nome: string; sigla: string } }>
  credencial: {
    ultimoLoginEm: string | null
    ultimoLoginIp: string | null
    precisaTrocar: boolean
  } | null
}

const perfilStyles: Record<string, string> = {
  ADMINISTRADOR: 'bg-brand-red-soft text-brand-red',
  SECRETARIO_LEGISLATIVO: 'bg-brand-blue-soft text-brand-blue',
  VEREADOR: 'bg-brand-purple-soft text-brand-purple',
  JURIDICO: 'bg-brand-amber-soft text-brand-amber',
  CONSULTA: 'bg-surface-2 text-fg-2',
}

function initials(n: string) {
  return n.split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).map(x => x[0]).join('').toUpperCase()
}

function formatData(value: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleString('pt-BR')
}

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const [novoOpen, setNovoOpen] = useState(false)
  const [editPerfisId, setEditPerfisId] = useState<string | null>(null)
  const [selectedPerfilIds, setSelectedPerfilIds] = useState<string[]>([])

  const [formNovo, setFormNovo] = useState({
    nome: '',
    email: '',
    cargo: '',
    senha: '',
    perfilIds: [] as string[],
  })

  const podeLerUsuarios = temPermissao('usuarios:ler')
  const podeGerenciarUsuarios = temPerfil('ADMINISTRADOR') || temPermissao('*:*')

  async function carregarDados() {
    setLoading(true)
    setErro('')
    try {
      const [usuariosRes, perfisRes] = await Promise.all([
        apiFetch<UsuarioLista[]>('/api/v1/admin/usuarios'),
        apiFetch<Perfil[]>('/api/v1/admin/perfis'),
      ])
      setUsuarios(usuariosRes)
      setPerfis(perfisRes)
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (podeLerUsuarios) carregarDados()
  }, [podeLerUsuarios])

  const filtrados = useMemo(() => {
    return usuarios.filter(u => {
      const q = busca.toLowerCase().trim()
      const matchBusca = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchAtivo = filtroAtivo === null || u.ativo === filtroAtivo
      return matchBusca && matchAtivo
    })
  }, [usuarios, busca, filtroAtivo])

  async function alternarAtivo(usuario: UsuarioLista) {
    if (!podeGerenciarUsuarios) return
    setSalvandoId(usuario.id)
    setErro('')
    setMsg('')
    try {
      await apiFetch(`/api/v1/admin/usuarios/${usuario.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !usuario.ativo }),
      })
      setMsg(`Usuário ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso.`)
      await carregarDados()
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao alterar status')
    } finally {
      setSalvandoId(null)
    }
  }

  function abrirEdicaoPerfis(usuario: UsuarioLista) {
    setEditPerfisId(usuario.id)
    setSelectedPerfilIds(usuario.perfis.map(p => p.perfil.id))
  }

  async function salvarPerfis() {
    if (!editPerfisId || !podeGerenciarUsuarios) return
    setSalvandoId(editPerfisId)
    setErro('')
    setMsg('')
    try {
      await apiFetch(`/api/v1/admin/usuarios/${editPerfisId}/perfis`, {
        method: 'PATCH',
        body: JSON.stringify({ perfilIds: selectedPerfilIds }),
      })
      setMsg('Perfis atualizados com sucesso.')
      setEditPerfisId(null)
      await carregarDados()
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao atualizar perfis')
    } finally {
      setSalvandoId(null)
    }
  }

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault()
    if (!podeGerenciarUsuarios) return
    setErro('')
    setMsg('')
    setSalvandoId('novo')
    try {
      await apiFetch('/api/v1/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          ...formNovo,
          cargo: formNovo.cargo || undefined,
        }),
      })
      setMsg('Usuário criado com sucesso. A troca de senha será exigida no primeiro acesso.')
      setNovoOpen(false)
      setFormNovo({ nome: '', email: '', cargo: '', senha: '', perfilIds: [] })
      await carregarDados()
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao criar usuário')
    } finally {
      setSalvandoId(null)
    }
  }

  if (!podeLerUsuarios) {
    return (
      <div className="p-8">
        <div className="card p-6 text-red-600">Você não possui permissão para visualizar usuários.</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg-1">Usuários</h1>
          <p className="text-sm text-fg-3 mt-1">{filtrados.length} usuário{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        {podeGerenciarUsuarios && (
          <button
            onClick={() => setNovoOpen(true)}
            className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors"
          >
            <Plus size={15} />
            Novo Usuário
          </button>
        )}
      </div>

      {erro && <div className="card p-3 text-sm text-brand-red border-brand-red-soft">{erro}</div>}
      {msg && <div className="card p-3 text-sm text-brand-green border-brand-green-soft">{msg}</div>}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-surface-1 border border-line rounded-md pl-10 pr-4 py-2.5 text-sm text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {[{ label: 'Todos', value: null }, { label: 'Ativos', value: true }, { label: 'Inativos', value: false }].map(f => (
            <button
              key={String(f.value)}
              onClick={() => setFiltroAtivo(f.value)}
              className={`text-sm px-3 py-2 rounded-md border transition-colors ${
                filtroAtivo === f.value ? 'border-brand-blue bg-brand-blue-active text-brand-blue' : 'border-line text-fg-2 hover:border-line-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-1 border border-line rounded-lg overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-line bg-surface-0">
              {['Usuário', 'Cargo / Órgãos', 'Perfis', 'Último acesso', 'Status', 'Ações'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-fg-3">Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-fg-3">Nenhum usuário encontrado.</td></tr>
            ) : filtrados.map(u => (
              <tr key={u.id} className={`hover:bg-surface-2 transition-colors ${!u.ativo ? 'opacity-60' : ''}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-purple-soft border border-brand-purple-soft flex items-center justify-center text-xs font-semibold text-brand-purple flex-shrink-0">
                      {initials(u.nome)}
                    </div>
                    <div>
                      <div className="font-medium text-fg-1">{u.nome}</div>
                      <div className="text-xs text-fg-3 flex items-center gap-1 mt-0.5">
                        <Mail size={11} />
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-sm text-fg-2">{u.cargo || 'Sem cargo'}</div>
                  <div className="text-xs text-fg-3 font-mono mt-0.5">
                    {u.orgaos.map(o => o.orgao.sigla).join(', ') || 'Sem órgão'}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {u.perfis.map((up) => (
                      <span key={up.perfil.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${perfilStyles[up.perfil.nome] ?? 'bg-surface-2 text-fg-2'}`}>
                        {up.perfil.nome.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-fg-3 font-mono">
                  {formatData(u.credencial?.ultimoLoginEm ?? null)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${u.ativo ? 'bg-brand-green' : 'bg-fg-3'}`} />
                    <span className={`text-sm ${u.ativo ? 'text-brand-green' : 'text-fg-3'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {podeGerenciarUsuarios ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => abrirEdicaoPerfis(u)}
                        className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
                      >
                        Perfis <ChevronDown size={11} className="rotate-[-90deg]" />
                      </button>
                      <button
                        onClick={() => alternarAtivo(u)}
                        disabled={salvandoId === u.id}
                        className={`text-xs ${u.ativo ? 'text-brand-red' : 'text-brand-green'} hover:underline disabled:opacity-60`}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-fg-3">Somente leitura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface-1 border border-line rounded-lg p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-fg-3 mb-3 flex items-center gap-1.5">
          <Shield size={12} />
          Perfis de Acesso
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {perfis.map((perfil) => (
            <div key={perfil.id} className="flex items-center justify-between gap-3 p-2 rounded-md border border-line bg-surface-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${perfilStyles[perfil.nome] ?? 'bg-surface-2 text-fg-2'}`}>
                {perfil.nome.replace(/_/g, ' ').toLowerCase()}
              </span>
              <span className="text-xs text-fg-3">{perfil.permissoes.length} permissões</span>
            </div>
          ))}
        </div>
      </div>

      {novoOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <form onSubmit={criarUsuario} className="w-full max-w-xl bg-surface-1 border border-line rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-fg-1">Novo Usuário</h2>
              <button type="button" onClick={() => setNovoOpen(false)} className="text-sm text-fg-3 hover:text-fg-2">Fechar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" placeholder="Nome completo" value={formNovo.nome} onChange={(e) => setFormNovo(s => ({ ...s, nome: e.target.value }))} required />
              <input className="input" type="email" placeholder="E-mail" value={formNovo.email} onChange={(e) => setFormNovo(s => ({ ...s, email: e.target.value }))} required />
              <input className="input" placeholder="Cargo" value={formNovo.cargo} onChange={(e) => setFormNovo(s => ({ ...s, cargo: e.target.value }))} />
              <input className="input" type="password" minLength={8} placeholder="Senha inicial forte" value={formNovo.senha} onChange={(e) => setFormNovo(s => ({ ...s, senha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Perfis</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {perfis.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-fg-2">
                    <input
                      type="checkbox"
                      checked={formNovo.perfilIds.includes(p.id)}
                      onChange={(e) => setFormNovo((s) => ({
                        ...s,
                        perfilIds: e.target.checked
                          ? [...s.perfilIds, p.id]
                          : s.perfilIds.filter((id) => id !== p.id),
                      }))}
                    />
                    {p.nome}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={salvandoId === 'novo' || formNovo.perfilIds.length === 0} className="btn btn-primary w-full disabled:opacity-70">
              {salvandoId === 'novo' ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>
        </div>
      )}

      {editPerfisId && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-1 border border-line rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-fg-1">Editar Perfis</h2>
              <button type="button" onClick={() => setEditPerfisId(null)} className="text-sm text-fg-3 hover:text-fg-2">Fechar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {perfis.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-fg-2">
                  <input
                    type="checkbox"
                    checked={selectedPerfilIds.includes(p.id)}
                    onChange={(e) => {
                      setSelectedPerfilIds((current) => (
                        e.target.checked
                          ? [...current, p.id]
                          : current.filter((id) => id !== p.id)
                      ))
                    }}
                  />
                  {p.nome}
                </label>
              ))}
            </div>
            <button
              onClick={salvarPerfis}
              disabled={selectedPerfilIds.length === 0 || salvandoId === editPerfisId}
              className="btn btn-primary w-full disabled:opacity-70"
            >
              {salvandoId === editPerfisId ? 'Salvando...' : 'Salvar perfis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
