/**
 * Mock API handler para desenvolvimento e testes
 * Simula respostas da API real para uso sem backend
 * Ativar definindo NEXT_PUBLIC_USE_MOCK_API=true
 */

import type { TramitacaoEvento, Proposicao, PaginatedResponse } from './api'
import { proposicaoMock } from '../mocks/proposicao.mock'

const DELAY = 400 // ms de delay simulado

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Proposições ────────────────────────────────────────────────────

const proposicoesMock: Proposicao[] = [
  {
    id: 'p1', numero: 'PL-024/2024', ano: 2024,
    tipoMateriaId: 'tm1', tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
    ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica',
    origem: 'VEREADOR', regime: 'ORDINARIO', status: 'EM_COMISSAO', prioridade: 'NORMAL',
    palavrasChave: ['energia solar', 'meio ambiente'],
    autor: { nome: 'Ver. Marcos Oliveira', cargo: 'Vereador' },
    orgaoDestino: { nome: 'Comissão de Meio Ambiente', sigla: 'CMA' },
    protocoladoEm: '2024-03-10T09:30:00Z',
    criadoEm: '2024-03-10T09:00:00Z',
    atualizadoEm: '2024-04-18T14:30:00Z',
  },
  {
    id: 'p2', numero: 'REQ-031/2024', ano: 2024,
    tipoMateriaId: 'tm5', tipoMateria: { nome: 'Requerimento', sigla: 'REQ' },
    ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura',
    origem: 'VEREADOR', regime: 'ORDINARIO', status: 'PROTOCOLADO', prioridade: 'NORMAL',
    palavrasChave: ['contratos', 'fiscalização'],
    autor: { nome: 'Ver. Sandra Costa', cargo: 'Vereadora' },
    criadoEm: '2024-04-22T09:00:00Z',
    atualizadoEm: '2024-04-22T09:00:00Z',
  },
  {
    id: 'p4', numero: 'PL-019/2024', ano: 2024,
    tipoMateriaId: 'tm1', tipoMateria: { nome: 'Projeto de Lei', sigla: 'PL' },
    ementa: 'Programa de combate ao desperdício de alimentos nos estabelecimentos municipais',
    origem: 'VEREADOR', regime: 'ORDINARIO', status: 'PUBLICADO', prioridade: 'NORMAL',
    palavrasChave: ['alimentação', 'sustentabilidade'],
    autor: { nome: 'Ver. Ana Lima', cargo: 'Vereadora' },
    protocoladoEm: '2024-02-15T10:00:00Z',
    criadoEm: '2024-02-15T10:00:00Z',
    atualizadoEm: '2024-04-15T11:30:00Z',
  },
]

// ── Mock API Client ────────────────────────────────────────────────

export const mockApi = {
  proposicoes: {
    listar: async (params?: Record<string, string | number>): Promise<PaginatedResponse<Proposicao>> => {
      await delay(DELAY)
      let items = [...proposicoesMock]

      if (params?.busca && typeof params.busca === 'string') {
        const busca = params.busca.toLowerCase()
        items = items.filter(p =>
          p.numero.toLowerCase().includes(busca) ||
          p.ementa.toLowerCase().includes(busca),
        )
      }
      if (params?.status) {
        items = items.filter(p => p.status === params.status)
      }

      return {
        data: items,
        meta: { total: items.length, page: 1, pageSize: 20, totalPages: 1 },
      }
    },

    buscarPorId: async (id: string): Promise<Proposicao & Record<string, unknown>> => {
      await delay(DELAY)
      const encontrada = proposicoesMock.find(p => p.id === id)
      if (!encontrada) throw new Error('Proposição não encontrada')
      return {
        ...encontrada,
        documentos: proposicaoMock.documentos,
        tramitacoes: proposicaoMock.tramitacoes,
        proximasEtapas: proposicaoMock.proximasEtapas,
      } as any
    },

    historico: async (id: string): Promise<TramitacaoEvento[]> => {
      await delay(DELAY)
      return proposicaoMock.tramitacoes as unknown as TramitacaoEvento[]
    },

    protocolar: async (id: string) => {
      await delay(DELAY)
      return { id: 'ev-mock', tipo: 'PROTOCOLO', sequencia: 1, descricao: 'Protocolado via mock' }
    },

    encaminhar: async (id: string, orgaoDestinoId: string, observacao: string) => {
      await delay(DELAY)
      return { id: 'ev-mock-2', tipo: 'ENCAMINHAMENTO', sequencia: 2 }
    },

    devolver: async (id: string, motivo: string) => {
      await delay(DELAY)
      return { id: 'ev-mock-3', tipo: 'DEVOLUCAO', sequencia: 3 }
    },

    arquivar: async (id: string, motivo: string) => {
      await delay(DELAY)
      return { id: 'ev-mock-4', tipo: 'ARQUIVAMENTO', sequencia: 4 }
    },
  },

  sessoes: {
    listar: async () => {
      await delay(DELAY)
      return [
        {
          id: 's1', numero: '012/2024', tipo: 'ORDINARIA',
          data: '2024-04-25T19:00:00Z', horaInicio: '19h00',
          local: 'Plenário Vereador José Santos', status: 'AGENDADA',
          quorumMinimo: 6, presentes: null,
          _count: { pauta: 5, presencas: 0, votos: 0 },
        },
      ]
    },
  },

  notificacoes: {
    listar: async () => {
      await delay(DELAY / 2)
      return {
        data: [
          { id: 'n1', tipo: 'ASSINATURA_PENDENTE', titulo: 'Assinatura pendente — PL-024/2024', mensagem: 'Aguarda sua assinatura.', lida: false, criadoEm: new Date().toISOString() },
          { id: 'n2', tipo: 'PRAZO_VENCENDO', titulo: 'Prazo vencendo amanhã', mensagem: 'PDL-003/2024 vence em 1 dia.', lida: false, criadoEm: new Date().toISOString() },
        ],
        meta: { total: 2, page: 1, pageSize: 20, naoLidas: 2 },
      }
    },
  },

  admin: {
    tiposMateria: async () => {
      await delay(DELAY / 2)
      return [
        { id: 'tm1', sigla: 'PL', nome: 'Projeto de Lei', prefixoNumero: 'PL' },
        { id: 'tm2', sigla: 'PDL', nome: 'Projeto de Decreto Legislativo', prefixoNumero: 'PDL' },
        { id: 'tm3', sigla: 'MOC', nome: 'Moção', prefixoNumero: 'MOC' },
        { id: 'tm4', sigla: 'REQ', nome: 'Requerimento', prefixoNumero: 'REQ' },
        { id: 'tm5', sigla: 'IND', nome: 'Indicação', prefixoNumero: 'IND' },
      ]
    },
    orgaos: async () => {
      await delay(DELAY / 2)
      return [
        { id: 'org1', sigla: 'PRO', nome: 'Protocolo Geral', tipo: 'PROTOCOLO' },
        { id: 'org2', sigla: 'SEC', nome: 'Secretaria Legislativa', tipo: 'SECRETARIA' },
        { id: 'org3', sigla: 'PJU', nome: 'Procuradoria Jurídica', tipo: 'PROCURADORIA' },
        { id: 'org4', sigla: 'CMA', nome: 'Comissão de Meio Ambiente', tipo: 'COMISSAO_PERMANENTE' },
        { id: 'org5', sigla: 'CFO', nome: 'Comissão de Finanças', tipo: 'COMISSAO_PERMANENTE' },
        { id: 'org6', sigla: 'PLN', nome: 'Plenário', tipo: 'PLENARIO' },
        { id: 'org7', sigla: 'PRE', nome: 'Presidência', tipo: 'PRESIDENCIA' },
      ]
    },
  },
}

// ── API seletor (mock vs real) ────────────────────────────────────

export function isMockEnabled() {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ||
    process.env.NODE_ENV === 'test'
}
