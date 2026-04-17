import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

const CAMPOS_SENSIVEIS = ['cpf', 'telefone', 'dataNascimento', 'enderecoResidencial']

async function lgpdPluginImpl(app: FastifyInstance) {
  // Header de privacidade em todas as respostas
  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Privacy-Policy', 'https://legislativo.gov.br/privacidade')
    return payload
  })
}


export const lgpdPlugin = fp(lgpdPluginImpl, { name: 'lgpdPlugin' })
