import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ── Casa Legislativa ─────────────────────────────────────────────
  const casa = await prisma.casaLegislativa.upsert({
    where: { sigla: 'CMSF' },
    create: {
      nome: 'Câmara Municipal de São Francisco',
      sigla: 'CMSF',
      cnpj: '12.345.678/0001-90',
      municipio: 'São Francisco',
      uf: 'MG',
      site: 'https://camarasaofrancisco.mg.gov.br',
      email: 'contato@camarasaofrancisco.mg.gov.br',
      configuracoes: {
        totalVereadores: 11,
        quorumMaioriaSimplesMin: 6,
        quorumMaioriaAbsolutaMin: 9,
        legislatura: '2021-2024',
        regimentoInterno: 'RI-2021',
      },
    },
    update: {},
  })

  console.log('✅ Casa legislativa criada:', casa.nome)

  // ── Órgãos ────────────────────────────────────────────────────────
  const orgaos = await Promise.all([
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PRO' } },
      create: { casaId: casa.id, nome: 'Protocolo Geral', sigla: 'PRO', tipo: 'PROTOCOLO' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'SEC' } },
      create: { casaId: casa.id, nome: 'Secretaria Legislativa', sigla: 'SEC', tipo: 'SECRETARIA' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PJU' } },
      create: { casaId: casa.id, nome: 'Procuradoria Jurídica', sigla: 'PJU', tipo: 'PROCURADORIA' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PRE' } },
      create: { casaId: casa.id, nome: 'Presidência', sigla: 'PRE', tipo: 'PRESIDENCIA' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PLN' } },
      create: { casaId: casa.id, nome: 'Plenário', sigla: 'PLN', tipo: 'PLENARIO' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CJL' } },
      create: { casaId: casa.id, nome: 'Comissão de Constituição e Justiça', sigla: 'CJL', tipo: 'COMISSAO_PERMANENTE' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CFO' } },
      create: { casaId: casa.id, nome: 'Comissão de Finanças e Orçamento', sigla: 'CFO', tipo: 'COMISSAO_PERMANENTE' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CMA' } },
      create: { casaId: casa.id, nome: 'Comissão de Meio Ambiente', sigla: 'CMA', tipo: 'COMISSAO_PERMANENTE' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'CON' } },
      create: { casaId: casa.id, nome: 'Controladoria Interna', sigla: 'CON', tipo: 'CONTROLADORIA' },
      update: {},
    }),
    prisma.orgao.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PUB' } },
      create: { casaId: casa.id, nome: 'Seção de Publicação', sigla: 'PUB', tipo: 'PUBLICACAO' },
      update: {},
    }),
  ])

  console.log(`✅ ${orgaos.length} órgãos criados`)

  // ── Perfis de Acesso ───────────────────────────────────────────────
  const perfis = await Promise.all([
    prisma.perfil.upsert({
      where: { nome: 'ADMINISTRADOR' },
      create: {
        nome: 'ADMINISTRADOR',
        descricao: 'Acesso total ao sistema',
        permissoes: ['*:*'],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'GESTOR_LEGISLATIVO' },
      create: {
        nome: 'GESTOR_LEGISLATIVO',
        descricao: 'Gestor da tramitação legislativa',
        permissoes: [
          'proposicoes:listar', 'proposicoes:criar', 'proposicoes:editar',
          'proposicoes:protocolar', 'tramitacao:encaminhar', 'tramitacao:devolver',
          'tramitacao:arquivar', 'documentos:criar', 'documentos:assinar',
          'sessoes:listar', 'sessoes:criar', 'relatorios:exportar',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'PROTOCOLO' },
      create: {
        nome: 'PROTOCOLO',
        descricao: 'Setor de protocolo e entrada de documentos',
        permissoes: [
          'proposicoes:listar', 'proposicoes:criar', 'proposicoes:protocolar',
          'documentos:listar', 'documentos:criar',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'VEREADOR' },
      create: {
        nome: 'VEREADOR',
        descricao: 'Vereador — acesso à suas proposições e votações',
        permissoes: [
          'proposicoes:listar', 'proposicoes:criar_proprio',
          'sessoes:listar', 'sessoes:votar', 'documentos:listar',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'PROCURADORIA' },
      create: {
        nome: 'PROCURADORIA',
        descricao: 'Procuradoria Jurídica — pareceres e análises',
        permissoes: [
          'proposicoes:listar', 'tramitacao:parecer_juridico',
          'documentos:criar', 'documentos:assinar',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'COMISSAO' },
      create: {
        nome: 'COMISSAO',
        descricao: 'Membro de Comissão Permanente',
        permissoes: [
          'proposicoes:listar', 'tramitacao:parecer_comissao',
          'documentos:criar', 'documentos:assinar', 'sessoes:listar',
        ],
      },
      update: {},
    }),
    prisma.perfil.upsert({
      where: { nome: 'CONSULTA_PUBLICA' },
      create: {
        nome: 'CONSULTA_PUBLICA',
        descricao: 'Acesso somente leitura a documentos públicos',
        permissoes: ['proposicoes:listar_publico', 'documentos:listar_publico'],
      },
      update: {},
    }),
  ])

  console.log(`✅ ${perfis.length} perfis de acesso criados`)

  // ── Tipos de Matéria ───────────────────────────────────────────────
  const tiposMateria = await Promise.all([
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PL' } },
      create: {
        casaId: casa.id, nome: 'Projeto de Lei', sigla: 'PL', prefixoNumero: 'PL',
        exigeParecerJuridico: true, exigeComissao: true, prazoTramitacao: 40,
      },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PDL' } },
      create: {
        casaId: casa.id, nome: 'Projeto de Decreto Legislativo', sigla: 'PDL', prefixoNumero: 'PDL',
        exigeParecerJuridico: true, exigeComissao: true, prazoTramitacao: 30,
      },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'PRL' } },
      create: {
        casaId: casa.id, nome: 'Projeto de Resolução', sigla: 'PRL', prefixoNumero: 'PRL',
        exigeParecerJuridico: true, exigeComissao: false, prazoTramitacao: 20,
      },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'MOC' } },
      create: {
        casaId: casa.id, nome: 'Moção', sigla: 'MOC', prefixoNumero: 'MOC',
        exigeParecerJuridico: false, exigeComissao: false, prazoTramitacao: 15,
      },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'REQ' } },
      create: {
        casaId: casa.id, nome: 'Requerimento', sigla: 'REQ', prefixoNumero: 'REQ',
        exigeParecerJuridico: false, exigeComissao: false, prazoTramitacao: 10,
      },
      update: {},
    }),
    prisma.tipoMateria.upsert({
      where: { casaId_sigla: { casaId: casa.id, sigla: 'IND' } },
      create: {
        casaId: casa.id, nome: 'Indicação', sigla: 'IND', prefixoNumero: 'IND',
        exigeParecerJuridico: false, exigeComissao: false, prazoTramitacao: 10,
      },
      update: {},
    }),
  ])

  console.log(`✅ ${tiposMateria.length} tipos de matéria criados`)

  // ── Regras Padrão ──────────────────────────────────────────────────
  const tiposPL = tiposMateria.find(t => t.sigla === 'PL')!
  
  await prisma.regra.createMany({
    skipDuplicates: true,
    data: [
      {
        tipoMateriaId: tiposPL.id,
        nome: 'PL exige parecer jurídico',
        descricao: 'Todo Projeto de Lei deve passar pela Procuradoria antes da comissão',
        tipo: 'ROTEAMENTO',
        condicoes: { tipoMateria: 'PL', regime: 'ORDINARIO' },
        acoes: { encaminharPara: 'PJU', statusNovo: 'AGUARDANDO_PARECER_JURIDICO' },
        prioridade: 10,
      },
      {
        nome: 'Prazo mínimo entre encaminhamentos',
        descricao: 'Intervalo mínimo de 24h entre encaminhamentos sequenciais',
        tipo: 'PRAZO',
        condicoes: { tiposEvento: ['ENCAMINHAMENTO'] },
        acoes: { prazoMinimoHoras: 24 },
        prioridade: 5,
      },
      {
        nome: 'Votação exige quórum simples',
        descricao: 'Sessão de votação deve ter ao menos maioria simples dos vereadores',
        tipo: 'QUORUM',
        condicoes: { tiposSessao: ['VOTACAO'] },
        acoes: { quorumMinimo: 6, totalVereadores: 11 },
        prioridade: 20,
      },
    ],
  })

  console.log('✅ Regras padrão criadas')
  console.log('\n🎉 Seed concluído com sucesso!')
  console.log(`\n📍 Casa: ${casa.nome} (${casa.sigla})`)
  console.log(`   Órgãos: ${orgaos.length}`)
  console.log(`   Perfis: ${perfis.length}`)
  console.log(`   Tipos de matéria: ${tiposMateria.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
