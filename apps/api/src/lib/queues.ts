/**
 * Filas de trabalho com BullMQ
 * Processa tarefas pesadas em background: geração de PDFs, envio de emails,
 * sincronização com Camunda, arquivamento, alertas de prazo.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'
import { logger } from './logger'
import { NotificacaoService } from '../modules/notificacoes/notificacao.service'

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

// ── Definição das filas ───────────────────────────────────────────

export const filaNotificacoes = new Queue('notificacoes', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const filaPDF = new Queue('pdf-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 50,
  },
})

export const filaSincronizacaoCamunda = new Queue('camunda-sync', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 200,
  },
})

export const filaAlertasPrazo = new Queue('alertas-prazo', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 20,
  },
})

// ── Workers ────────────────────────────────────────────────────────

const notificacaoService = new NotificacaoService()

/**
 * Worker: Notificações
 * Processa envio de emails e notificações internas
 */
export const workerNotificacoes = new Worker(
  'notificacoes',
  async (job: Job) => {
    const { tipo, usuarioId, orgaoId, casaId, perfil, dados } = job.data

    logger.info({ jobId: job.id, tipo }, 'Processando notificação')

    if (tipo === 'usuario' && usuarioId) {
      await notificacaoService.notificarUsuario(usuarioId, dados)
    } else if (tipo === 'orgao' && orgaoId) {
      await notificacaoService.notificarOrgao(orgaoId, dados)
    } else if (tipo === 'perfil' && casaId && perfil) {
      await notificacaoService.notificarPorPerfil(casaId, perfil, dados)
    } else if (tipo === 'prazos') {
      await notificacaoService.alertarPrazos()
    }
  },
  {
    connection,
    concurrency: 5,
  },
)

/**
 * Worker: Sincronização Camunda
 * Atualiza status de instâncias e tarefas do Camunda no banco local
 */
export const workerCamundaSync = new Worker(
  'camunda-sync',
  async (job: Job) => {
    const { instanciaId, camundaInstanceId } = job.data
    logger.info({ jobId: job.id, instanciaId }, 'Sincronizando com Camunda')

    // Import dinâmico para evitar circular dependency
    const { camundaService } = await import('../modules/processos/camunda.service')
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    try {
      const instance = await camundaService.getProcessInstance(camundaInstanceId)
      await prisma.instanciaProcesso.update({
        where: { id: instanciaId },
        data: {
          camundaStatus: instance.ended ? 'COMPLETED' : 'ACTIVE',
          atualizadoEm: new Date(),
        },
      })
    } finally {
      await prisma.$disconnect()
    }
  },
  { connection, concurrency: 10 },
)

/**
 * Worker: Alertas de prazo
 * Executado diariamente para verificar prazos vencendo
 */
export const workerAlertasPrazo = new Worker(
  'alertas-prazo',
  async (job: Job) => {
    logger.info({ jobId: job.id }, 'Verificando alertas de prazo')
    await notificacaoService.alertarPrazos()
  },
  { connection, concurrency: 1 },
)

// ── Agendamentos recorrentes ───────────────────────────────────────

export async function agendarJobsRecorrentes() {
  // Alerta de prazos: todo dia às 7h
  await filaAlertasPrazo.add(
    'verificar-prazos-diario',
    {},
    {
      repeat: { pattern: '0 7 * * *' }, // Cron: 7h todo dia
      jobId: 'verificar-prazos-diario',
    },
  )

  logger.info('Jobs recorrentes agendados')
}

// ── Helpers de enqueue ─────────────────────────────────────────────

export const enqueue = {
  notificarUsuario: (usuarioId: string, dados: object) =>
    filaNotificacoes.add('notificar-usuario', { tipo: 'usuario', usuarioId, dados }),

  notificarOrgao: (orgaoId: string, dados: object) =>
    filaNotificacoes.add('notificar-orgao', { tipo: 'orgao', orgaoId, dados }),

  sincronizarCamunda: (instanciaId: string, camundaInstanceId: string) =>
    filaSincronizacaoCamunda.add('sync', { instanciaId, camundaInstanceId }),
}

// ── Event handlers (para monitoramento) ───────────────────────────

workerNotificacoes.on('completed', job => {
  logger.debug({ jobId: job.id }, 'Notificação processada')
})

workerNotificacoes.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Falha ao processar notificação')
})

workerCamundaSync.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Falha ao sincronizar Camunda')
})

// ── Graceful shutdown ──────────────────────────────────────────────

export async function fecharFilas() {
  await Promise.all([
    workerNotificacoes.close(),
    workerCamundaSync.close(),
    workerAlertasPrazo.close(),
    filaNotificacoes.close(),
    filaPDF.close(),
    filaSincronizacaoCamunda.close(),
    filaAlertasPrazo.close(),
  ])
  await connection.quit()
  logger.info('Filas fechadas graciosamente')
}
