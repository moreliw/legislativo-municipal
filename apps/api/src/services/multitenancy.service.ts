import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Cache de conexões por casa
const tenantConnections = new Map<string, PrismaClient>()

export const multitenancyService = {
  /**
   * Cria schema isolado para nova câmara
   */
  async criarSchemaCamara(casaId: string) {
    const schemaName = `casa_${casaId.replace(/-/g, '_')}`
    
    // 1. Criar schema no PostgreSQL
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    
    // 2. Aplicar migrations no novo schema
    const DATABASE_URL = process.env.DATABASE_URL
    if (!DATABASE_URL) throw new Error('DATABASE_URL não configurada')
    
    const schemaUrl = DATABASE_URL.replace(/\?.*$/, '') + `?schema=${schemaName}`
    
    try {
      await execAsync(`DATABASE_URL="${schemaUrl}" npx prisma db push --skip-generate`, {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: schemaUrl }
      })
      
      console.log(`✓ Schema ${schemaName} criado e migrado`)
    } catch (err: any) {
      console.error(`Erro ao criar schema ${schemaName}:`, err.message)
      throw err
    }
    
    return schemaName
  },

  /**
   * Obter conexão Prisma isolada para uma câmara
   */
  getTenantConnection(casaId: string): PrismaClient {
    if (tenantConnections.has(casaId)) {
      return tenantConnections.get(casaId)!
    }
    
    const schemaName = `casa_${casaId.replace(/-/g, '_')}`
    const DATABASE_URL = process.env.DATABASE_URL
    
    if (!DATABASE_URL) throw new Error('DATABASE_URL não configurada')
    
    const schemaUrl = DATABASE_URL.replace(/\?.*$/, '') + `?schema=${schemaName}`
    
    const connection = new PrismaClient({
      datasources: { db: { url: schemaUrl } }
    })
    
    tenantConnections.set(casaId, connection)
    return connection
  },

  /**
   * Limpar conexão de cache (usado ao deletar câmara)
   */
  async clearTenantConnection(casaId: string) {
    const conn = tenantConnections.get(casaId)
    if (conn) {
      await conn.$disconnect()
      tenantConnections.delete(casaId)
    }
  },

  /**
   * Deletar schema de câmara (cuidado: irreversível!)
   */
  async deletarSchemaCamara(casaId: string) {
    await this.clearTenantConnection(casaId)
    
    const schemaName = `casa_${casaId.replace(/-/g, '_')}`
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
    
    console.log(`✓ Schema ${schemaName} deletado`)
  },
}
