'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Paperclip, User } from 'lucide-react'
import type { TramitacaoEvento } from '@/lib/api'

const tipoConfig: Record<string, { label: string; cor: string; icone: string }> = {
  PROTOCOLO:        { label: 'Protocolo',        cor: '#7ab8f5', icone: '📥' },
  DISTRIBUICAO:     { label: 'Distribuição',     cor: '#8fb8e8', icone: '📋' },
  DESPACHO:         { label: 'Despacho',         cor: '#e8a020', icone: '📝' },
  PARECER_JURIDICO: { label: 'Parecer Jurídico', cor: '#9178e0', icone: '⚖️' },
  PARECER_COMISSAO: { label: 'Parecer Comissão', cor: '#1fa870', icone: '📊' },
  ENCAMINHAMENTO:   { label: 'Encaminhamento',   cor: '#60b8a0', icone: '➡️' },
  INCLUSAO_PAUTA:   { label: 'Inclusão em Pauta',cor: '#e8a020', icone: '📅' },
  VOTACAO:          { label: 'Votação',           cor: '#f5a623', icone: '🗳️' },
  APROVACAO:        { label: 'Aprovação',         cor: '#1fa870', icone: '✅' },
  REJEICAO:         { label: 'Rejeição',          cor: '#d94040', icone: '❌' },
  DEVOLUCAO:        { label: 'Devolução',         cor: '#d94040', icone: '↩️' },
  SUSPENSAO:        { label: 'Suspensão',         cor: '#e8a020', icone: '⏸️' },
  REATIVACAO:       { label: 'Reativação',        cor: '#1fa870', icone: '▶️' },
  REDACAO_FINAL:    { label: 'Redação Final',     cor: '#2d7dd2', icone: '✍️' },
  ASSINATURA:       { label: 'Assinatura',        cor: '#7c5cbf', icone: '🖊️' },
  PUBLICACAO:       { label: 'Publicação',        cor: '#1fa870', icone: '📰' },
  ARQUIVAMENTO:     { label: 'Arquivamento',      cor: '#5c6282', icone: '🗂️' },
  REABERTURA:       { label: 'Reabertura',        cor: '#2d7dd2', icone: '🔓' },
  SESSAO_LEITURA:   { label: 'Leitura em Sessão', cor: '#60b8a0', icone: '📢' },
  RETIFICACAO:      { label: 'Retificação',       cor: '#e8a020', icone: '✏️' },
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface CardEventoProps {
  evento: TramitacaoEvento
  lado: 'esquerda' | 'direita'
  atual: boolean
  expandido: boolean
  onToggle: () => void
}

function CardEvento({ evento, lado, atual, expandido, onToggle }: CardEventoProps) {
  const cfg = tipoConfig[evento.tipo] ?? { label: evento.tipo, cor: '#5c6282', icone: '●' }

  return (
    <div
      className={`rounded-lg border cursor-pointer transition-all select-none ${
        atual
          ? 'border-[#e8a020] bg-[#2e1f06]'
          : expandido
          ? 'border-[#2d7dd2] bg-[#0d1e35]'
          : 'border-[#1e2333] bg-[#13161f] hover:bg-[#1c202e] hover:border-[#2a3048]'
      } ${lado === 'esquerda' ? 'mr-4' : 'ml-4'}`}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2.5">
        {/* Tipo */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: cfg.cor }}
          >
            {cfg.label}
          </span>
          {expandido ? (
            <ChevronUp size={12} className="text-[#5c6282]" />
          ) : (
            <ChevronDown size={12} className="text-[#5c6282]" />
          )}
        </div>

        {/* Descrição */}
        <p className={`text-[12px] leading-snug ${expandido ? 'text-[#e8eaf0]' : 'text-[#9198b0] line-clamp-2'}`}>
          {evento.descricao}
        </p>

        {/* Usuário e data */}
        <div className="flex items-center gap-2 mt-2">
          {evento.usuario && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                style={{ background: '#1a1030', color: '#9178e0', border: '1px solid #2a1f50' }}
              >
                {initials(evento.usuario.nome)}
              </div>
              <span className="text-[10px] text-[#5c6282] truncate max-w-[100px]">
                {evento.usuario.nome.split(' ')[0]}
                {evento.orgaoOrigem ? ` · ${evento.orgaoOrigem.sigla}` : ''}
              </span>
            </div>
          )}
          <span className="text-[10px] font-mono text-[#5c6282] ml-auto">
            {formatarHora(evento.criadoEm)}
          </span>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 pb-4 pt-0 border-t border-[#1e2333] mt-0">
          <div className="mt-3 space-y-2.5">
            {/* Observação */}
            {evento.observacao && (
              <div>
                <div className="text-[10px] font-semibold text-[#5c6282] uppercase tracking-wide mb-1">
                  Observação
                </div>
                <p className="text-[12px] text-[#9198b0] leading-relaxed italic">
                  "{evento.observacao}"
                </p>
              </div>
            )}

            {/* Transição de status */}
            {evento.statusAntes && evento.statusDepois && evento.statusAntes !== evento.statusDepois && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="bg-[#1c202e] text-[#5c6282] px-2 py-0.5 rounded font-mono">
                  {evento.statusAntes}
                </span>
                <span className="text-[#5c6282]">→</span>
                <span className="bg-[#0d1e35] text-[#2d7dd2] px-2 py-0.5 rounded font-mono">
                  {evento.statusDepois}
                </span>
              </div>
            )}

            {/* Documentos gerados */}
            {evento.documentosGerados && evento.documentosGerados.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-[#5c6282] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Paperclip size={9} /> Documentos
                </div>
                <div className="space-y-1">
                  {evento.documentosGerados.map(({ documento }) => (
                    <div
                      key={documento.id}
                      className="flex items-center gap-2 text-[11px] text-[#9198b0] hover:text-[#2d7dd2] cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-[9px] bg-[#0f1117] border border-[#1e2333] px-1.5 py-0.5 rounded text-[#5c6282]">
                        {documento.tipo.substring(0, 3)}
                      </span>
                      {documento.nome}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dados adicionais relevantes */}
            {evento.dadosAdicionais && Object.keys(evento.dadosAdicionais).length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-[#5c6282] uppercase tracking-wide mb-1.5">
                  Dados
                </div>
                <div className="space-y-1">
                  {Object.entries(evento.dadosAdicionais)
                    .filter(([k]) => !['prazo', 'regrasAplicadas'].includes(k))
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[11px]">
                        <span className="text-[#5c6282] capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-[#9198b0] font-mono">{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Usuário completo */}
            {evento.usuario && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#1e2333]">
                <User size={10} className="text-[#5c6282]" />
                <span className="text-[11px] text-[#5c6282]">
                  {evento.usuario.nome}
                  {evento.usuario.cargo ? ` · ${evento.usuario.cargo}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface TramitacaoTimelineProps {
  eventos: TramitacaoEvento[]
}

type Filtro = 'todos' | 'movimentacoes' | 'pareceres' | 'entrada'

const FILTROS: { id: Filtro; label: string; tipos?: string[] }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'movimentacoes', label: 'Movimentações', tipos: ['DESPACHO', 'ENCAMINHAMENTO', 'DEVOLUCAO', 'SUSPENSAO', 'REATIVACAO'] },
  { id: 'pareceres', label: 'Pareceres', tipos: ['PARECER_JURIDICO', 'PARECER_COMISSAO'] },
  { id: 'entrada', label: 'Entrada', tipos: ['PROTOCOLO', 'DISTRIBUICAO'] },
]

export default function TramitacaoTimeline({ eventos }: TramitacaoTimelineProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const filtroAtivo = FILTROS.find(f => f.id === filtro)!
  const filtrados = filtroAtivo.tipos
    ? eventos.filter(e => filtroAtivo.tipos!.includes(e.tipo))
    : eventos

  const ultimoId = eventos[eventos.length - 1]?.id

  return (
    <div>
      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
              filtro === f.id
                ? 'bg-[#162d4a] border-[#2d7dd2] text-[#2d7dd2]'
                : 'border-[#1e2333] text-[#9198b0] hover:border-[#2a3048]'
            }`}
          >
            {f.label}
            {f.id !== 'todos' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({f.tipos ? eventos.filter(e => f.tipos!.includes(e.tipo)).length : eventos.length})
              </span>
            )}
          </button>
        ))}
        <span className="text-[11px] text-[#5c6282] ml-auto">
          {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-[#5c6282] text-[13px]">
          Nenhum evento neste filtro.
        </div>
      ) : (
        <div className="relative">
          {filtrados.map((evento, idx) => {
            const isEsquerda = idx % 2 === 0
            const isAtual = evento.id === ultimoId
            const isExpanded = expandidos.has(evento.id)
            const cfg = tipoConfig[evento.tipo] ?? { cor: '#5c6282' }

            return (
              <div key={evento.id} className="flex items-start gap-0 mb-2">
                {/* Coluna esquerda */}
                <div className="flex-1 min-w-0">
                  {isEsquerda && (
                    <CardEvento
                      evento={evento}
                      lado="esquerda"
                      atual={isAtual}
                      expandido={isExpanded}
                      onToggle={() => toggle(evento.id)}
                    />
                  )}
                </div>

                {/* Eixo central */}
                <div className="flex flex-col items-center flex-shrink-0 w-24">
                  {/* Data */}
                  <div className="font-mono text-[10px] text-[#5c6282] bg-[#0f1117] border border-[#1e2333] rounded px-2 py-0.5 mb-2 whitespace-nowrap">
                    {formatarData(evento.criadoEm)}
                  </div>

                  {/* Ponto */}
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#0f1117] flex-shrink-0 z-10 transition-all ${
                      isAtual ? 'ring-2 ring-offset-1 ring-offset-[#0f1117]' : ''
                    }`}
                    style={{
                      backgroundColor: cfg.cor,
                      ...(isAtual ? { boxShadow: `0 0 8px ${cfg.cor}80` } : {}),
                    }}
                  />

                  {/* Linha vertical (exceto último) */}
                  {idx < filtrados.length - 1 && (
                    <div className="w-px flex-1 min-h-[40px] mt-1" style={{ background: '#1e2333' }} />
                  )}
                </div>

                {/* Coluna direita */}
                <div className="flex-1 min-w-0">
                  {!isEsquerda && (
                    <CardEvento
                      evento={evento}
                      lado="direita"
                      atual={isAtual}
                      expandido={isExpanded}
                      onToggle={() => toggle(evento.id)}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {/* Fim da timeline */}
          <div className="flex justify-center mt-4">
            <div className="text-[11px] text-[#5c6282] border border-dashed border-[#1e2333] rounded px-3 py-1.5">
              {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''} · Início em {formatarData(filtrados[0]?.criadoEm ?? '')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
