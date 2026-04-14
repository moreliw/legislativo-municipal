/**
 * AlertasExternosService — Integração com canais externos de alerta
 *
 * Suporta envio de notificações urgentes via:
 * - Telegram (Bot API)
 * - WhatsApp Business API
 *
 * Utilizado para alertas críticos: prazos vencidos, sessões próximas,
 * aprovações urgentes.
 */
import axios from 'axios'
import { logger } from './logger'

// ── Telegram ───────────────────────────────────────────────────────

interface TelegramConfig {
  botToken: string
  chatIds: string[] // IDs dos chats/grupos que recebem alertas
}

export class TelegramService {
  private config: TelegramConfig
  private baseUrl: string

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatIds: (process.env.TELEGRAM_CHAT_IDS || '').split(',').filter(Boolean),
    }
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`
  }

  private isConfigured(): boolean {
    return !!this.config.botToken && this.config.chatIds.length > 0
  }

  async enviar(mensagem: string, urgente = false): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.debug('Telegram não configurado, pulando envio')
      return false
    }

    const texto = urgente ? `🚨 *URGENTE*\n\n${mensagem}` : `🏛️ *Câmara Municipal*\n\n${mensagem}`

    const resultados = await Promise.allSettled(
      this.config.chatIds.map(chatId =>
        axios.post(`${this.baseUrl}/sendMessage`, {
          chat_id: chatId,
          text: texto,
          parse_mode: 'Markdown',
          disable_notification: !urgente,
        }),
      ),
    )

    const sucessos = resultados.filter(r => r.status === 'fulfilled').length
    logger.info({ mensagemLen: mensagem.length, sucessos, total: this.config.chatIds.length }, 'Telegram: mensagens enviadas')
    return sucessos > 0
  }

  async enviarDocumento(chatId: string, buffer: Buffer, nomeArquivo: string, caption?: string): Promise<boolean> {
    if (!this.isConfigured()) return false
    try {
      const FormData = (await import('form-data')).default
      const form = new FormData()
      form.append('chat_id', chatId)
      form.append('document', buffer, { filename: nomeArquivo })
      if (caption) form.append('caption', caption)

      await axios.post(`${this.baseUrl}/sendDocument`, form, {
        headers: form.getHeaders(),
      })
      return true
    } catch (err) {
      logger.error({ err }, 'Telegram: falha ao enviar documento')
      return false
    }
  }
}

// ── WhatsApp Business API ──────────────────────────────────────────

interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  recipients: string[] // Números no formato +5511999999999
}

export class WhatsAppService {
  private config: WhatsAppConfig
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      recipients: (process.env.WHATSAPP_RECIPIENTS || '').split(',').filter(Boolean),
    }
  }

  private isConfigured(): boolean {
    return !!this.config.accessToken &&
      !!this.config.phoneNumberId &&
      this.config.recipients.length > 0
  }

  async enviarTexto(mensagem: string): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.debug('WhatsApp não configurado, pulando envio')
      return false
    }

    const resultados = await Promise.allSettled(
      this.config.recipients.map(numero =>
        axios.post(
          `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: numero.replace(/\D/g, ''),
            type: 'text',
            text: { preview_url: false, body: mensagem },
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    )

    const sucessos = resultados.filter(r => r.status === 'fulfilled').length
    logger.info({ sucessos, total: this.config.recipients.length }, 'WhatsApp: mensagens enviadas')
    return sucessos > 0
  }

  async enviarTemplate(templateName: string, params: string[]): Promise<boolean> {
    if (!this.isConfigured()) return false

    // Templates pré-aprovados no WhatsApp Business:
    // - "prazo_vencendo": {{1}} = proposição, {{2}} = data
    // - "sessao_agendada": {{1}} = número sessão, {{2}} = data
    // - "aprovacao_publicada": {{1}} = número proposição

    const resultados = await Promise.allSettled(
      this.config.recipients.map(numero =>
        axios.post(
          `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: numero.replace(/\D/g, ''),
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'pt_BR' },
              components: [{
                type: 'body',
                parameters: params.map(p => ({ type: 'text', text: p })),
              }],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    )

    return resultados.some(r => r.status === 'fulfilled')
  }
}

// ── Serviço Unificado de Alertas ───────────────────────────────────

export class AlertasExternosService {
  private telegram: TelegramService
  private whatsapp: WhatsAppService

  constructor() {
    this.telegram = new TelegramService()
    this.whatsapp = new WhatsAppService()
  }

  async alertarPrazoVencido(proposicao: { numero: string; etapa: string }): Promise<void> {
    const msg = `⏰ Prazo vencido!\n\n*Proposição:* ${proposicao.numero}\n*Etapa:* ${proposicao.etapa}\n\nAcesse o sistema para regularizar a situação.`
    await Promise.allSettled([
      this.telegram.enviar(msg, true),
      this.whatsapp.enviarTexto(msg),
    ])
  }

  async alertarSessaoProxima(sessao: { numero: string; tipo: string; data: string; hora: string }): Promise<void> {
    const msg = `📅 Sessão ${sessao.tipo} em breve!\n\n*Sessão:* ${sessao.numero}\n*Data:* ${sessao.data}\n*Horário:* ${sessao.hora}`
    await Promise.allSettled([
      this.telegram.enviar(msg, false),
      this.whatsapp.enviarTexto(msg),
    ])
  }

  async alertarAprovacaoPublicada(proposicao: { numero: string; ementa: string }): Promise<void> {
    const msg = `✅ Proposição publicada!\n\n*${proposicao.numero}*\n${proposicao.ementa.slice(0, 100)}${proposicao.ementa.length > 100 ? '...' : ''}`
    await Promise.allSettled([
      this.telegram.enviar(msg, false),
      this.whatsapp.enviarTexto(msg),
    ])
  }
}

// Singleton exportado
export const alertasExternosService = new AlertasExternosService()
