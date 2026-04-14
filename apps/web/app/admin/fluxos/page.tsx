'use client'

import { useState } from 'react'
import { GitBranch, Plus, Upload, Play, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const fluxosMock = [
  {
    id: 'f1', nome: 'Tramitação Básica — PL/PDL', tipoMateria: 'PL, PDL',
    status: 'ATIVO', versao: '1.2', camundaKey: 'tramitacao_proposicao_basica',
    camundaVersion: 3, instanciasAtivas: 12, atualizadoEm: '15/04/2024',
    descricao: 'Fluxo principal para projetos de lei e decretos legislativos'
  },
  {
    id: 'f2', nome: 'Tramitação Urgente', tipoMateria: 'Todos',
    status: 'ATIVO', versao: '1.0', camundaKey: 'tramitacao_urgente',
    camundaVersion: 1, instanciasAtivas: 2, atualizadoEm: '01/03/2024',
    descricao: 'Fluxo simplificado para matérias em regime de urgência'
  },
  {
    id: 'f3', nome: 'Moção / Requerimento', tipoMateria: 'MOC, REQ, IND',
    status: 'ATIVO', versao: '1.1', camundaKey: 'tramitacao_moc_req',
    camundaVersion: 2, instanciasAtivas: 7, atualizadoEm: '10/04/2024',
    descricao: 'Fluxo para moções, requerimentos e indicações'
  },
  {
    id: 'f4', nome: 'Tramitação Básica v2 (Rascunho)', tipoMateria: 'PL',
    status: 'RASCUNHO', versao: '2.0-draft', camundaKey: null,
    camundaVersion: null, instanciasAtivas: 0, atualizadoEm: '20/04/2024',
    descricao: 'Nova versão com sub-processo de emendas'
  },
]

const statusBadge: Record<string, string> = {
  ATIVO: 'bg-[#0a2318] text-[#1fa870]',
  RASCUNHO: 'bg-[#1c202e] text-[#5c6282]',
  DEPRECIADO: 'bg-[#2e1f06] text-[#e8a020]',
  ARQUIVADO: 'bg-[#2e0e0e] text-[#d94040]',
}

export default function FluxosAdminPage() {
  const [selecionado, setSelecionado] = useState(fluxosMock[0])

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Fluxos BPMN</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">Gerenciamento de processos integrados ao Camunda</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] text-[13px] px-3 py-2 rounded-md transition-colors">
            <Upload size={13} />
            Importar BPMN
          </button>
          <button className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
            <Plus size={14} />
            Novo Fluxo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Lista de fluxos */}
        <div className="space-y-2">
          {fluxosMock.map(fluxo => (
            <div
              key={fluxo.id}
              onClick={() => setSelecionado(fluxo)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selecionado.id === fluxo.id
                  ? 'border-[#2d7dd2] bg-[#0d1e35]'
                  : 'border-[#1e2333] bg-[#13161f] hover:bg-[#1c202e]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitBranch size={13} className={selecionado.id === fluxo.id ? 'text-[#2d7dd2]' : 'text-[#5c6282]'} />
                  <span className="text-[13px] font-medium text-[#e8eaf0] leading-snug">{fluxo.nome}</span>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[fluxo.status]}`}>
                  {fluxo.status.toLowerCase()}
                </span>
              </div>
              <div className="text-[11px] text-[#5c6282] mt-2 flex items-center gap-3">
                <span className="font-mono">v{fluxo.versao}</span>
                {fluxo.instanciasAtivas > 0 && (
                  <span className="flex items-center gap-1">
                    <Play size={9} /> {fluxo.instanciasAtivas} ativas
                  </span>
                )}
                <span>{fluxo.tipoMateria}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalhe do fluxo selecionado */}
        <div className="col-span-2 space-y-4">
          {/* Info card */}
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#e8eaf0]">{selecionado.nome}</h2>
                <p className="text-[12px] text-[#5c6282] mt-1">{selecionado.descricao}</p>
              </div>
              <div className="flex gap-2">
                {selecionado.status === 'RASCUNHO' && (
                  <button className="flex items-center gap-1.5 text-[12px] bg-[#1fa870] hover:bg-[#178a5c] text-white px-3 py-1.5 rounded-md transition-colors">
                    <Play size={12} />
                    Deploy no Camunda
                  </button>
                )}
                <button className="flex items-center gap-1.5 text-[12px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-3 py-1.5 rounded-md transition-colors">
                  <Eye size={12} />
                  Visualizar BPMN
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Versão', value: selecionado.versao, mono: true },
                { label: 'Camunda Key', value: selecionado.camundaKey || '—', mono: true },
                { label: 'Instâncias ativas', value: String(selecionado.instanciasAtivas) },
                { label: 'Última atualização', value: selecionado.atualizadoEm },
              ].map(item => (
                <div key={item.label} className="bg-[#0f1117] rounded-md p-3">
                  <div className="text-[10px] text-[#5c6282] mb-1">{item.label}</div>
                  <div className={`text-[12px] text-[#9198b0] ${item.mono ? 'font-mono' : ''}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visualizador BPMN simplificado (diagrama de etapas) */}
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-4">
              Etapas do Fluxo
            </div>
            <div className="overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                {[
                  { id: 'inicio', label: 'Início', tipo: 'event', color: 'border-[#1fa870] text-[#1fa870]' },
                  { id: 'analise', label: 'Análise Inicial', tipo: 'task', color: 'border-[#2d7dd2] text-[#2d7dd2]', perfil: 'PROTOCOLO' },
                  { id: 'gw1', label: 'Conforme?', tipo: 'gateway', color: 'border-[#e8a020] text-[#e8a020]' },
                  { id: 'juridico', label: 'Parecer Jurídico', tipo: 'task', color: 'border-[#7c5cbf] text-[#b09de0]', perfil: 'PROCURADORIA', condicional: true },
                  { id: 'comissao', label: 'Comissão', tipo: 'task', color: 'border-[#2d7dd2] text-[#2d7dd2]', perfil: 'COMISSAO' },
                  { id: 'pauta', label: 'Inclusão Pauta', tipo: 'task', color: 'border-[#2d7dd2] text-[#2d7dd2]', perfil: 'MESA_DIRETORA' },
                  { id: 'votacao', label: 'Votação', tipo: 'task', color: 'border-[#e8a020] text-[#e8a020]', perfil: 'PLENARIO' },
                  { id: 'gw2', label: 'Aprovado?', tipo: 'gateway', color: 'border-[#e8a020] text-[#e8a020]' },
                  { id: 'publicacao', label: 'Publicação', tipo: 'service', color: 'border-[#1fa870] text-[#1fa870]' },
                  { id: 'fim', label: 'Arquivado', tipo: 'event', color: 'border-[#1fa870] text-[#1fa870]' },
                ].map((etapa, i, arr) => (
                  <div key={etapa.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`border rounded-md p-2 text-center transition-all cursor-pointer hover:bg-[#1c202e] ${etapa.color} ${
                        etapa.condicional ? 'border-dashed' : ''
                      } ${etapa.tipo === 'gateway' ? 'rotate-45 w-9 h-9' : 'w-24'}`}>
                        {etapa.tipo !== 'gateway' && (
                          <div className={`text-[10px] font-medium leading-tight`}>{etapa.label}</div>
                        )}
                      </div>
                      {etapa.tipo === 'gateway' && (
                        <div className="text-[9px] text-[#e8a020] mt-1 text-center">{etapa.label}</div>
                      )}
                      {etapa.perfil && (
                        <div className="text-[9px] text-[#5c6282] mt-1 font-mono">{etapa.perfil}</div>
                      )}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-6 h-px bg-[#2a3048] flex-shrink-0 mx-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-[#5c6282]">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border border-[#2d7dd2]" /> Tarefa Humana</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border border-[#1fa870]" /> Tarefa Automática</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border-dashed border-[#7c5cbf]" /> Condicional</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rotate-45 border border-[#e8a020]" /> Gateway</span>
            </div>
          </div>

          {/* Instâncias ativas */}
          {selecionado.instanciasAtivas > 0 && (
            <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">
                Instâncias em Execução ({selecionado.instanciasAtivas})
              </div>
              <div className="space-y-2">
                {['PL-024/2024', 'PL-017/2024', 'PDL-003/2024'].slice(0, Math.min(selecionado.instanciasAtivas, 3)).map(num => (
                  <div key={num} className="flex items-center gap-3 text-[12px] bg-[#0f1117] rounded-md px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-[#1fa870] animate-pulse flex-shrink-0" />
                    <span className="font-mono text-[#2d7dd2]">{num}</span>
                    <span className="text-[#5c6282]">task_comissao</span>
                    <span className="ml-auto text-[#5c6282] flex items-center gap-1"><Clock size={10} /> 12d</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
