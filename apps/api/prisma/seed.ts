import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando banco — Câmara Municipal de Rio Novo do Sul - ES')
  console.log('═'.repeat(55))

  // ── 1. Casa Legislativa ────────────────────────────────────────
  const casa = await prisma.casaLegislativa.upsert({
    where: { sigla: 'CMRNS' },
    create: {
      id:        'cmrns',
      nome:      'Câmara Municipal de Rio Novo do Sul',
      sigla:     'CMRNS',
      cnpj:      '27.165.789/0001-00',
      municipio: 'Rio Novo do Sul',
      uf:        'ES',
      email:     'contato@camararionovosul.es.gov.br',
      telefone:  '(28) 3536-1100',
      site:      'https://camararionovosul.es.gov.br',
      configuracoes: {
        totalVereadores:   9,
        quorumSimples:     5,
        quorumQualificado: 7,
        legislatura:       '2021-2024',
        corPrimaria:       '#1a3a6e',
        corSecundaria:     '#c8a84b',
      },
      ativo: true,
    },
    update: {},
  })
  console.log(`✅ Casa: ${casa.nome}`)

  // ── 2. Perfis ──────────────────────────────────────────────────
  // Perfil agora tem casaId — upsert via casaId_nome
  const [pAdmin, pSecretario, pVereador, pJuridico, pConsulta] = await Promise.all([
    prisma.perfil.upsert({
      where: { casaId_nome: { casaId: casa.id, nome: 'ADMINISTRADOR' } },
      create: { casaId: casa.id, nome: 'ADMINISTRADOR', descricao: 'Acesso total', permissoes: ['*:*'] },
      update: { permissoes: ['*:*'] },
    }),
    prisma.perfil.upsert({
      where: { casaId_nome: { casaId: casa.id, nome: 'SECRETARIO_LEGISLATIVO' } },
      create: {
        casaId: casa.id, nome: 'SECRETARIO_LEGISLATIVO',
        descricao: 'Gestão de proposições, sessões e tramitação',
        permissoes: [
          'proposicoes:ler','proposicoes:criar','proposicoes:editar',
          'tramitacao:ler','tramitacao:criar',
          'sessoes:ler','sessoes:criar','sessoes:editar',
          'documentos:ler','documentos:criar',
          'usuarios:ler','busca:ler','notificacoes:ler','relatorios:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { casaId_nome: { casaId: casa.id, nome: 'VEREADOR' } },
      create: {
        casaId: casa.id, nome: 'VEREADOR',
        descricao: 'Vereador eleito',
        permissoes: [
          'proposicoes:ler','proposicoes:criar',
          'tramitacao:ler','sessoes:ler',
          'documentos:ler','busca:ler','notificacoes:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { casaId_nome: { casaId: casa.id, nome: 'JURIDICO' } },
      create: {
        casaId: casa.id, nome: 'JURIDICO',
        descricao: 'Assessoria jurídica',
        permissoes: [
          'proposicoes:ler','tramitacao:ler','tramitacao:criar',
          'documentos:ler','documentos:criar','busca:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { casaId_nome: { casaId: casa.id, nome: 'CONSULTA' } },
      create: {
        casaId: casa.id, nome: 'CONSULTA',
        descricao: 'Acesso somente leitura',
        permissoes: ['proposicoes:ler','sessoes:ler','documentos:ler','busca:ler'],
      },
      update: {},
    }),
  ])
  console.log('✅ 5 perfis criados (ADMINISTRADOR, SECRETARIO, VEREADOR, JURIDICO, CONSULTA)')

  // ── 3. Órgãos ──────────────────────────────────────────────────
  const orgaos = await Promise.all([
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PRES' } },
      create: { casaId: casa.id, nome: 'Presidência', sigla: 'PRES', tipo: 'PRESIDENCIA', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'SEC' } },
      create: { casaId: casa.id, nome: 'Secretaria Legislativa', sigla: 'SEC', tipo: 'SECRETARIA', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PROTO' } },
      create: { casaId: casa.id, nome: 'Protocolo', sigla: 'PROTO', tipo: 'PROTOCOLO', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'JUR' } },
      create: { casaId: casa.id, nome: 'Assessoria Jurídica', sigla: 'JUR', tipo: 'PROCURADORIA', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PLN' } },
      create: { casaId: casa.id, nome: 'Plenário', sigla: 'PLN', tipo: 'PLENARIO', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CFO' } },
      create: { casaId: casa.id, nome: 'Comissão de Finanças e Orçamento', sigla: 'CFO', tipo: 'COMISSAO_PERMANENTE', ativo: true },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CJIP' } },
      create: { casaId: casa.id, nome: 'Comissão de Justiça e Interesse Público', sigla: 'CJIP', tipo: 'COMISSAO_PERMANENTE', ativo: true },
      update: {},
    }),
  ])
  console.log(`✅ ${orgaos.length} órgãos criados`)

  // ── 4. Tipos de Matéria ────────────────────────────────────────
  await Promise.all([
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PL' } },
      create: { casaId: casa.id, nome: 'Projeto de Lei', sigla: 'PL', prefixoNumero: 'PL', exigeParecerJuridico: true, exigeComissao: true, prazoTramitacao: 60 },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PLC' } },
      create: { casaId: casa.id, nome: 'Projeto de Lei Complementar', sigla: 'PLC', prefixoNumero: 'PLC', exigeParecerJuridico: true, prazoTramitacao: 60 },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PELO' } },
      create: { casaId: casa.id, nome: 'Proposta de Emenda à Lei Orgânica', sigla: 'PELO', prefixoNumero: 'PELO', exigeParecerJuridico: true, prazoTramitacao: 90 },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'MOC' } },
      create: { casaId: casa.id, nome: 'Moção', sigla: 'MOC', prefixoNumero: 'MOC', exigeComissao: false, prazoTramitacao: 30 },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'REQ' } },
      create: { casaId: casa.id, nome: 'Requerimento', sigla: 'REQ', prefixoNumero: 'REQ', exigeComissao: false, prazoTramitacao: 15 },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'IND' } },
      create: { casaId: casa.id, nome: 'Indicação', sigla: 'IND', prefixoNumero: 'IND', exigeComissao: false, prazoTramitacao: 15 },
      update: {},
    }),
  ])
  console.log('✅ 6 tipos de matéria criados')

  // ── 5. Usuários com credenciais ────────────────────────────────
  async function criarUsuario(dados: {
    id: string; nome: string; email: string; cargo: string
    senha: string; perfil: typeof pAdmin
    cpf?: string
    precisaTrocar?: boolean
  }) {
    const hash = await bcrypt.hash(dados.senha, 12)
    const u = await prisma.usuario.upsert({
      where: { id: dados.id },
      create: { id: dados.id, casaId: casa.id, nome: dados.nome, email: dados.email, cargo: dados.cargo, cpf: dados.cpf, ativo: true },
      update: { nome: dados.nome, email: dados.email, cargo: dados.cargo },
    })
    await prisma.credencialUsuario.upsert({
      where: { usuarioId: u.id },
      create: { usuarioId: u.id, senhaHash: hash, precisaTrocar: dados.precisaTrocar ?? false },
      update: { senhaHash: hash },
    })
    // Vincular perfil
    await prisma.usuarioPerfil.upsert({
      where: { usuarioId_perfilId: { usuarioId: u.id, perfilId: dados.perfil.id } },
      create: { usuarioId: u.id, perfilId: dados.perfil.id },
      update: {},
    })
    return u
  }

  const usuarios = await Promise.all([
    criarUsuario({ id: 'usr-rns-admin', nome: 'Administrador do Sistema', email: 'admin@camararionovosul.es.gov.br', cargo: 'Administrador', senha: 'RioNovo@2024!', perfil: pAdmin }),
    criarUsuario({ id: 'usr-rns-sec', nome: 'Maria das Graças Ferreira', email: 'secretaria@camararionovosul.es.gov.br', cargo: 'Secretária Legislativa', senha: 'Secretaria@2024!', perfil: pSecretario }),
    criarUsuario({ id: 'usr-rns-ver1', nome: 'Ver. João Carlos Pereira', email: 'joao.pereira@camararionovosul.es.gov.br', cargo: 'Vereador', senha: 'Vereador@2024!', perfil: pVereador }),
    criarUsuario({ id: 'usr-rns-ver2', nome: 'Ver. Ana Lúcia Santos', email: 'ana.santos@camararionovosul.es.gov.br', cargo: 'Vereadora / Presidente', senha: 'Vereador@2024!', perfil: pVereador }),
    criarUsuario({ id: 'usr-rns-jur', nome: 'Dr. Carlos Eduardo Melo', email: 'juridico@camararionovosul.es.gov.br', cargo: 'Assessor Jurídico', senha: 'Juridico@2024!', perfil: pJuridico }),
  ])
  console.log(`✅ ${usuarios.length} usuários criados com credenciais`)

  // ── 6. Proposições de exemplo ──────────────────────────────────
  const tmPL = await prisma.tipoMateria.findFirst({ where: { casaId: casa.id, sigla: 'PL' } })
  const tmMOC = await prisma.tipoMateria.findFirst({ where: { casaId: casa.id, sigla: 'MOC' } })
  const orgCJIP = await prisma.orgao.findFirst({ where: { casaId: casa.id, sigla: 'CJIP' } })

  if (tmPL && orgCJIP) {
    await prisma.proposicao.upsert({
      where: { numero: 'PL-001/2024' },
      create: {
        casaId: casa.id, numero: 'PL-001/2024', ano: 2024,
        tipoMateriaId: tmPL.id, autorId: 'usr-rns-ver1',
        ementa: 'Institui o Programa de Apoio aos Agricultores Familiares do Município de Rio Novo do Sul.',
        origem: 'VEREADOR', regime: 'ORDINARIO', status: 'EM_COMISSAO',
        palavrasChave: ['agricultura', 'apoio', 'rural'],
        orgaoDestinoId: orgCJIP.id, protocoladoEm: new Date('2024-03-15'),
      },
      update: {},
    })
  }

  if (tmMOC) {
    await prisma.proposicao.upsert({
      where: { numero: 'MOC-001/2024' },
      create: {
        casaId: casa.id, numero: 'MOC-001/2024', ano: 2024,
        tipoMateriaId: tmMOC.id, autorId: 'usr-rns-ver2',
        ementa: 'Moção de Congratulações ao time feminino de vôlei de Rio Novo do Sul pelo título estadual.',
        origem: 'VEREADOR', regime: 'SUMARIO', status: 'APROVADO',
        palavrasChave: ['esporte', 'vôlei'], protocoladoEm: new Date('2024-04-01'),
      },
      update: {},
    })
  }

  // ── 7. Sessão de exemplo ───────────────────────────────────────
  await prisma.sessaoLegislativa.upsert({
    where: { id: 'sessao-rns-001-2024' },
    create: {
      id: 'sessao-rns-001-2024',
      casaId: casa.id, numero: '001/2024', tipo: 'ORDINARIA',
      data: new Date('2024-04-22T22:00:00Z'),
      horaInicio: '19h00', local: 'Plenário Vereador Antônio Rangel',
      status: 'AGENDADA', quorumMinimo: 5,
    },
    update: {},
  })

  // ── Resumo ─────────────────────────────────────────────────────
  console.log('')
  console.log('═'.repeat(55))
  console.log('✅ Seed concluído!')
  console.log('')
  console.log('🔑 LOGINS DISPONÍVEIS:')
  console.log('')
  console.log('  ADMINISTRADOR')
  console.log('  admin@camararionovosul.es.gov.br')
  console.log('  Senha: RioNovo@2024!')
  console.log('')
  console.log('  SECRETÁRIA LEGISLATIVA')
  console.log('  secretaria@camararionovosul.es.gov.br')
  console.log('  Senha: Secretaria@2024!')
  console.log('')
  console.log('  VEREADOR')
  console.log('  joao.pereira@camararionovosul.es.gov.br')
  console.log('  Senha: Vereador@2024!')
  console.log('')
  console.log('  ASSESSOR JURÍDICO')
  console.log('  juridico@camararionovosul.es.gov.br')
  console.log('  Senha: Juridico@2024!')
  console.log('═'.repeat(55))
}

main()
  .catch(err => { console.error('❌ Erro no seed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
