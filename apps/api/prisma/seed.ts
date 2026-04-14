import { PrismaClient, TipoTokenSeguranca } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando banco — Sistema Legislativo Municipal')
  console.log('═'.repeat(55))

  // ── 1. Casa Legislativa: Rio Novo do Sul - ES ──────────────────
  const casa = await prisma.casaLegislativa.upsert({
    where: { sigla: 'CMRNS' },
    create: {
      id:          'cmrns',
      nome:        'Câmara Municipal de Rio Novo do Sul',
      sigla:       'CMRNS',
      cnpj:        '27.165.789/0001-00',
      municipio:   'Rio Novo do Sul',
      uf:          'ES',
      email:       'contato@camararionovosul.es.gov.br',
      telefone:    '(28) 3536-1100',
      site:        'https://camararionovosul.es.gov.br',
      configuracoes: {
        totalVereadores: 9,
        quorumSimples: 5,
        quorumQualificado: 7,
        legislatura: '2021-2024',
        corPrimaria: '#1a3a6e',
        corSecundaria: '#c8a84b',
        brasao: null,
      },
      ativo: true,
    },
    update: {},
  })
  console.log(`✅ Casa legislativa: ${casa.nome}`)

  // ── 2. Perfis e Permissões ─────────────────────────────────────
  const perfis = await Promise.all([
    prisma.perfil.upsert({
      where: { id: 'perfil-admin' },
      create: {
        id: 'perfil-admin',
        casaId: casa.id,
        nome: 'ADMINISTRADOR',
        descricao: 'Acesso total ao sistema',
        permissoes: ['*:*'],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { id: 'perfil-secretario' },
      create: {
        id: 'perfil-secretario',
        casaId: casa.id,
        nome: 'SECRETARIO_LEGISLATIVO',
        descricao: 'Gestão de proposições, sessões e tramitação',
        permissoes: [
          'proposicoes:ler', 'proposicoes:criar', 'proposicoes:editar',
          'tramitacao:ler', 'tramitacao:criar',
          'sessoes:ler', 'sessoes:criar', 'sessoes:editar',
          'documentos:ler', 'documentos:criar',
          'usuarios:ler',
          'busca:ler',
          'notificacoes:ler',
          'relatorios:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { id: 'perfil-vereador' },
      create: {
        id: 'perfil-vereador',
        casaId: casa.id,
        nome: 'VEREADOR',
        descricao: 'Vereador eleito — visualização e criação de proposições',
        permissoes: [
          'proposicoes:ler', 'proposicoes:criar',
          'tramitacao:ler',
          'sessoes:ler',
          'documentos:ler',
          'busca:ler',
          'notificacoes:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { id: 'perfil-juridico' },
      create: {
        id: 'perfil-juridico',
        casaId: casa.id,
        nome: 'JURIDICO',
        descricao: 'Pareceres jurídicos e controle de legalidade',
        permissoes: [
          'proposicoes:ler',
          'tramitacao:ler', 'tramitacao:criar',
          'documentos:ler', 'documentos:criar',
          'busca:ler',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { id: 'perfil-consulta' },
      create: {
        id: 'perfil-consulta',
        casaId: casa.id,
        nome: 'CONSULTA',
        descricao: 'Acesso somente leitura',
        permissoes: [
          'proposicoes:ler', 'sessoes:ler',
          'documentos:ler', 'busca:ler',
        ],
      },
      update: {},
    }),
  ])
  console.log(`✅ ${perfis.length} perfis criados`)

  // ── 3. Órgãos ──────────────────────────────────────────────────
  const orgaos = await Promise.all([
    prisma.orgao.upsert({ where: { id: 'org-rns-presidencia' },
      create: { id: 'org-rns-presidencia', casaId: casa.id, nome: 'Presidência', sigla: 'PRES', tipo: 'PRESIDENCIA' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-sec' },
      create: { id: 'org-rns-sec', casaId: casa.id, nome: 'Secretaria Legislativa', sigla: 'SEC', tipo: 'SECRETARIA' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-proto' },
      create: { id: 'org-rns-proto', casaId: casa.id, nome: 'Protocolo', sigla: 'PROTO', tipo: 'PROTOCOLO' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-juridico' },
      create: { id: 'org-rns-juridico', casaId: casa.id, nome: 'Assessoria Jurídica', sigla: 'JURÍDICO', tipo: 'PROCURADORIA' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-plenario' },
      create: { id: 'org-rns-plenario', casaId: casa.id, nome: 'Plenário', sigla: 'PLN', tipo: 'PLENARIO' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-cfo' },
      create: { id: 'org-rns-cfo', casaId: casa.id, nome: 'Comissão de Finanças e Orçamento', sigla: 'CFO', tipo: 'COMISSAO_PERMANENTE' }, update: {} }),
    prisma.orgao.upsert({ where: { id: 'org-rns-cji' },
      create: { id: 'org-rns-cji', casaId: casa.id, nome: 'Comissão de Justiça e Interesse Público', sigla: 'CJIP', tipo: 'COMISSAO_PERMANENTE' }, update: {} }),
  ])
  console.log(`✅ ${orgaos.length} órgãos criados`)

  // ── 4. Tipos de Matéria ────────────────────────────────────────
  await Promise.all([
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-pl' },
      create: { id: 'tm-rns-pl', casaId: casa.id, nome: 'Projeto de Lei', sigla: 'PL', prefixoNumero: 'PL', exigeParecerJuridico: true, prazoTramitacao: 60 }, update: {} }),
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-plc' },
      create: { id: 'tm-rns-plc', casaId: casa.id, nome: 'Projeto de Lei Complementar', sigla: 'PLC', prefixoNumero: 'PLC', exigeParecerJuridico: true, prazoTramitacao: 60 }, update: {} }),
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-pec' },
      create: { id: 'tm-rns-pec', casaId: casa.id, nome: 'Proposta de Emenda à Lei Orgânica', sigla: 'PELO', prefixoNumero: 'PELO', exigeParecerJuridico: true, prazoTramitacao: 90 }, update: {} }),
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-moc' },
      create: { id: 'tm-rns-moc', casaId: casa.id, nome: 'Moção', sigla: 'MOC', prefixoNumero: 'MOC', prazoTramitacao: 30 }, update: {} }),
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-req' },
      create: { id: 'tm-rns-req', casaId: casa.id, nome: 'Requerimento', sigla: 'REQ', prefixoNumero: 'REQ', prazoTramitacao: 15 }, update: {} }),
    prisma.tipoMateria.upsert({ where: { id: 'tm-rns-ind' },
      create: { id: 'tm-rns-ind', casaId: casa.id, nome: 'Indicação', sigla: 'IND', prefixoNumero: 'IND', prazoTramitacao: 15 }, update: {} }),
  ])
  console.log('✅ Tipos de matéria criados')

  // ── 5. Usuários com credenciais ────────────────────────────────
  const criarUsuarioComCredencial = async (dados: {
    id: string
    nome: string
    email: string
    cargo: string
    cpf?: string
    senha: string
    perfisIds: string[]
    precisaTrocar?: boolean
  }) => {
    const senhaHash = await bcrypt.hash(dados.senha, 12)

    const usuario = await prisma.usuario.upsert({
      where: { id: dados.id },
      create: {
        id:       dados.id,
        casaId:   casa.id,
        nome:     dados.nome,
        email:    dados.email,
        cargo:    dados.cargo,
        cpf:      dados.cpf,
        ativo:    true,
      },
      update: { nome: dados.nome, email: dados.email, cargo: dados.cargo },
    })

    await prisma.credencialUsuario.upsert({
      where: { usuarioId: usuario.id },
      create: {
        usuarioId:     usuario.id,
        senhaHash,
        precisaTrocar: dados.precisaTrocar ?? false,
      },
      update: { senhaHash, precisaTrocar: dados.precisaTrocar ?? false },
    })

    for (const perfilId of dados.perfisIds) {
      await prisma.usuarioPerfil.upsert({
        where: { usuarioId_perfilId: { usuarioId: usuario.id, perfilId } },
        create: { usuarioId: usuario.id, perfilId },
        update: {},
      }).catch(() => {})
    }

    return usuario
  }

  const usuarios = await Promise.all([
    criarUsuarioComCredencial({
      id:      'usr-rns-admin',
      nome:    'Administrador do Sistema',
      email:   'admin@camararionovosul.es.gov.br',
      cargo:   'Administrador de TI',
      senha:   'RioNovo@2024!',
      perfisIds: ['perfil-admin'],
    }),
    criarUsuarioComCredencial({
      id:      'usr-rns-secretaria',
      nome:    'Dra. Maria das Graças Ferreira',
      email:   'secretaria@camararionovosul.es.gov.br',
      cargo:   'Secretária Legislativa',
      cpf:     '123.456.789-00',
      senha:   'Secretaria@2024!',
      perfisIds: ['perfil-secretario'],
    }),
    criarUsuarioComCredencial({
      id:      'usr-rns-ver1',
      nome:    'Ver. João Carlos Pereira',
      email:   'joao.pereira@camararionovosul.es.gov.br',
      cargo:   'Vereador',
      cpf:     '234.567.890-11',
      senha:   'Vereador@2024!',
      perfisIds: ['perfil-vereador'],
    }),
    criarUsuarioComCredencial({
      id:      'usr-rns-ver2',
      nome:    'Ver. Ana Lúcia Santos',
      email:   'ana.santos@camararionovosul.es.gov.br',
      cargo:   'Vereadora / Presidente',
      cpf:     '345.678.901-22',
      senha:   'Vereador@2024!',
      perfisIds: ['perfil-vereador'],
    }),
    criarUsuarioComCredencial({
      id:      'usr-rns-juridico',
      nome:    'Dr. Carlos Eduardo Melo',
      email:   'juridico@camararionovosul.es.gov.br',
      cargo:   'Assessor Jurídico',
      cpf:     '456.789.012-33',
      senha:   'Juridico@2024!',
      perfisIds: ['perfil-juridico'],
    }),
  ])
  console.log(`✅ ${usuarios.length} usuários criados com credenciais`)

  // ── 6. Proposições de exemplo ──────────────────────────────────
  await prisma.proposicao.upsert({
    where: { numero: 'PL-001/2024' },
    create: {
      casaId:        casa.id,
      numero:        'PL-001/2024',
      ano:           2024,
      tipoMateriaId: 'tm-rns-pl',
      autorId:       'usr-rns-ver1',
      ementa:        'Institui o Programa de Apoio aos Agricultores Familiares do Município de Rio Novo do Sul e dá outras providências.',
      origem:        'VEREADOR',
      regime:        'ORDINARIO',
      status:        'EM_COMISSAO',
      palavrasChave: ['agricultura familiar', 'apoio', 'produção rural'],
      orgaoDestinoId: 'org-rns-cji',
      protocoladoEm: new Date('2024-03-15'),
    },
    update: {},
  })

  await prisma.proposicao.upsert({
    where: { numero: 'MOC-001/2024' },
    create: {
      casaId:        casa.id,
      numero:        'MOC-001/2024',
      ano:           2024,
      tipoMateriaId: 'tm-rns-moc',
      autorId:       'usr-rns-ver2',
      ementa:        'Moção de Congratulações ao time feminino de vôlei de Rio Novo do Sul pelo título estadual.',
      origem:        'VEREADOR',
      regime:        'SUMARIO',
      status:        'APROVADO',
      palavrasChave: ['esporte', 'parabéns', 'vôlei'],
      protocoladoEm: new Date('2024-04-01'),
    },
    update: {},
  })

  // ── 7. Sessão de exemplo ───────────────────────────────────────
  await prisma.sessaoLegislativa.upsert({
    where: { id: 'sessao-rns-001-2024' },
    create: {
      id:        'sessao-rns-001-2024',
      casaId:    casa.id,
      numero:    '001/2024',
      tipo:      'ORDINARIA',
      data:      new Date('2024-04-22T19:00:00-03:00'),
      horaInicio: '19h00',
      local:     'Plenário Vereador Antônio Rangel',
      status:    'AGENDADA',
      quorumMinimo: 5,
    },
    update: {},
  })

  console.log('✅ Proposições e sessão de exemplo criadas')

  // ── Resumo ─────────────────────────────────────────────────────
  console.log('')
  console.log('═'.repeat(55))
  console.log('✅ Seed concluído com sucesso!')
  console.log('')
  console.log('📍 Câmara: Rio Novo do Sul - ES')
  console.log('')
  console.log('🔑 Logins disponíveis:')
  console.log('')
  console.log('  ADMINISTRADOR:')
  console.log('  Email: admin@camararionovosul.es.gov.br')
  console.log('  Senha: RioNovo@2024!')
  console.log('')
  console.log('  SECRETÁRIA LEGISLATIVA:')
  console.log('  Email: secretaria@camararionovosul.es.gov.br')
  console.log('  Senha: Secretaria@2024!')
  console.log('')
  console.log('  VEREADOR:')
  console.log('  Email: joao.pereira@camararionovosul.es.gov.br')
  console.log('  Senha: Vereador@2024!')
  console.log('')
  console.log('  ASSESSOR JURÍDICO:')
  console.log('  Email: juridico@camararionovosul.es.gov.br')
  console.log('  Senha: Juridico@2024!')
  console.log('═'.repeat(55))
}

main()
  .catch(err => { console.error('❌ Erro no seed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
