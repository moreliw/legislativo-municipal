'use client'

import { useState } from 'react'
import { Search, Plus, Shield, Mail, ChevronDown } from 'lucide-react'

const usuariosMock = [
  { id: 'u1', nome: 'Carlos Eduardo Lima', email: 'carlos@camara.mg.gov.br', cargo: 'Secretário Legislativo', orgaos: ['SEC'], perfis: ['GESTOR_LEGISLATIVO'], ativo: true, ultimoAcesso: '24/04/2024' },
  { id: 'u2', nome: 'Ana Beatriz Santos', email: 'ana@camara.mg.gov.br', cargo: 'Chefe de Protocolo', orgaos: ['PRO'], perfis: ['PROTOCOLO'], ativo: true, ultimoAcesso: '24/04/2024' },
  { id: 'u3', nome: 'Dra. Fernanda Rocha', email: 'fernanda@camara.mg.gov.br', cargo: 'Procuradora Jurídica', orgaos: ['PJU'], perfis: ['PROCURADORIA'], ativo: true, ultimoAcesso: '23/04/2024' },
  { id: 'u4', nome: 'Ver. Marcos Oliveira', email: 'marcos@camara.mg.gov.br', cargo: 'Vereador', orgaos: ['PLN'], perfis: ['VEREADOR'], ativo: true, ultimoAcesso: '22/04/2024' },
  { id: 'u5', nome: 'Ver. Patricia Alves', email: 'patricia@camara.mg.gov.br', cargo: 'Vereadora / Relatora CMA', orgaos: ['PLN', 'CMA'], perfis: ['VEREADOR', 'COMISSAO'], ativo: true, ultimoAcesso: '24/04/2024' },
  { id: 'u6', nome: 'João Ricardo Pereira', email: 'joao@camara.mg.gov.br', cargo: 'Auxiliar Administrativo', orgaos: ['SEC'], perfis: ['PROTOCOLO'], ativo: false, ultimoAcesso: '01/03/2024' },
]

const perfisConfig: Record<string, string> = {
  ADMINISTRADOR: 'bg-brand-red-soft text-brand-red',
  GESTOR_LEGISLATIVO: 'bg-brand-blue-soft text-brand-blue',
  PROTOCOLO: 'bg-surface-2 text-fg-2',
  VEREADOR: 'bg-brand-purple-soft text-brand-purple',
  PROCURADORIA: 'bg-brand-amber-soft text-brand-amber',
  COMISSAO: 'bg-brand-green-soft text-brand-green',
  CONSULTA_PUBLICA: 'bg-surface-2 text-fg-3',
}

function initials(n: string) {
  return n.split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).map(x => x[0]).join('').toUpperCase()
}

export default function UsuariosAdminPage() {
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(null)

  const filtrados = usuariosMock.filter(u => {
    const matchBusca = !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase())
    const matchAtivo = filtroAtivo === null || u.ativo === filtroAtivo
    return matchBusca && matchAtivo
  })

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg-1">Usuários</h1>
          <p className="text-[13px] text-fg-3 mt-0.5">{filtrados.length} usuário{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
          <Plus size={14} />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-surface-1 border border-line rounded-md pl-9 pr-4 py-2 text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {[{ label: 'Todos', value: null }, { label: 'Ativos', value: true }, { label: 'Inativos', value: false }].map(f => (
            <button
              key={String(f.value)}
              onClick={() => setFiltroAtivo(f.value)}
              className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
                filtroAtivo === f.value ? 'border-brand-blue bg-brand-blue-active text-brand-blue' : 'border-line text-fg-2 hover:border-line-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface-1 border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-0">
              {['Usuário', 'Cargo / Órgão', 'Perfis', 'Último acesso', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-fg-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtrados.map(u => (
              <tr key={u.id} className={`hover:bg-surface-2 transition-colors group ${!u.ativo ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-purple-soft border border-brand-purple-soft flex items-center justify-center text-[11px] font-semibold text-brand-purple flex-shrink-0">
                      {initials(u.nome)}
                    </div>
                    <div>
                      <div className="font-medium text-fg-1">{u.nome}</div>
                      <div className="text-[11px] text-fg-3 flex items-center gap-1 mt-0.5">
                        <Mail size={10} />
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-[12px] text-fg-2">{u.cargo}</div>
                  <div className="text-[10px] text-fg-3 font-mono mt-0.5">{u.orgaos.join(', ')}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {u.perfis.map(p => (
                      <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${perfisConfig[p] ?? 'bg-surface-2 text-fg-2'}`}>
                        {p.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-fg-3 font-mono">{u.ultimoAcesso}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-brand-green' : 'bg-fg-3'}`} />
                    <span className={`text-[12px] ${u.ativo ? 'text-brand-green' : 'text-fg-3'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-brand-blue hover:underline">
                    Editar <ChevronDown size={10} className="rotate-[-90deg]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda de perfis */}
      <div className="bg-surface-1 border border-line rounded-lg p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-3 flex items-center gap-1.5">
          <Shield size={11} />
          Perfis de Acesso
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(perfisConfig).map(([perfil, classes]) => (
            <div key={perfil} className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${classes}`}>
                {perfil.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
