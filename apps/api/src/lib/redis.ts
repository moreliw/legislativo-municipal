import { createClient } from 'redis'
import { logger } from './logger'

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: máximo de tentativas de reconexão atingido')
        return new Error('Redis indisponível')
      }
      return Math.min(retries * 200, 3000)
    },
  },
})

redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error'))
redisClient.on('connect', () => logger.info('Redis conectado'))
redisClient.on('reconnecting', () => logger.warn('Redis reconectando...'))

// Helper para cache simples
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redisClient.get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds })
  } catch (err) {
    logger.warn({ err, key }, 'Falha ao gravar cache')
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redisClient.del(key)
  } catch {}
}
