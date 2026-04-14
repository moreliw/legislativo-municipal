/**
 * Workers Camunda — processadores de tarefas automáticas
 * Cada worker escuta por tarefas disponíveis e as processa.
 * 
 * Em Camunda 7, usamos polling da API REST (External Tasks).
 * Em Camunda 8, usaria o Zeebe client.
 */

import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { AuditoriaService } from '../../plugins/auditoria'
import { Client as MinioClient } from 'minio'
import { logger } from '../../lib/logger'

const prisma = new PrismaClient()
const notificacaoService = new NotificacaoService()
const auditoriaService = new AuditoriaService()

const camundaBase = process.env.CAMUNDA_URL || 'http://localhost:8085'
const WORKER_ID = `legislativo-worker-${process.pid}`
const LOCK_DURATION = 30000 // 30s

interface ExternalTask {
  id: string
  topicName: string
  processInstanceId: string
  variables: Record<string, { value: unknown; type: string }>
}

// ── WORKER BASE ────────────────────────────────────────────────────
async function fetchAndLock(topic: string, maxTasks = 5): Promise<ExternalTask[]> {
  try {
    const res = await axios.post(`${camundaBase}/engine-rest/external-task/fetchAndLock`, {
      workerId: WORKER_ID,
      maxTasks,
      topics: [{ topicName: topic, lockDuration: LOCK_DURATION }],
    })
    return res.data
  } catch {
    return []
  }
}

async function completeExternalTask(taskId: string, variables: Record<string, unknown> = {}) {
  await axios.post(`${camundaBase}/engine-rest/external-task/${taskId}/complete`, {
    workerId: WORKER_ID,
    variables: Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, { value: v, type: typeof v === 'boolean' ? 'Boolean' : 'String' }]),
    ),
  })
}

async function failExternalTask(taskId: string, errorMessage: string, retries = 2) {
  await axios.post(`${camundaBase}/engine-rest/external-task/${taskId}/failure`, {
    workerId: WORKER_ID,
    errorMessage,
    retries,
    retryTimeout: 60000,
  })
}

// ── WORKER: PUBLICAÇÃO ─────────────────────────────────────────────
async function workerPublicacao() {
  const tasks = await fetchAndLock('publicacao-diario-oficial')

  for (const task of tasks) {
    const proposicaoId = task.variables.proposicaoId?.value as string
    logger.info({ proposicaoId, taskId: task.id }, 'Worker publicação iniciado')

    try {
      const proposicao = await prisma.proposicao.findUnique({
        where: { id: proposicaoId },
        include: { tipoMateria: true, autor: { select: { nome: true } } },
      })

      if (!proposicao) throw new Error('Proposição não encontrada')

      // Registrar publicação
      const publicacao = await prisma.publicacaoOficial.create({
        data: {
          proposicaoId,
          tipo: 'DIARIO_OFICIAL',
          data: new Date(),
          conteudo: gerarTextoPublicacao(proposicao),
          status: 'PUBLICADO',
        },
      })

      // Atualizar status
      await prisma.proposicao.update({
        where: { id: proposicaoId },
        data: { status: 'PUBLICADO' },
      })

      // Notificar autor
      if (proposicao.autorId) {
        await notificacaoService.notificarUsuario(proposicao.autorId, {
          tipo: 'PUBLICACAO',
          titulo: `${proposicao.numero} publicado no Diário Oficial`,
          mensagem: `Sua proposição foi publicada com sucesso.`,
          proposicaoId,
          acao: `/proposicoes/${proposicaoId}`,
        })
      }

      await auditoriaService.registrar({
        entidade: 'Proposicao',
        entidadeId: proposicaoId,
        acao: 'PUBLICAR',
        dadosDepois: { publicacaoId: publicacao.id, data: publicacao.data },
      })

      await completeExternalTask(task.id, { publicacaoId: publicacao.id, publicacaoStatus: 'PUBLICADO' })
      logger.info({ proposicaoId }, 'Worker publicação concluído')

    } catch (err) {
      logger.error({ err, proposicaoId }, 'Worker publicação falhou')
      await failExternalTask(task.id, String(err))
    }
  }
}

// ── WORKER: ARQUIVAMENTO ───────────────────────────────────────────
async function workerArquivamento() {
  const tasks = await fetchAndLock('arquivamento-processo')

  for (const task of tasks) {
    const proposicaoId = task.variables.proposicaoId?.value as string
    logger.info({ proposicaoId, taskId: task.id }, 'Worker arquivamento iniciado')

    try {
      await prisma.proposicao.update({
        where: { id: proposicaoId },
        data: { status: 'ARQUIVADO', arquivadoEm: new Date() },
      })

      await auditoriaService.registrar({
        entidade: 'Proposicao',
        entidadeId: proposicaoId,
        acao: 'ARQUIVAR',
        dadosDepois: { arquivadoEm: new Date() },
      })

      await completeExternalTask(task.id)
      logger.info({ proposicaoId }, 'Worker arquivamento concluído')

    } catch (err) {
      logger.error({ err, proposicaoId }, 'Worker arquivamento falhou')
      await failExternalTask(task.id, String(err))
    }
  }
}

// ── WORKER: NOTIFICAÇÃO AUTOMÁTICA ────────────────────────────────
async function workerNotificacao() {
  const tasks = await fetchAndLock('notificar-responsaveis')

  for (const task of tasks) {
    const proposicaoId = task.variables.proposicaoId?.value as string
    const orgaoDestinoId = task.variables.orgaoDestinoId?.value as string
    const mensagem = task.variables.mensagem?.value as string

    try {
      if (orgaoDestinoId) {
        await notificacaoService.notificarOrgao(orgaoDestinoId, {
          tipo: 'ENCAMINHAMENTO',
          titulo: 'Nova proposição encaminhada',
          mensagem: mensagem || 'Uma proposição foi encaminhada para seu órgão.',
          proposicaoId,
        })
      }

      await completeExternalTask(task.id)
    } catch (err) {
      logger.error({ err }, 'Worker notificação falhou')
      await failExternalTask(task.id, String(err))
    }
  }
}

// ── WORKER: ALERTA DE PRAZO ────────────────────────────────────────
async function workerAlertaPrazo() {
  await notificacaoService.alertarPrazos()
}

// ── HELPER ────────────────────────────────────────────────────────
function gerarTextoPublicacao(proposicao: {
  numero: string
  ementa: string
  tipoMateria: { nome: string }
  autor?: { nome: string } | null
}): string {
  return `
CÂMARA MUNICIPAL
${proposicao.tipoMateria.nome.toUpperCase()} N° ${proposicao.numero}

${proposicao.ementa}

${proposicao.autor ? `Autoria: ${proposicao.autor.nome}` : ''}
Data de publicação: ${new Date().toLocaleDateString('pt-BR')}
`.trim()
}

// ── SCHEDULER ─────────────────────────────────────────────────────
export function iniciarWorkers() {
  logger.info('Iniciando workers Camunda...')

  // Poll a cada 5s
  setInterval(workerPublicacao, 5000)
  setInterval(workerArquivamento, 5000)
  setInterval(workerNotificacao, 5000)

  // Alertas de prazo diariamente às 7h
  setInterval(() => {
    const agora = new Date()
    if (agora.getHours() === 7 && agora.getMinutes() === 0) {
      workerAlertaPrazo()
    }
  }, 60000) // verifica a cada 1 min

  logger.info('Workers iniciados: publicacao, arquivamento, notificacao, alertaPrazo')
}
