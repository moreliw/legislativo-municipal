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
  ADMINISTRADOR: 'bg-[#2e0e0e] text-[#d94040]',
  GESTOR_LEGISLATIVO: 'bg-[#0d1e35] text-[#2d7dd2]',
  PROTOCOLO: 'bg-[#1c202e] text-[#9198b0]',
  VEREADOR: 'bg-[#1a1030] text-[#b09de0]',
  PROCURADORIA: 'bg-[#2e1f06] text-[#e8a020]',
  COMISSAO: 'bg-[#0a2318] text-[#1fa870]',
  CONSULTA_PUBLICA: 'bg-[#1c202e] text-[#5c6282]',
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
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Usuários</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">{filtrados.length} usuário{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
          <Plus size={14} />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c6282]" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#13161f] border border-[#1e2333] rounded-md pl-9 pr-4 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {[{ label: 'Todos', value: null }, { label: 'Ativos', value: true }, { label: 'Inativos', value: false }].map(f => (
            <button
              key={String(f.value)}
              onClick={() => setFiltroAtivo(f.value)}
              className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
                filtroAtivo === f.value ? 'border-[#2d7dd2] bg-[#162d4a] text-[#2d7dd2]' : 'border-[#1e2333] text-[#9198b0] hover:border-[#2a3048]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#1e2333] bg-[#0f1117]">
              {['Usuário', 'Cargo / Órgão', 'Perfis', 'Último acesso', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#5c6282] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2333]">
            {filtrados.map(u => (
              <tr key={u.id} className={`hover:bg-[#1c202e] transition-colors group ${!u.ativo ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1030] border border-[#2a1f50] flex items-center justify-center text-[11px] font-semibold text-[#9178e0] flex-shrink-0">
                      {initials(u.nome)}
                    </div>
                    <div>
                      <div className="font-medium text-[#e8eaf0]">{u.nome}</div>
                      <div className="text-[11px] text-[#5c6282] flex items-center gap-1 mt-0.5">
                        <Mail size={10} />
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-[12px] text-[#9198b0]">{u.cargo}</div>
                  <div className="text-[10px] text-[#5c6282] font-mono mt-0.5">{u.orgaos.join(', ')}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {u.perfis.map(p => (
                      <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${perfisConfig[p] ?? 'bg-[#1c202e] text-[#9198b0]'}`}>
                        {p.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-[#5c6282] font-mono">{u.ultimoAcesso}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-[#1fa870]' : 'bg-[#5c6282]'}`} />
                    <span className={`text-[12px] ${u.ativo ? 'text-[#1fa870]' : 'text-[#5c6282]'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-[#2d7dd2] hover:underline">
                    Editar <ChevronDown size={10} className="rotate-[-90deg]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda de perfis */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3 flex items-center gap-1.5">
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
