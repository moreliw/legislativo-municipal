/**
 * Seed de demonstração — dados realistas para uma câmara municipal
 * Inclui: proposições, tramitações, sessões, documentos e usuários de exemplo
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDemoData() {
  console.log('\n🎭 Criando dados de demonstração...')

  // Buscar casa e estrutura base já criada pelo seed principal
  const casa = await prisma.casaLegislativa.findFirst()
  if (!casa) {
    console.log('❌ Execute o seed principal primeiro: pnpm db:seed')
    return
  }

  const orgaos = await prisma.orgao.findMany({ where: { casaId: casa.id } })
  const orgaoMap = Object.fromEntries(orgaos.map(o => [o.sigla, o]))

  const tiposMateria = await prisma.tipoMateria.findMany({ where: { casaId: casa.id } })
  const tipoMap = Object.fromEntries(tiposMateria.map(t => [t.sigla, t]))

  // ── Usuários de demonstração ─────────────────────────────────────
  const usuarios = await prisma.$transaction([
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-carlos-001' },
      create: { casaId: casa.id, keycloakId: 'demo-carlos-001', nome: 'Carlos Eduardo Lima', email: 'carlos@camarasf.gov.br', cargo: 'Secretário Legislativo', matricula: 'SRV-001' },
      update: {},
    }),
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-ana-001' },
      create: { casaId: casa.id, keycloakId: 'demo-ana-001', nome: 'Ana Beatriz Santos', email: 'ana@camarasf.gov.br', cargo: 'Chefe de Protocolo', matricula: 'SRV-002' },
      update: {},
    }),
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-fernanda-001' },
      create: { casaId: casa.id, keycloakId: 'demo-fernanda-001', nome: 'Dra. Fernanda Rocha', email: 'fernanda@camarasf.gov.br', cargo: 'Procuradora Jurídica', matricula: 'SRV-003' },
      update: {},
    }),
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-marcos-001' },
      create: { casaId: casa.id, keycloakId: 'demo-marcos-001', nome: 'Ver. Marcos Oliveira', email: 'marcos.oliveira@camarasf.gov.br', cargo: 'Vereador', matricula: 'VER-001' },
      update: {},
    }),
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-patricia-001' },
      create: { casaId: casa.id, keycloakId: 'demo-patricia-001', nome: 'Ver. Patricia Alves', email: 'patricia.alves@camarasf.gov.br', cargo: 'Vereadora', matricula: 'VER-006' },
      update: {},
    }),
    prisma.usuario.upsert({
      where: { keycloakId: 'demo-ana-lima-001' },
      create: { casaId: casa.id, keycloakId: 'demo-ana-lima-001', nome: 'Ver. Ana Lima', email: 'ana.lima@camarasf.gov.br', cargo: 'Vereadora', matricula: 'VER-004' },
      update: {},
    }),
  ])

  const [carlos, ana, fernanda, marcos, patricia, anaLima] = usuarios
  console.log(`  ✅ ${usuarios.length} usuários de demonstração criados`)

  // ── Proposição 1: Em comissão ────────────────────────────────────
  const pl024 = await prisma.proposicao.upsert({
    where: { numero: 'PL-024/2024' },
    create: {
      casaId: casa.id,
      numero: 'PL-024/2024',
      ano: 2024,
      tipoMateriaId: tipoMap['PL'].id,
      autorId: marcos.id,
      ementa: 'Dispõe sobre a criação do Programa Municipal de Incentivo à Energia Solar Fotovoltaica e dá outras providências.',
      textoCompleto: `Art. 1º Fica criado o Programa Municipal de Incentivo à Energia Solar Fotovoltaica no âmbito do Município de São Francisco.

Art. 2º O Programa tem por objetivo:
I - promover o uso de energia solar fotovoltaica nas edificações públicas e privadas;
II - reduzir os custos com energia elétrica nos órgãos da administração municipal;
III - contribuir para a redução das emissões de gases de efeito estufa.

Art. 3º Para os fins previstos nesta Lei, os consumidores pessoas físicas e jurídicas que aderirem ao Programa farão jus a:
I - isenção do ISSQN na prestação de serviços para instalação de sistemas fotovoltaicos;
II - redução de 50% do IPTU pelo prazo de 5 (cinco) anos.

Art. 4º As despesas decorrentes da aplicação desta Lei correrão à conta de dotações orçamentárias próprias.

Art. 5º Esta Lei entra em vigor na data de sua publicação.`,
      origem: 'VEREADOR',
      regime: 'ORDINARIO',
      status: 'EM_COMISSAO',
      orgaoDestinoId: orgaoMap['CMA']?.id,
      palavrasChave: ['energia solar', 'meio ambiente', 'incentivo fiscal', 'sustentabilidade'],
      assunto: 'Política Ambiental e Energética',
      protocoladoEm: new Date('2024-03-10T09:30:00Z'),
    },
    update: { status: 'EM_COMISSAO' },
  })

  // Tramitação completa do PL-024
  const seq = { n: 0 }
  const nextSeq = () => ++seq.n

  await prisma.tramitacaoEvento.createMany({
    skipDuplicates: true,
    data: [
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'PROTOCOLO',
        descricao: 'Proposição protocolada e recebida pelo setor de protocolo da Câmara Municipal',
        statusAntes: 'RASCUNHO',
        statusDepois: 'PROTOCOLADO',
        orgaoOrigemId: orgaoMap['PRO']?.id,
        usuarioId: ana.id,
        observacao: 'Documentação recebida conforme. Tramitação iniciada.',
        dadosAdicionais: { codigoRecibo: 'REC-2024-0310-001' },
        criadoEm: new Date('2024-03-10T09:30:00Z'),
      },
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'DISTRIBUICAO',
        descricao: 'Encaminhado para análise inicial pela Secretaria Legislativa',
        statusAntes: 'PROTOCOLADO',
        statusDepois: 'EM_ANALISE',
        orgaoOrigemId: orgaoMap['PRO']?.id,
        orgaoDestinoId: orgaoMap['SEC']?.id,
        usuarioId: ana.id,
        criadoEm: new Date('2024-03-11T08:00:00Z'),
      },
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'DESPACHO',
        descricao: 'Despacho de análise inicial — documentação conforme. Encaminhado para Procuradoria para parecer jurídico.',
        statusAntes: 'EM_ANALISE',
        statusDepois: 'AGUARDANDO_PARECER_JURIDICO',
        orgaoOrigemId: orgaoMap['SEC']?.id,
        orgaoDestinoId: orgaoMap['PJU']?.id,
        usuarioId: carlos.id,
        observacao: 'Matéria exige análise jurídica conforme Regimento Interno Art. 47.',
        dadosAdicionais: { prazo: '2024-03-28', regrasAplicadas: ['REGRA_PARECER_JURIDICO_PL'] },
        criadoEm: new Date('2024-03-13T10:15:00Z'),
      },
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'PARECER_JURIDICO',
        descricao: 'Parecer jurídico emitido: Favorável com ressalvas sobre o art. 3º',
        statusAntes: 'AGUARDANDO_PARECER_JURIDICO',
        statusDepois: 'EM_ANALISE',
        orgaoOrigemId: orgaoMap['PJU']?.id,
        usuarioId: fernanda.id,
        observacao: 'Favorável com ressalvas. O art. 3° necessita adequação à LC 101/2000 (LRF).',
        dadosAdicionais: { parecer: 'FAVORAVEL_COM_RESSALVAS', numero: 'PAR-JUR-2024-0087' },
        criadoEm: new Date('2024-03-25T16:40:00Z'),
      },
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'ENCAMINHAMENTO',
        descricao: 'Encaminhado para análise da Comissão de Meio Ambiente e Desenvolvimento Sustentável',
        statusAntes: 'EM_ANALISE',
        statusDepois: 'EM_COMISSAO',
        orgaoOrigemId: orgaoMap['SEC']?.id,
        orgaoDestinoId: orgaoMap['CMA']?.id,
        usuarioId: carlos.id,
        observacao: 'Designada comissão competente conforme art. 72 do Regimento.',
        dadosAdicionais: { prazoComissao: '2024-04-27', relator: 'Ver. Patricia Alves' },
        criadoEm: new Date('2024-03-27T09:00:00Z'),
      },
      {
        proposicaoId: pl024.id,
        sequencia: nextSeq(),
        tipo: 'PARECER_COMISSAO',
        descricao: 'Reunião da Comissão de Meio Ambiente — aprovação do parecer favorável ao projeto',
        statusAntes: 'EM_COMISSAO',
        statusDepois: 'EM_COMISSAO',
        orgaoOrigemId: orgaoMap['CMA']?.id,
        usuarioId: patricia.id,
        observacao: 'Parecer aprovado por unanimidade (4 a 0). Relator recomenda aprovação com a emenda apresentada.',
        dadosAdicionais: {
          parecer: 'FAVORAVEL',
          votacaoComissao: { favor: 4, contra: 0, abstencao: 0 },
          emendaApresentada: true,
          numeroAta: 'ATA-CMA-2024-012',
        },
        criadoEm: new Date('2024-04-18T14:30:00Z'),
      },
    ],
  })

  // ── Proposição 2: Aprovada e publicada ───────────────────────────
  const pl019 = await prisma.proposicao.upsert({
    where: { numero: 'PL-019/2024' },
    create: {
      casaId: casa.id,
      numero: 'PL-019/2024',
      ano: 2024,
      tipoMateriaId: tipoMap['PL'].id,
      autorId: anaLima.id,
      ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos nos estabelecimentos comerciais e dá outras providências.',
      origem: 'VEREADOR',
      regime: 'ORDINARIO',
      status: 'PUBLICADO',
      palavrasChave: ['alimentação', 'desperdício', 'sustentabilidade', 'comércio'],
      assunto: 'Segurança Alimentar',
      protocoladoEm: new Date('2024-02-15T10:00:00Z'),
      arquivadoEm: null,
    },
    update: { status: 'PUBLICADO' },
  })

  // ── Sessão legislativa ────────────────────────────────────────────
  await prisma.sessaoLegislativa.upsert({
    where: { id: 'sess-012-2024' },
    create: {
      id: 'sess-012-2024',
      casaId: casa.id,
      numero: '012/2024',
      tipo: 'ORDINARIA',
      data: new Date('2024-04-25T19:00:00Z'),
      horaInicio: '19h00',
      local: 'Plenário Vereador José Santos',
      status: 'AGENDADA',
      quorumMinimo: 6,
    },
    update: {},
  })

  console.log('  ✅ Proposições de demonstração criadas (PL-024/2024, PL-019/2024)')
  console.log('  ✅ Tramitação completa do PL-024/2024 (6 eventos)')
  console.log('  ✅ Sessão 012/2024 agendada')
  console.log('\n🎭 Dados de demonstração prontos!')
  console.log('\nUsuários de demo:')
  console.log('  carlos@camarasf.gov.br — Secretário Legislativo')
  console.log('  fernanda@camarasf.gov.br — Procuradora Jurídica')
  console.log('  marcos.oliveira@camarasf.gov.br — Ver. Marcos Oliveira')
}

seedDemoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
