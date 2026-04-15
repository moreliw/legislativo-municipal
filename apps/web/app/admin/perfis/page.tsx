'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Search } from 'lucide-react'
import { apiFetch, temPermissao } from '@/lib/auth'

interface Perfil {
  id: string
  nome: string
  descricao: string | null
  permissoes: string[]
}

export default function PerfisPage() {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const podeLer = temPermissao('usuarios:ler')

  useEffect(() => {
    if (!podeLer) return
    setLoading(true)
    apiFetch<Perfil[]>('/api/v1/admin/perfis')
      .then(setPerfis)
      .catch((e: any) => setErro(e?.message ?? 'Erro ao carregar perfis'))
      .finally(() => setLoading(false))
  }, [podeLer])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return perfis
    return perfis.filter((p) =>
      p.nome.toLowerCase().includes(q) ||
      (p.descricao ?? '').toLowerCase().includes(q) ||
      p.permissoes.some((perm) => perm.toLowerCase().includes(q)),
    )
  }, [perfis, busca])

  if (!podeLer) {
    return (
      <div className="p-8">
        <div className="card p-6 text-red-600">Você não possui permissão para visualizar perfis.</div>
      </div>
    )
  }

  return (
    <div className="page space-y-5">
      <div className="page-header">
        <h1 className="page-title">Perfis e Permissões</h1>
        <p className="page-subtitle">Controle de acesso baseado em papéis (RBAC)</p>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Buscar perfil ou permissão..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro && <div className="card p-3 text-sm text-brand-red border-brand-red-soft">{erro}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="card p-5 text-fg-3">Carregando perfis...</div>
        ) : filtrados.length === 0 ? (
          <div className="card p-5 text-fg-3">Nenhum perfil encontrado.</div>
        ) : filtrados.map((perfil) => (
          <div key={perfil.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-base font-semibold text-fg-1">{perfil.nome}</div>
                <div className="text-sm text-fg-3">{perfil.descricao || 'Sem descrição'}</div>
              </div>
              <div className="badge badge-blue">
                <ShieldCheck size={12} />
                {perfil.permissoes.length}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {perfil.permissoes.map((perm) => (
                <code key={perm} className="text-xs px-2 py-1 rounded-md bg-surface-2 border border-line text-fg-2">
                  {perm}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
