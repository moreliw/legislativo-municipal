import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

const CAMPOS_SENSIVEIS = ['cpf', 'telefone', 'dataNascimento', 'enderecoResidencial']

export async function lgpdPlugin(app: FastifyInstance) {
  // Header de privacidade em todas as respostas
  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Privacy-Policy', 'https://legislativo.gov.br/privacidade')
    return payload
  })
}
