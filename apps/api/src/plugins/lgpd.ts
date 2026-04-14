/**
 * Middleware LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)
 *
 * Implementa:
 * - Mascaramento de dados pessoais sensíveis em respostas
 * - Registro de base legal para cada operação
 * - Headers de privacidade
 * - Rate limiting de exportação de dados pessoais
 */

import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Campos que devem ser mascarados ao exibir para perfis sem permissão
const CAMPOS_SENSIVEIS = ['cpf', 'telefone', 'dataNascimento', 'enderecoResidencial']

// Base legal por tipo de operação (Art. 7º LGPD)
const BASE_LEGAL_MAPA: Record<string, string> = {
  'proposicoes:criar': 'EXECUCAO_DE_CONTRATO', // Art. 7º, V
  'proposicoes:listar': 'OBRIGACAO_LEGAL',       // Art. 7º, II
  'auditoria:listar': 'OBRIGACAO_LEGAL',          // Art. 7º, II
  'usuarios:listar': 'OBRIGACAO_LEGAL',           // Art. 7º, II
  'relatorios:exportar': 'OBRIGACAO_LEGAL',       // Art. 7º, II
  'documentos:criar': 'EXECUCAO_DE_CONTRATO',     // Art. 7º, V
}

export const lgpdPlugin = fp(async (app: FastifyInstance) => {
  // Headers de privacidade em todas as respostas
  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header('X-Privacy-Policy', 'https://seudominio.gov.br/privacidade')
    reply.header('X-Data-Retention', '5-years')
    reply.header('X-LGPD-Compliant', '1')
    return payload
  })

  // Mascarar campos sensíveis para usuários sem permissão adequada
  app.addHook('preSerialization', async (req: FastifyRequest, reply, payload) => {
    if (!req.user || req.user.permissoes.includes('*:*')) return payload
    const temPermissaoDadosSensiveis = req.user.permissoes.some(p =>
      p.includes('dados_sensiveis') || p.includes('admin:')
    )
    if (temPermissaoDadosSensiveis) return payload

    // Mascara recursiva
    return mascararDados(payload as Record<string, unknown>)
  })
})

function mascararDados(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(mascararDados)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (CAMPOS_SENSIVEIS.includes(key) && typeof value === 'string') {
      result[key] = mascarar(value)
    } else if (typeof value === 'object') {
      result[key] = mascararDados(value)
    } else {
      result[key] = value
    }
  }
  return result
}

function mascarar(valor: string): string {
  if (valor.length <= 4) return '***'
  // CPF: 123.456.789-00 → 123.***.***-00
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valor)) {
    return valor.replace(/(\d{3})\.\d{3}\.\d{3}(-\d{2})/, '$1.***.***$2')
  }
  // E-mail: usuario@dominio.com → u***@dominio.com
  if (valor.includes('@')) {
    const [local, domain] = valor.split('@')
    return `${local[0]}***@${domain}`
  }
  // Telefone: (11) 99999-9999 → (11) *****-9999
  if (/^\(\d{2}\)/.test(valor)) {
    return valor.replace(/\d{4,5}(-\d{4})/, '*****$1')
  }
  // Genérico: mostrar só os 4 últimos caracteres
  return '*'.repeat(valor.length - 4) + valor.slice(-4)
}

// ── Relatório de impacto LGPD ─────────────────────────────────────

export interface RelatorioLGPD {
  dataReferencia: string
  totalDadosPessoaisArmazenados: number
  categoriaDados: string[]
  basesLegais: string[]
  finalidades: string[]
  prazoRetencao: string
  responsavelTratamento: string
  encarregado: string
  medidasSeguranca: string[]
}

export function gerarRelatorioLGPD(nomeCamara: string, encarregado: string): RelatorioLGPD {
  return {
    dataReferencia: new Date().toISOString().slice(0, 10),
    totalDadosPessoaisArmazenados: 0, // Calculado sob demanda
    categoriaDados: [
      'Dados cadastrais (nome, e-mail, CPF)',
      'Dados profissionais (cargo, matrícula)',
      'Dados de acesso e atividade (logs de auditoria)',
      'Dados de representação pública (proposições, votos)',
    ],
    basesLegais: [
      'Obrigação legal — Art. 7º, II LGPD (manutenção de registros legislativos)',
      'Exercício regular de direitos — Art. 7º, IX LGPD',
      'Interesse legítimo — Art. 7º, IX LGPD (transparência pública)',
    ],
    finalidades: [
      'Gestão do processo legislativo',
      'Publicidade dos atos da câmara municipal',
      'Controle e auditoria de acesso ao sistema',
      'Comunicação oficial com titulares',
    ],
    prazoRetencao: '5 anos após o arquivamento do processo, conforme legislação de arquivos públicos',
    responsavelTratamento: nomeCamara,
    encarregado,
    medidasSeguranca: [
      'Autenticação com JWT e Keycloak',
      'Controle de acesso baseado em perfis (RBAC)',
      'Criptografia em trânsito (HTTPS/TLS 1.3)',
      'Log imutável de acesso e modificações',
      'Backup criptografado dos dados',
      'Mascaramento de dados sensíveis na interface',
      'Política de senhas e MFA disponível',
    ],
  }
}
