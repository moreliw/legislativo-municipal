import { vi, afterEach } from 'vitest'

// Limpar todos os mocks após cada teste
afterEach(() => {
  vi.clearAllMocks()
})

// Suprimir logs durante os testes
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  })),
}))

// Mock de variáveis de ambiente para testes
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.CAMUNDA_URL = 'http://localhost:8085'
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-muito-longa-para-funcionar-em-testes'
