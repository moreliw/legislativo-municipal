import { PrismaClient, StatusProposicao, TipoEventoTramitacao, Prisma } from '@prisma/client'
import { CamundaService } from '../processos/camunda.service'
import { NotificacaoService } from '../notificacoes/notificacao.service'
import { AuditoriaService } from '../auditoria/auditoria.service'
import { AppError } from '../../lib/errors'

const prisma = new PrismaClient()

export interface RegistrarEventoInput {
  proposicaoId: string
  tipo: TipoEventoTramitacao
  descricao: string
  usuarioId: string
  orgaoOrigemId?: string
  orgaoDestinoId?: string
  observacao?: string
  dadosAdicionais?: Record<string, unknown>
  camundaTaskId?: string
  novoStatus?: StatusProposicao
}

export interface HistoricoFiltros {
  proposicaoId: string
  tipo?: TipoEventoTramitacao
  de?: Date
  ate?: Date
}

/**
 * TramitacaoService
 * Responsável por toda a lógica de movimentação de proposições.
 * Cada evento é imutável e rastreável.
 */
export class TramitacaoService {
  constructor(
    private camundaService: CamundaService,
    private notificacaoService: NotificacaoService,
    private auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra um evento de tramitação.
   * - Persiste o evento no histórico
   * - Atualiza o status da proposição
   * - Notifica responsáveis
   * - Audita a ação
   */
  async registrarEvento(input: RegistrarEventoInput, usuarioId: string) {
    const proposicao = await prisma.proposicao.findUnique({
      where: { id: input.proposicaoId },
      include: { tipoMateria: true },
    })

    if (!proposicao) {
      throw new AppError('Proposição não encontrada', 404)
    }

    // Verificar se a transição é permitida
    if (input.novoStatus) {
      await this.validarTransicao(proposicao.status, input.novoStatus, input.tipo)
    }

    // Calcular próximo número de sequência
    const ultimoEvento = await prisma.tramitacaoEvento.findFirst({
      where: { proposicaoId: input.proposicaoId },
      orderBy: { sequencia: 'desc' },
    })
    const proximaSequencia = (ultimoEvento?.sequencia ?? 0) + 1

    // Usar transação para garantir consistência
    const resultado = await prisma.$transaction(async (tx) => {
      // Registrar evento
      const evento = await tx.tramitacaoEvento.create({
        data: {
          proposicaoId: input.proposicaoId,
          sequencia: proximaSequencia,
          tipo: input.tipo,
          descricao: input.descricao,
          statusAntes: proposicao.status,
          statusDepois: input.novoStatus || proposicao.status,
          orgaoOrigemId: input.orgaoOrigemId,
          orgaoDestinoId: input.orgaoDestinoId,
          usuarioId: input.usuarioId,
          observacao: input.observacao,
          dadosAdicionais: input.dadosAdicionais as Prisma.InputJsonValue,
          camundaTaskId: input.camundaTaskId,
        },
        include: {
          usuario: { select: { nome: true, email: true } },
          orgaoOrigem: { select: { nome: true, sigla: true } },
        },
      })

      // Atualizar status da proposição se necessário
      if (input.novoStatus && input.novoStatus !== proposicao.status) {
        await tx.proposicao.update({
          where: { id: input.proposicaoId },
          data: {
            status: input.novoStatus,
            orgaoDestinoId: input.orgaoDestinoId,
            atualizadoEm: new Date(),
            ...(input.novoStatus === StatusProposicao.PROTOCOLADO
              ? { protocoladoEm: new Date() }
              : {}),
            ...(input.novoStatus === StatusProposicao.ARQUIVADO
              ? { arquivadoEm: new Date() }
              : {}),
          },
        })
      }

      return evento
    })

    // Ações pós-evento (fora da transação)
    await this.acoesPosEvento(resultado, proposicao, input)

    return resultado
  }

  /**
   * Retorna o histórico completo de tramitação de uma proposição
   */
  async buscarHistorico(filtros: HistoricoFiltros) {
    const where: Prisma.TramitacaoEventoWhereInput = {
      proposicaoId: filtros.proposicaoId,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.de || filtros.ate
        ? {
            criadoEm: {
              ...(filtros.de ? { gte: filtros.de } : {}),
              ...(filtros.ate ? { lte: filtros.ate } : {}),
            },
          }
        : {}),
    }

    const eventos = await prisma.tramitacaoEvento.findMany({
      where,
      orderBy: { sequencia: 'asc' },
      include: {
        usuario: {
          select: { id: true, nome: true, cargo: true, avatar: true },
        },
        orgaoOrigem: {
          select: { id: true, nome: true, sigla: true, tipo: true },
        },
        documentosGerados: {
          include: {
            documento: {
              select: { id: true, nome: true, tipo: true, status: true },
            },
          },
        },
      },
    })

    return eventos
  }

  /**
   * Encaminhar proposição para um órgão
   */
  async encaminhar(
    proposicaoId: string,
    orgaoDestinoId: string,
    observacao: string,
    usuarioId: string,
  ) {
    const orgaoDestino = await prisma.orgao.findUnique({ where: { id: orgaoDestinoId } })
    if (!orgaoDestino) throw new AppError('Órgão de destino não encontrado', 404)

    return this.registrarEvento(
      {
        proposicaoId,
        tipo: TipoEventoTramitacao.ENCAMINHAMENTO,
        descricao: `Encaminhado para ${orgaoDestino.nome}`,
        usuarioId,
        orgaoDestinoId,
        observacao,
        novoStatus: StatusProposicao.EM_ANALISE,
      },
      usuarioId,
    )
  }

  /**
   * Devolver proposição ao autor com justificativa
   */
  async devolver(proposicaoId: string, motivo: string, usuarioId: string) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: TipoEventoTramitacao.DEVOLUCAO,
        descricao: 'Proposição devolvida ao autor',
        usuarioId,
        observacao: motivo,
        novoStatus: StatusProposicao.DEVOLVIDO,
      },
      usuarioId,
    )
  }

  /**
   * Arquivar proposição
   */
  async arquivar(proposicaoId: string, motivo: string, usuarioId: string) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: TipoEventoTramitacao.ARQUIVAMENTO,
        descricao: 'Proposição arquivada',
        usuarioId,
        observacao: motivo,
        novoStatus: StatusProposicao.ARQUIVADO,
      },
      usuarioId,
    )
  }

  /**
   * Suspender tramitação
   */
  async suspender(proposicaoId: string, motivo: string, usuarioId: string) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: TipoEventoTramitacao.SUSPENSAO,
        descricao: 'Tramitação suspensa',
        usuarioId,
        observacao: motivo,
        novoStatus: StatusProposicao.SUSPENSO,
      },
      usuarioId,
    )
  }

  /**
   * Validações de transição de estado
   * Define quais transições são permitidas
   */
  private async validarTransicao(
    statusAtual: StatusProposicao,
    novoStatus: StatusProposicao,
    tipoEvento: TipoEventoTramitacao,
  ) {
    const transicoesPermitidas: Partial<Record<StatusProposicao, StatusProposicao[]>> = {
      [StatusProposicao.RASCUNHO]: [StatusProposicao.EM_ELABORACAO, StatusProposicao.PROTOCOLADO],
      [StatusProposicao.EM_ELABORACAO]: [StatusProposicao.PROTOCOLADO, StatusProposicao.RASCUNHO],
      [StatusProposicao.PROTOCOLADO]: [
        StatusProposicao.EM_ANALISE,
        StatusProposicao.DEVOLVIDO,
        StatusProposicao.SUSPENSO,
      ],
      [StatusProposicao.EM_ANALISE]: [
        StatusProposicao.EM_COMISSAO,
        StatusProposicao.AGUARDANDO_PARECER_JURIDICO,
        StatusProposicao.EM_PAUTA,
        StatusProposicao.DEVOLVIDO,
        StatusProposicao.SUSPENSO,
        StatusProposicao.ARQUIVADO,
      ],
      [StatusProposicao.AGUARDANDO_PARECER_JURIDICO]: [
        StatusProposicao.EM_COMISSAO,
        StatusProposicao.EM_ANALISE,
        StatusProposicao.DEVOLVIDO,
      ],
      [StatusProposicao.EM_COMISSAO]: [
        StatusProposicao.EM_PAUTA,
        StatusProposicao.DEVOLVIDO,
        StatusProposicao.ARQUIVADO,
      ],
      [StatusProposicao.EM_PAUTA]: [
        StatusProposicao.EM_VOTACAO,
        StatusProposicao.EM_COMISSAO,
        StatusProposicao.SUSPENSO,
      ],
      [StatusProposicao.EM_VOTACAO]: [
        StatusProposicao.APROVADO,
        StatusProposicao.REJEITADO,
        StatusProposicao.EM_PAUTA,
      ],
      [StatusProposicao.APROVADO]: [
        StatusProposicao.PUBLICADO,
        StatusProposicao.ARQUIVADO,
      ],
      [StatusProposicao.REJEITADO]: [StatusProposicao.ARQUIVADO],
      [StatusProposicao.PUBLICADO]: [StatusProposicao.ARQUIVADO],
      [StatusProposicao.DEVOLVIDO]: [
        StatusProposicao.EM_ELABORACAO,
        StatusProposicao.ARQUIVADO,
      ],
      [StatusProposicao.SUSPENSO]: [
        StatusProposicao.EM_ANALISE,
        StatusProposicao.ARQUIVADO,
      ],
      [StatusProposicao.ARQUIVADO]: [],
    }

    const permitidos = transicoesPermitidas[statusAtual] || []
    if (!permitidos.includes(novoStatus)) {
      throw new AppError(
        `Transição não permitida: ${statusAtual} → ${novoStatus}`,
        422,
      )
    }
  }

  /**
   * Ações assíncronas pós-evento
   */
  private async acoesPosEvento(
    evento: Prisma.TramitacaoEventoGetPayload<{
      include: { usuario: true }
    }>,
    proposicao: Prisma.ProposicaoGetPayload<{ include: { tipoMateria: true } }>,
    input: RegistrarEventoInput,
  ) {
    try {
      // Notificar usuários relevantes
      if (input.orgaoDestinoId) {
        await this.notificacaoService.notificarOrgao(input.orgaoDestinoId, {
          tipo: 'ENCAMINHAMENTO',
          titulo: `Nova proposição: ${proposicao.numero}`,
          mensagem: input.descricao,
          proposicaoId: proposicao.id,
        })
      }

      // Registrar auditoria
      await this.auditoriaService.registrar({
        usuarioId: input.usuarioId,
        entidade: 'TramitacaoEvento',
        entidadeId: evento.id,
        acao: 'CRIAR',
        dadosDepois: {
          tipo: input.tipo,
          proposicaoId: input.proposicaoId,
          status: input.novoStatus,
        },
      })
    } catch (err) {
      // Não propagar erros de notificação/auditoria
      console.error('Erro em ações pós-evento:', err)
    }
  }
}
