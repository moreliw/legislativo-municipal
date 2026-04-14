import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { ok: true } }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('AlertasExternosService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TelegramService', () => {
    it('deve retornar false quando não configurado', async () => {
      // Sem variáveis de ambiente
      delete process.env.TELEGRAM_BOT_TOKEN
      delete process.env.TELEGRAM_CHAT_IDS

      const { TelegramService } = await import('../src/lib/alertas-externos.service')
      const svc = new TelegramService()
      const resultado = await svc.enviar('Teste de mensagem')
      expect(resultado).toBe(false)
    })

    it('deve enviar mensagem quando configurado', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot123456:TEST_TOKEN'
      process.env.TELEGRAM_CHAT_IDS = '-1001234567890,-1009876543210'

      const { TelegramService } = await import('../src/lib/alertas-externos.service')
      const svc = new TelegramService()
      const resultado = await svc.enviar('Prazo vencendo: PL-024/2024')

      const axios = await import('axios')
      expect((axios.default.post as any)).toHaveBeenCalledTimes(2) // 2 chat IDs
      expect(resultado).toBe(true)
    })

    it('deve usar formatação Markdown correta', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot123:TEST'
      process.env.TELEGRAM_CHAT_IDS = '-100123'

      const { TelegramService } = await import('../src/lib/alertas-externos.service')
      const svc = new TelegramService()
      await svc.enviar('Mensagem de teste')

      const axios = await import('axios')
      const chamada = (axios.default.post as any).mock.calls[0]
      const payload = chamada[1]

      expect(payload.parse_mode).toBe('Markdown')
      expect(payload.text).toContain('🏛️')
    })

    it('deve marcar mensagem urgente com emoji correto', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot123:TEST'
      process.env.TELEGRAM_CHAT_IDS = '-100123'

      const { TelegramService } = await import('../src/lib/alertas-externos.service')
      const svc = new TelegramService()
      await svc.enviar('Urgente!', true)

      const axios = await import('axios')
      const payload = (axios.default.post as any).mock.calls[0][1]
      expect(payload.text).toContain('🚨')
      expect(payload.disable_notification).toBe(false)
    })
  })

  describe('WhatsAppService', () => {
    it('deve retornar false quando não configurado', async () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN
      delete process.env.WHATSAPP_PHONE_NUMBER_ID
      delete process.env.WHATSAPP_RECIPIENTS

      const { WhatsAppService } = await import('../src/lib/alertas-externos.service')
      const svc = new WhatsAppService()
      const resultado = await svc.enviarTexto('Teste')
      expect(resultado).toBe(false)
    })
  })

  describe('AlertasExternosService — alertas específicos', () => {
    beforeEach(() => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot_test'
      process.env.TELEGRAM_CHAT_IDS = '-100test'
      delete process.env.WHATSAPP_ACCESS_TOKEN // Só Telegram ativo
    })

    it('deve formatar alerta de prazo vencido corretamente', async () => {
      const { AlertasExternosService } = await import('../src/lib/alertas-externos.service')
      const svc = new AlertasExternosService()

      await svc.alertarPrazoVencido({
        numero: 'PL-024/2024',
        etapa: 'Análise em Comissão',
      })

      const axios = await import('axios')
      const payload = (axios.default.post as any).mock.calls[0][1]
      expect(payload.text).toContain('PL-024/2024')
      expect(payload.text).toContain('Análise em Comissão')
      expect(payload.text).toContain('⏰')
    })

    it('deve formatar alerta de sessão próxima corretamente', async () => {
      const { AlertasExternosService } = await import('../src/lib/alertas-externos.service')
      const svc = new AlertasExternosService()

      await svc.alertarSessaoProxima({
        numero: '012/2024',
        tipo: 'Ordinária',
        data: '25/04/2024',
        hora: '19h00',
      })

      const axios = await import('axios')
      const payload = (axios.default.post as any).mock.calls[0][1]
      expect(payload.text).toContain('012/2024')
      expect(payload.text).toContain('25/04/2024')
      expect(payload.text).toContain('📅')
    })

    it('deve truncar ementa longa em aprovação publicada', async () => {
      const { AlertasExternosService } = await import('../src/lib/alertas-externos.service')
      const svc = new AlertasExternosService()

      const ementaLonga = 'A'.repeat(200)
      await svc.alertarAprovacaoPublicada({
        numero: 'PL-019/2024',
        ementa: ementaLonga,
      })

      const axios = await import('axios')
      const payload = (axios.default.post as any).mock.calls[0][1]
      // Deve truncar em 100 chars + '...'
      expect(payload.text.length).toBeLessThan(ementaLonga.length + 50)
      expect(payload.text).toContain('...')
    })
  })
})
