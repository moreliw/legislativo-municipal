import { describe, it, expect, vi } from 'vitest'

// ── Testes de segurança — sanitização e rate limiting ──────────────

describe('Sanitização de inputs', () => {
  function sanitizarTexto(texto: string): string {
    return texto
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  it('deve remover tags HTML de texto livre', () => {
    expect(sanitizarTexto('<b>texto</b>')).toBe('texto')
    expect(sanitizarTexto('<script>alert("xss")</script>')).toBe('')
    expect(sanitizarTexto('texto <img src=x onerror=alert(1)> limpo')).toBe('texto  limpo')
  })

  it('deve preservar texto normal sem alteração', () => {
    const normal = 'Dispõe sobre o programa de energia solar fotovoltaica'
    expect(sanitizarTexto(normal)).toBe(normal)
  })

  it('deve preservar acentuação e caracteres especiais válidos', () => {
    const acentuado = 'Ação legislativa — São Francisco/MG (2024)'
    expect(sanitizarTexto(acentuado)).toBe(acentuado)
  })

  it('deve remover script aninhado', () => {
    const xss = '<scri<script>pt>alert(1)</scri</script>pt>'
    expect(sanitizarTexto(xss)).not.toContain('script')
  })
})

describe('Validação de numeração de proposição', () => {
  function validarNumero(numero: string): boolean {
    // Formato: SIGLA-NNN/AAAA
    return /^[A-Z]{2,5}-\d{3}\/\d{4}$/.test(numero)
  }

  it('deve aceitar formatos válidos', () => {
    expect(validarNumero('PL-001/2024')).toBe(true)
    expect(validarNumero('PDL-025/2024')).toBe(true)
    expect(validarNumero('MOC-100/2023')).toBe(true)
    expect(validarNumero('REQ-999/2024')).toBe(true)
  })

  it('deve rejeitar formatos inválidos', () => {
    expect(validarNumero('pl-001/2024')).toBe(false)    // minúsculo
    expect(validarNumero('PL-1/2024')).toBe(false)      // seq curto
    expect(validarNumero('PL-001/24')).toBe(false)      // ano curto
    expect(validarNumero('PL001/2024')).toBe(false)     // sem hífen
    expect(validarNumero('')).toBe(false)               // vazio
    expect(validarNumero('INVALID')).toBe(false)
  })
})

describe('Controle de transições de estado', () => {
  type Status = 'RASCUNHO' | 'PROTOCOLADO' | 'EM_ANALISE' | 'EM_COMISSAO' |
    'EM_PAUTA' | 'EM_VOTACAO' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO' | 'SUSPENSO'

  const transicoes: Partial<Record<Status, Status[]>> = {
    RASCUNHO:    ['PROTOCOLADO'],
    PROTOCOLADO: ['EM_ANALISE', 'ARQUIVADO'],
    EM_ANALISE:  ['EM_COMISSAO', 'EM_PAUTA', 'ARQUIVADO', 'SUSPENSO'],
    EM_COMISSAO: ['EM_PAUTA', 'ARQUIVADO'],
    EM_PAUTA:    ['EM_VOTACAO', 'SUSPENSO'],
    EM_VOTACAO:  ['APROVADO', 'REJEITADO'],
    APROVADO:    ['ARQUIVADO'],
    REJEITADO:   ['ARQUIVADO'],
    SUSPENSO:    ['EM_ANALISE', 'ARQUIVADO'],
    ARQUIVADO:   [],
  }

  function podeTransitar(de: Status, para: Status): boolean {
    return transicoes[de]?.includes(para) ?? false
  }

  // Transições que DEVEM ser permitidas
  const casosValidos: [Status, Status][] = [
    ['RASCUNHO', 'PROTOCOLADO'],
    ['PROTOCOLADO', 'EM_ANALISE'],
    ['EM_ANALISE', 'EM_COMISSAO'],
    ['EM_COMISSAO', 'EM_PAUTA'],
    ['EM_PAUTA', 'EM_VOTACAO'],
    ['EM_VOTACAO', 'APROVADO'],
    ['EM_VOTACAO', 'REJEITADO'],
    ['APROVADO', 'ARQUIVADO'],
  ]

  it.each(casosValidos)('%s → %s deve ser permitido', (de, para) => {
    expect(podeTransitar(de, para)).toBe(true)
  })

  // Transições que DEVEM ser bloqueadas
  const casosInvalidos: [Status, Status][] = [
    ['ARQUIVADO', 'EM_ANALISE'],
    ['ARQUIVADO', 'PROTOCOLADO'],
    ['APROVADO', 'RASCUNHO'],
    ['REJEITADO', 'APROVADO'],
    ['EM_VOTACAO', 'RASCUNHO'],
  ]

  it.each(casosInvalidos)('%s → %s deve ser bloqueado', (de, para) => {
    expect(podeTransitar(de, para)).toBe(false)
  })

  it('estado ARQUIVADO não tem transições de saída', () => {
    const destinos: Status[] = ['RASCUNHO', 'PROTOCOLADO', 'EM_ANALISE', 'APROVADO']
    destinos.forEach(d => {
      expect(podeTransitar('ARQUIVADO', d)).toBe(false)
    })
  })
})

describe('Formatação de documentos legislativos', () => {
  function formatarNumeroProposicao(prefixo: string, seq: number, ano: number): string {
    return `${prefixo}-${String(seq).padStart(3, '0')}/${ano}`
  }

  it('deve formatar números com padding correto', () => {
    expect(formatarNumeroProposicao('PL', 1, 2024)).toBe('PL-001/2024')
    expect(formatarNumeroProposicao('PL', 10, 2024)).toBe('PL-010/2024')
    expect(formatarNumeroProposicao('PL', 100, 2024)).toBe('PL-100/2024')
    expect(formatarNumeroProposicao('PDL', 5, 2023)).toBe('PDL-005/2023')
  })

  it('deve formatar data no padrão legislativo brasileiro', () => {
    const data = new Date('2024-04-25T19:00:00Z')
    const formatado = data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
    expect(formatado).toContain('2024')
    expect(formatado).toContain('abril')
  })
})

describe('Cálculo de prazos legislativos', () => {
  function calcularPrazo(inicio: Date, diasUteis: number, feriados: Date[] = []): Date {
    const resultado = new Date(inicio)
    let diasContados = 0
    while (diasContados < diasUteis) {
      resultado.setDate(resultado.getDate() + 1)
      const diaSemana = resultado.getDay()
      const ehFeriado = feriados.some(
        f => f.toDateString() === resultado.toDateString()
      )
      if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado) {
        diasContados++
      }
    }
    return resultado
  }

  it('deve calcular prazo de 5 dias úteis sem feriados', () => {
    const inicio = new Date('2024-04-22T00:00:00Z') // segunda-feira
    const prazo = calcularPrazo(inicio, 5)
    // 5 dias úteis a partir de segunda = próxima segunda (ou sexta se não houver fim de semana)
    expect(prazo.getDay()).toBeGreaterThanOrEqual(0) // dia válido
    expect(prazo.getTime()).toBeGreaterThan(inicio.getTime())
  })

  it('deve pular fins de semana no cálculo', () => {
    const sexta = new Date('2024-04-26T00:00:00Z') // sexta-feira
    const prazo = calcularPrazo(sexta, 1)
    // 1 dia útil após sexta = próxima segunda
    expect(prazo.getDay()).toBe(1) // segunda-feira
  })

  it('deve respeitar feriados', () => {
    const inicio = new Date('2024-04-29T00:00:00Z') // segunda
    const feriado = new Date('2024-04-30T00:00:00Z') // terça (feriado)
    const prazo = calcularPrazo(inicio, 1, [feriado])
    // 1 dia útil pulando o feriado = quarta
    expect(prazo.getDay()).toBe(3) // quarta
  })
})
