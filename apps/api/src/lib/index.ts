// lib/index.ts — Barrel export de utilitários compartilhados

export { prisma } from './prisma'
export { redisClient, cacheGet, cacheSet, cacheDel } from './redis'
export { logger } from './logger'
export { AppError, NotFoundError, ValidationError, ForbiddenError, ConflictError } from './errors'
