'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Users, FileText, CheckCircle, XCircle,
  Clock, Play, Square, ChevronRight, AlertTriangle, BarChart2
} from 'lucide-react'

const sessaoMock = {
  id: 's1',
  numero: '012/2024',
  tipo: 'ORDINARIA',
  data: '25/04/2024',
  horaInicio: '19h00',
  local: 'Plenário Vereador José Santos',
  status: 'AGENDADA',
  quorumMinimo: 6,
  presentes: null as number | null,
  pauta: [
    {
      id: 'ip1', ordem: 1, tipo: 'PRIMEIRA_LEITURA', situacao: 'PENDENTE',
      proposicao: {
        id: 'p3', numero: 'MOC-008/2024', tipo: 'MOC',
        ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária',
        autor: 'Ver. João Ferreira', status: 'EM_PAUTA'
      }
    },
    {
      id: 'ip2', ordem: 2, tipo: 'VOTACAO', situacao: 'PENDENTE',
      proposicao: {
        id: 'p4', numero: 'PL-019/2024', tipo: 'PL',
        ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos nos estabelecimentos municipais',
        autor: 'Ver. Ana Lima', status: 'EM_PAUTA'
      }
    },
    {
      id: 'ip3', ordem: 3, tipo: 'VOTACAO', situacao: 'PENDENTE',
      proposicao: {
        id: 'p5', numero: 'PDL-003/2024', tipo: 'PDL',
        ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes',
        autor: 'Mesa Diretora', status: 'EM_PAUTA'
      }
    },
    {
      id: 'ip4', ordem: 4, tipo: 'DISCUSSAO', situacao: 'PENDENTE',
      proposicao: {
        id: 'p6', numero: 'PL-017/2024', tipo: 'PL',
        ementa: 'Institui o Programa Municipal de Saúde Mental para servidores e dependentes',
        autor: 'Ver. Roberto Alves', status: 'EM_COMISSAO'
      }
    },
    {
      id: 'ip5', ordem: 5, tipo: 'PRIMEIRA_LEITURA', situacao: 'PENDENTE',
      proposicao: {
        id: 'p7', numero: 'IND-014/2024', tipo: 'IND',
        ementa: 'Indica ao executivo a revitalização da praça central do bairro Jardim São Paulo',
        autor: 'Ver. Patricia Alves', status: 'EM_ANALISE'
      }
    },
  ],
  vereadores: [
    { id: 'v1', nome: 'Ver. Marcos Oliveira', partido: 'PSD', presente: false },
    { id: 'v2', nome: 'Ver. Sandra Costa', partido: 'PT', presente: false },
    { id: 'v3', nome: 'Ver. João Ferreira', partido: 'MDB', presente: false },
    { id: 'v4', nome: 'Ver. Ana Lima', partido: 'PP', presente: false },
    { id: 'v5', nome: 'Ver. Roberto Alves', partido: 'PL', presente: false },
    { id: 'v6', nome: 'Ver. Patricia Alves', partido: 'PSDB', presente: false },
    { id: 'v7', nome: 'Ver. Luis Martins', partido: 'PDT', presente: false },
    { id: 'v8', nome: 'Ver. Carla Mendes', partido: 'PSOL', presente: false },
    { id: 'v9', nome: 'Ver. Raimundo Silva', partido: 'Republicanos', presente: false },
    { id: 'v10', nome: 'Ver. Beatriz Souza', partido: 'União', presente: false },
    { id: 'v11', nome: 'Ver. Carlos Neto', partido: 'Avante', presente: false },
  ],
}

const tipoPautaLabel: Record<string, string> = {
  PRIMEIRA_LEITURA: '1ª Leitura',
  SEGUNDA_LEITURA: '2ª Leitura',
  VOTACAO: 'Votação',
  DISCUSSAO: 'Discussão',
  RETIRADA: 'Retirada',
}

const situacaoConfig: Record<string, { text: string; dot: string }> = {
  PENDENTE: { text: 'text-[#5c6282]', dot: '#5c6282' },
  LIDO: { text: 'text-[#2d7dd2]', dot: '#2d7dd2' },
  DISCUTIDO: { text: 'text-[#e8a020]', dot: '#e8a020' },
  VOTADO: { text: 'text-[#1fa870]', dot: '#1fa870' },
  RETIRADO: { text: 'text-[#d94040]', dot: '#d94040' },
}

type VotoTipo = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | null

export default function SessaoDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<'pauta' | 'presenca' | 'votacao' | 'ata'>('pauta')
  const [presencas, setPresencas] = useState<Record<string, boolean>>({})
  const [votacaoAtiva, setVotacaoAtiva] = useState<string | null>(null)
  const [votos, setVotos] = useState<Record<string, VotoTipo>>({})
  const [sessaoAberta, setSessaoAberta] = useState(false)

  const totalPresentes = Object.values(presencas).filter(Boolean).length
  const quorumAtingido = totalPresentes >= sessaoMock.quorumMinimo

  const registrarVoto = (vereadorId: string, voto: VotoTipo) => {
    setVotos(v => ({ ...v, [vereadorId]: voto }))
  }

  const apurarVotacao = () => {
    const sim = Object.values(votos).filter(v => v === 'SIM').length
    const nao = Object.values(votos).filter(v => v === 'NAO').length
    const abstencao = Object.values(votos).filter(v => v === 'ABSTENCAO').length
    return { sim, nao, abstencao, aprovado: sim > nao }
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/sessoes" className="mt-1 text-[#5c6282] hover:text-[#9198b0] transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#e8eaf0]">
              Sessão {sessaoMock.tipo === 'ORDINARIA' ? 'Ordinária' : 'Extraordinária'} {sessaoMock.numero}
            </h1>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
              sessaoAberta ? 'bg-[#0a2318] text-[#1fa870]' : 'bg-[#0d1e35] text-[#2d7dd2]'
            }`}>
              {sessaoAberta ? 'Em andamento' : 'Agendada'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[12px] text-[#5c6282]">
            <span className="font-mono">{sessaoMock.data}</span>
            <span>·</span>
            <span>{sessaoMock.horaInicio}</span>
            <span>·</span>
            <span>{sessaoMock.local}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!sessaoAberta ? (
            <button
              onClick={() => setSessaoAberta(true)}
              className="flex items-center gap-2 bg-[#1fa870] hover:bg-[#178a5c] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
            >
              <Play size={13} />
              Abrir Sessão
            </button>
          ) : (
            <button className="flex items-center gap-2 bg-[#d94040] hover:bg-[#b33030] text-white text-[13px] font-medium px-4 py-2 rounded-md transition-colors">
              <Square size={13} />
              Encerrar Sessão
            </button>
          )}
        </div>
      </div>

      {/* KPIs da sessão */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Itens na pauta', value: sessaoMock.pauta.length, icon: FileText, color: 'text-[#2d7dd2]', bg: 'bg-[#0d1e35]' },
          { label: 'Vereadores', value: sessaoMock.vereadores.length, icon: Users, color: 'text-[#9198b0]', bg: 'bg-[#1c202e]' },
          { label: 'Presentes', value: totalPresentes, icon: CheckCircle, color: quorumAtingido ? 'text-[#1fa870]' : 'text-[#e8a020]', bg: quorumAtingido ? 'bg-[#0a2318]' : 'bg-[#2e1f06]' },
          { label: 'Quórum mínimo', value: sessaoMock.quorumMinimo, icon: AlertTriangle, color: 'text-[#9198b0]', bg: 'bg-[#1c202e]' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border border-[#1e2333] rounded-lg p-4 flex items-center gap-3`}>
            <kpi.icon size={20} className={kpi.color} />
            <div>
              <div className={`text-[22px] font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[11px] text-[#5c6282]">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso de quórum */}
      {sessaoAberta && !quorumAtingido && (
        <div className="bg-[#2e1f06] border border-[#e8a020]/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={15} className="text-[#e8a020] flex-shrink-0" />
          <span className="text-[13px] text-[#e8a020]">
            Quórum insuficiente para votações. Presentes: {totalPresentes} / Mínimo: {sessaoMock.quorumMinimo}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#1e2333]">
        <div className="flex gap-0">
          {[
            { id: 'pauta', label: `Pauta (${sessaoMock.pauta.length})` },
            { id: 'presenca', label: `Presença (${totalPresentes}/${sessaoMock.vereadores.length})` },
            { id: 'votacao', label: 'Votação' },
            { id: 'ata', label: 'Ata' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#2d7dd2] text-[#2d7dd2]'
                  : 'border-transparent text-[#5c6282] hover:text-[#9198b0]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Pauta */}
      {tab === 'pauta' && (
        <div className="space-y-2">
          {sessaoMock.pauta.map((item) => {
            const sc = situacaoConfig[item.situacao] ?? situacaoConfig['PENDENTE']
            return (
              <div key={item.id} className="bg-[#13161f] border border-[#1e2333] rounded-lg flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[#0f1117] border border-[#1e2333] flex items-center justify-center text-[13px] font-bold font-mono text-[#5c6282]">
                  {item.ordem}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[12px] font-semibold text-[#2d7dd2]">{item.proposicao.numero}</span>
                    <span className="text-[10px] bg-[#1c202e] text-[#9198b0] px-2 py-0.5 rounded-full">
                      {tipoPautaLabel[item.tipo]}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#9198b0] leading-snug truncate">{item.proposicao.ementa}</div>
                  <div className="text-[11px] text-[#5c6282] mt-0.5">{item.proposicao.autor}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                    <span className={`text-[11px] ${sc.text}`}>{item.situacao.toLowerCase()}</span>
                  </div>
                  {sessaoAberta && item.tipo === 'VOTACAO' && (
                    <button
                      onClick={() => { setVotacaoAtiva(item.proposicao.id); setTab('votacao') }}
                      className="text-[11px] bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white px-3 py-1.5 rounded-md transition-colors ml-2"
                    >
                      Votar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Presença */}
      {tab === 'presenca' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-[#9198b0]">
              Registre a presença dos vereadores antes de iniciar as votações.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPresencas(Object.fromEntries(sessaoMock.vereadores.map(v => [v.id, true])))}
                className="text-[12px] text-[#1fa870] border border-[#1e2333] px-3 py-1.5 rounded-md hover:border-[#1fa870]/40 transition-colors"
              >
                Marcar todos
              </button>
              <button
                onClick={() => setPresencas({})}
                className="text-[12px] text-[#5c6282] border border-[#1e2333] px-3 py-1.5 rounded-md hover:border-[#2a3048] transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sessaoMock.vereadores.map(v => (
              <button
                key={v.id}
                onClick={() => setPresencas(p => ({ ...p, [v.id]: !p[v.id] }))}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                  presencas[v.id]
                    ? 'border-[#1fa870] bg-[#0a2318]'
                    : 'border-[#1e2333] bg-[#13161f] hover:bg-[#1c202e]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  presencas[v.id] ? 'bg-[#1fa870] text-[#0f1117]' : 'bg-[#1c202e] text-[#5c6282]'
                }`}>
                  {v.nome.split(' ').slice(-1)[0][0]}{v.nome.split(' ').slice(-2,-1)[0]?.[0] ?? ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-medium ${presencas[v.id] ? 'text-[#e8eaf0]' : 'text-[#9198b0]'}`}>
                    {v.nome}
                  </div>
                  <div className="text-[10px] text-[#5c6282]">{v.partido}</div>
                </div>
                {presencas[v.id]
                  ? <CheckCircle size={15} className="text-[#1fa870] flex-shrink-0" />
                  : <XCircle size={15} className="text-[#2a3048] flex-shrink-0" />
                }
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Votação */}
      {tab === 'votacao' && (
        <div className="space-y-4">
          {/* Selecionar proposição para votar */}
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-4">
            <div className="text-[12px] text-[#5c6282] mb-2">Proposição em votação</div>
            <select
              value={votacaoAtiva ?? ''}
              onChange={e => setVotacaoAtiva(e.target.value || null)}
              className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] focus:outline-none focus:border-[#2d7dd2] transition-colors"
            >
              <option value="">Selecionar proposição...</option>
              {sessaoMock.pauta.filter(i => i.tipo === 'VOTACAO').map(item => (
                <option key={item.proposicao.id} value={item.proposicao.id}>
                  {item.proposicao.numero} — {item.proposicao.ementa.slice(0, 60)}...
                </option>
              ))}
            </select>
          </div>

          {votacaoAtiva && (
            <>
              {/* Painel de votos */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">
                  Registro de votos — {sessaoMock.pauta.find(i => i.proposicao.id === votacaoAtiva)?.proposicao.numero}
                </div>
                {sessaoMock.vereadores.map(v => {
                  const votoAtual = votos[v.id]
                  return (
                    <div key={v.id} className="bg-[#13161f] border border-[#1e2333] rounded-lg flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 text-[13px] font-medium text-[#e8eaf0]">{v.nome}</div>
                      <div className="flex gap-1.5">
                        {(['SIM', 'NAO', 'ABSTENCAO', 'AUSENTE'] as VotoTipo[]).map(opcao => (
                          <button
                            key={opcao!}
                            onClick={() => registrarVoto(v.id, opcao)}
                            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-all ${
                              votoAtual === opcao
                                ? opcao === 'SIM' ? 'bg-[#0a2318] border-[#1fa870] text-[#1fa870]'
                                  : opcao === 'NAO' ? 'bg-[#2e0e0e] border-[#d94040] text-[#d94040]'
                                  : opcao === 'ABSTENCAO' ? 'bg-[#2e1f06] border-[#e8a020] text-[#e8a020]'
                                  : 'bg-[#1c202e] border-[#5c6282] text-[#5c6282]'
                                : 'bg-transparent border-[#1e2333] text-[#5c6282] hover:border-[#2a3048]'
                            }`}
                          >
                            {opcao === 'ABSTENCAO' ? 'ABS' : opcao === 'AUSENTE' ? 'AUS' : opcao}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Apuração em tempo real */}
              {Object.keys(votos).length > 0 && (() => {
                const { sim, nao, abstencao, aprovado } = apurarVotacao()
                return (
                  <div className={`border rounded-lg p-5 ${aprovado ? 'bg-[#0a2318] border-[#1fa870]/30' : 'bg-[#2e0e0e] border-[#d94040]/30'}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">
                      Apuração parcial
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-[28px] font-bold font-mono text-[#1fa870]">{sim}</div>
                        <div className="text-[11px] text-[#5c6282]">Sim</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[28px] font-bold font-mono text-[#d94040]">{nao}</div>
                        <div className="text-[11px] text-[#5c6282]">Não</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[28px] font-bold font-mono text-[#e8a020]">{abstencao}</div>
                        <div className="text-[11px] text-[#5c6282]">Abstenção</div>
                      </div>
                      <div className="ml-auto">
                        <div className={`text-[20px] font-bold ${aprovado ? 'text-[#1fa870]' : 'text-[#d94040]'}`}>
                          {aprovado ? '✓ APROVADO' : '✗ REJEITADO'}
                        </div>
                      </div>
                    </div>
                    <button className="mt-4 w-full bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium py-2.5 rounded-md transition-colors">
                      Confirmar e Registrar Votação
                    </button>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* Tab: Ata */}
      {tab === 'ata' && (
        <div className="space-y-4">
          <div className="bg-[#13161f] border border-[#1e2333] rounded-lg p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6282] mb-3">Ata da Sessão</div>
            <textarea
              placeholder="Redija a ata da sessão legislativa..."
              rows={16}
              className="w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-4 py-3 text-[13px] text-[#e8eaf0] font-mono resize-none focus:outline-none focus:border-[#2d7dd2] transition-colors placeholder:text-[#5c6282]"
              defaultValue={`ATA DA ${sessaoMock.tipo} SESSÃO ORDINÁRIA Nº ${sessaoMock.numero} DA CÂMARA MUNICIPAL

Data: ${sessaoMock.data}
Horário de início: ${sessaoMock.horaInicio}
Local: ${sessaoMock.local}

Presentes: ${totalPresentes} vereadores

PAUTA:
${sessaoMock.pauta.map((i, idx) => `${idx + 1}. ${i.proposicao.numero} — ${i.proposicao.ementa.slice(0, 80)}...`).join('\n')}

`}
            />
          </div>
          <div className="flex gap-3">
            <button className="text-[13px] border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] px-4 py-2 rounded-md transition-colors">
              Salvar Rascunho
            </button>
            <button className="text-[13px] bg-[#1fa870] hover:bg-[#178a5c] text-white font-medium px-5 py-2 rounded-md transition-colors">
              Aprovar e Assinar Ata
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
