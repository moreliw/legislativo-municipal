'use client'

import { useState } from 'react'
import { Shield, Download, Search, Eye, Filter } from 'lucide-react'

interface LogAuditoria {
  id: string
  entidade: string
  entidadeId: string
  acao: string
  usuario: string | null
  email: string | null
  ip: string
  endpoint: string
  criadoEm: string
  dadosAntes?: Record<string, unknown>
  dadosDepois?: Record<string, unknown>
}

const logsMock: LogAuditoria[] = [
  { id: 'l1', entidade: 'Proposicao', entidadeId: 'p1', acao: 'LER', usuario: 'Carlos Eduardo Lima', email: 'carlos@legislativo.gov.br', ip: '192.168.1.10', endpoint: 'GET /proposicoes/p1', criadoEm: '2024-04-24T15:32:10Z' },
  { id: 'l2', entidade: 'TramitacaoEvento', entidadeId: 'ev6', acao: 'CRIAR', usuario: 'Ver. Patricia Alves', email: 'patricia@legislativo.gov.br', ip: '192.168.1.15', endpoint: 'POST /tramitacao/prop_001/evento', criadoEm: '2024-04-18T14:30:00Z', dadosDepois: { tipo: 'PARECER_COMISSAO', proposicaoId: 'p1' } },
  { id: 'l3', entidade: 'Proposicao', entidadeId: 'p1', acao: 'ATUALIZAR', usuario: 'Carlos Eduardo Lima', email: 'carlos@legislativo.gov.br', ip: '192.168.1.10', endpoint: 'POST /proposicoes/p1/encaminhar', criadoEm: '2024-03-27T09:00:00Z', dadosAntes: { status: 'EM_ANALISE' }, dadosDepois: { status: 'EM_COMISSAO' } },
  { id: 'l4', entidade: 'Documento', entidadeId: 'd3', acao: 'ASSINAR', usuario: 'Dra. Fernanda Rocha', email: 'fernanda@legislativo.gov.br', ip: '10.0.0.5', endpoint: 'POST /documentos/d3/assinar', criadoEm: '2024-03-25T16:40:00Z', dadosDepois: { tipo: 'APROVADOR' } },
  { id: 'l5', entidade: 'Proposicao', entidadeId: 'p1', acao: 'CRIAR', usuario: 'Carlos Eduardo Lima', email: 'carlos@legislativo.gov.br', ip: '192.168.1.10', endpoint: 'POST /proposicoes', criadoEm: '2024-03-10T09:30:00Z', dadosDepois: { numero: 'PL-024/2024', status: 'PROTOCOLADO' } },
  { id: 'l6', entidade: 'Usuario', entidadeId: 'u1', acao: 'LOGIN', usuario: 'Ana Beatriz Santos', email: 'ana@legislativo.gov.br', ip: '172.16.0.3', endpoint: 'POST /auth/login', criadoEm: '2024-04-24T08:02:00Z' },
  { id: 'l7', entidade: 'Proposicao', entidadeId: 'p4', acao: 'PUBLICAR', usuario: 'Carlos Eduardo Lima', email: 'carlos@legislativo.gov.br', ip: '192.168.1.10', endpoint: 'POST /publicacao/p4', criadoEm: '2024-04-15T11:30:00Z', dadosDepois: { tipo: 'DIARIO_OFICIAL' } },
  { id: 'l8', entidade: 'AuditoriaLog', entidadeId: 'export1', acao: 'EXPORTAR', usuario: 'Carlos Eduardo Lima', email: 'carlos@legislativo.gov.br', ip: '192.168.1.10', endpoint: 'GET /auditoria/exportar', criadoEm: '2024-04-20T17:00:00Z' },
]

const acaoConfig: Record<string, { label: string; cor: string }> = {
  CRIAR:    { label: 'Criar',    cor: 'text-[#1fa870]' },
  LER:      { label: 'Ler',     cor: 'text-[#9198b0]' },
  ATUALIZAR:{ label: 'Atualizar', cor: 'text-[#2d7dd2]' },
  EXCLUIR:  { label: 'Excluir',  cor: 'text-[#d94040]' },
  LOGIN:    { label: 'Login',    cor: 'text-[#2d7dd2]' },
  LOGOUT:   { label: 'Logout',   cor: 'text-[#5c6282]' },
  EXPORTAR: { label: 'Exportar', cor: 'text-[#e8a020]' },
  ASSINAR:  { label: 'Assinar',  cor: 'text-[#7c5cbf]' },
  PUBLICAR: { label: 'Publicar', cor: 'text-[#1fa870]' },
  ARQUIVAR: { label: 'Arquivar', cor: 'text-[#5c6282]' },
}

export default function AuditoriaPage() {
  const [busca, setBusca] = useState('')
  const [acaoFiltro, setAcaoFiltro] = useState('')
  const [entidadeFiltro, setEntidadeFiltro] = useState('')
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const filtrados = logsMock.filter(l => {
    const matchBusca = !busca ||
      l.entidade.toLowerCase().includes(busca.toLowerCase()) ||
      l.entidadeId.toLowerCase().includes(busca.toLowerCase()) ||
      l.usuario?.toLowerCase().includes(busca.toLowerCase()) ||
      l.endpoint.toLowerCase().includes(busca.toLowerCase())
    const matchAcao = !acaoFiltro || l.acao === acaoFiltro
    const matchEntidade = !entidadeFiltro || l.entidade === entidadeFiltro
    return matchBusca && matchAcao && matchEntidade
  })

  const entidadesUnicas = [...new Set(logsMock.map(l => l.entidade))]
  const acoesUnicas = [...new Set(logsMock.map(l => l.acao))]

  const logDetalhe = logsMock.find(l => l.id === detalheId)

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Auditoria</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">
            Log imutável de todas as operações do sistema
          </p>
        </div>
        <button className="flex items-center gap-2 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] text-[13px] px-3 py-2 rounded-md transition-colors">
          <Download size={13} />
          Exportar CSV
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total de logs', value: logsMock.length },
          { label: 'Hoje', value: logsMock.filter(l => new Date(l.criadoEm).toDateString() === new Date().toDateString()).length },
          { label: 'Usuários ativos', value: new Set(logsMock.map(l => l.usuario)).size },
          { label: 'Entidades distintas', value: new Set(logsMock.map(l => l.entidade)).size },
        ].map(s => (
          <div key={s.label} className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4">
            <div className="text-[22px] font-bold font-mono text-[#e8eaf0]">{s.value}</div>
            <div className="text-[11px] text-[#5c6282] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c6282]" />
          <input
            type="text"
            placeholder="Buscar por entidade, usuário, endpoint..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#13161f] border border-[#1e2333] rounded-md pl-8 pr-3 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] transition-colors"
          />
        </div>
        <select
          value={acaoFiltro}
          onChange={e => setAcaoFiltro(e.target.value)}
          className="bg-[#13161f] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#9198b0] focus:outline-none"
        >
          <option value="">Todas as ações</option>
          {acoesUnicas.map(a => <option key={a} value={a}>{acaoConfig[a]?.label ?? a}</option>)}
        </select>
        <select
          value={entidadeFiltro}
          onChange={e => setEntidadeFiltro(e.target.value)}
          className="bg-[#13161f] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#9198b0] focus:outline-none"
        >
          <option value="">Todas as entidades</option>
          {entidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabela de logs */}
      <div className="bg-[#13161f] border border-[#1e2333] rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#1e2333] bg-[#0f1117]">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-44">Quando</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-20">Ação</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-36">Entidade</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider">Usuário</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#5c6282] uppercase tracking-wider w-28">IP</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2333]">
            {filtrados.map(log => {
              const ac = acaoConfig[log.acao] ?? { label: log.acao, cor: 'text-[#9198b0]' }
              return (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-[#1c202e] transition-colors cursor-pointer group"
                    onClick={() => setDetalheId(detalheId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 font-mono text-[#5c6282]">
                      {new Date(log.criadoEm).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold text-[11px] ${ac.cor}`}>{ac.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-[#9198b0]">{log.entidade}</div>
                      <div className="text-[#5c6282] font-mono text-[10px] truncate max-w-[120px]">{log.entidadeId}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-[#e8eaf0]">{log.usuario ?? '—'}</div>
                      <div className="text-[#5c6282] text-[10px]">{log.email ?? ''}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[#5c6282]">{log.ip}</td>
                    <td className="px-3 py-3">
                      <Eye size={12} className="text-[#5c6282] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>

                  {/* Detalhe expandido */}
                  {detalheId === log.id && (
                    <tr key={`${log.id}-detalhe`} className="bg-[#0f1117]">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] font-semibold text-[#5c6282] uppercase tracking-wider mb-2">Endpoint</div>
                            <code className="text-[11px] text-[#9198b0] font-mono bg-[#13161f] border border-[#1e2333] rounded px-2 py-1 block">
                              {log.endpoint}
                            </code>
                          </div>
                          {(log.dadosAntes || log.dadosDepois) && (
                            <div className="grid grid-cols-2 gap-2">
                              {log.dadosAntes && (
                                <div>
                                  <div className="text-[10px] font-semibold text-[#d94040] uppercase tracking-wider mb-1">Antes</div>
                                  <pre className="text-[10px] font-mono text-[#9198b0] bg-[#13161f] border border-[#1e2333] rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.dadosAntes, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.dadosDepois && (
                                <div>
                                  <div className="text-[10px] font-semibold text-[#1fa870] uppercase tracking-wider mb-1">Depois</div>
                                  <pre className="text-[10px] font-mono text-[#9198b0] bg-[#13161f] border border-[#1e2333] rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.dadosDepois, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-[#5c6282] text-[13px]">
            Nenhum log encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Aviso LGPD */}
      <div className="bg-[#0d1e35] border border-[#1e2333] rounded-lg px-4 py-3 flex items-start gap-3">
        <Shield size={14} className="text-[#2d7dd2] flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#5c6282]">
          Os logs de auditoria são imutáveis e retidos por 5 anos conforme a política de governança de dados.
          Dados pessoais são tratados em conformidade com a LGPD (Lei 13.709/2018).
        </div>
      </div>
    </div>
  )
}
