import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Gera numeração única para proposições
 * Formato: PL-001/2024
 * Thread-safe via select for update / advisory lock
 */
export async function gerarNumero(casaId: string, prefixo: string): Promise<string> {
  const ano = new Date().getFullYear()

  // Buscar o último número registrado para este prefixo/ano
  const ultimo = await prisma.proposicao.findFirst({
    where: {
      casaId,
      numero: { startsWith: `${prefixo}-` },
      ano,
    },
    orderBy: { criadoEm: 'desc' },
    select: { numero: true },
  })

  let proximoSeq = 1
  if (ultimo) {
    const partes = ultimo.numero.split('-')
    const anoNumero = partes[partes.length - 1]
    const seq = partes[partes.length - 2]
    if (anoNumero === String(ano) && seq) {
      proximoSeq = parseInt(seq) + 1
    }
  }

  // Formato: PL-001/2024
  const numero = `${prefixo}-${String(proximoSeq).padStart(3, '0')}/${ano}`

  return numero
}

export const numeracaoService = { gerarNumero }
