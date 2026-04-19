import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando proposições reais para Rio Novo do Sul...')

  const casa = await prisma.casaLegislativa.findUnique({ where: { sigla: 'CMRNS' } })
  if (!casa) throw new Error('Câmara CMRNS não encontrada')

  const tipos = await prisma.tipoMateria.findMany({ where: { casaId: casa.id } })
  const orgaos = await prisma.orgao.findMany({ where: { casaId: casa.id } })
  const usuarios = await prisma.usuario.findMany({ where: { casaId: casa.id } })

  const getTipo  = (sigla: string) => tipos.find(t => t.sigla === sigla)!
  const getOrgao = (sigla: string) => orgaos.find(o => o.sigla === sigla)!
  const getUser  = (idx: number)   => usuarios[idx % usuarios.length]

  const proposicoes = [
    {
      numero: 'PL-024/2024', ano: 2024, tipo: 'PL', orgao: 'CJIP', autor: 2,
      ementa: 'Programa Municipal de Incentivo à Energia Solar Fotovoltaica e dá outras providências.',
      status: 'EM_COMISSAO', regime: 'ORDINARIO',
      palavrasChave: ['energia solar', 'sustentabilidade', 'incentivo fiscal'],
    },
    {
      numero: 'REQ-031/2024', ano: 2024, tipo: 'REQ', orgao: 'PROTO', autor: 3,
      ementa: 'Requerimento de informações sobre o Contrato 12/2023 da Prefeitura Municipal.',
      status: 'PROTOCOLADO', regime: 'ORDINARIO',
      palavrasChave: ['contrato', 'transparência', 'fiscalização'],
    },
    {
      numero: 'MOC-008/2024', ano: 2024, tipo: 'MOC', orgao: 'SEC', autor: 2,
      ementa: 'Moção de apoio ao Projeto de Lei Estadual de Regularização Fundiária do município.',
      status: 'EM_PAUTA', regime: 'ORDINARIO',
      palavrasChave: ['moção', 'apoio', 'regularização fundiária'],
    },
    {
      numero: 'PL-019/2024', ano: 2024, tipo: 'PL', orgao: 'PLN', autor: 3,
      ementa: 'Dispõe sobre o programa de combate ao desperdício de alimentos nos estabelecimentos municipais.',
      status: 'APROVADO', regime: 'ORDINARIO',
      palavrasChave: ['alimentos', 'desperdício', 'programa social'],
    },
    {
      numero: 'PDL-003/2024', ano: 2024, tipo: 'PLC', orgao: 'JUR', autor: 2,
      ementa: 'Concede título de Cidadão Honorário ao Sr. Carlos Roberto Menezes pela contribuição cultural.',
      status: 'AGUARDANDO_PARECER_JURIDICO', regime: 'ORDINARIO',
      palavrasChave: ['título honorário', 'cultura'],
    },
    {
      numero: 'PL-017/2024', ano: 2024, tipo: 'PL', orgao: 'CJIP', autor: 2,
      ementa: 'Institui o Programa Municipal de Saúde Mental para servidores e dependentes.',
      status: 'EM_COMISSAO', regime: 'URGENTE',
      palavrasChave: ['saúde mental', 'servidores', 'urgente'],
    },
    {
      numero: 'IND-014/2024', ano: 2024, tipo: 'IND', orgao: 'SEC', autor: 3,
      ementa: 'Indica ao executivo municipal a revitalização da praça central do bairro Jardim São Paulo.',
      status: 'EM_ANALISE', regime: 'ORDINARIO',
      palavrasChave: ['indicação', 'praça', 'bairro'],
    },
    {
      numero: 'PL-012/2024', ano: 2024, tipo: 'PL', orgao: 'CFO', autor: 2,
      ementa: 'Dispõe sobre a criação do conselho municipal de cultura e patrimônio histórico.',
      status: 'REJEITADO', regime: 'ORDINARIO',
      palavrasChave: ['conselho', 'cultura', 'patrimônio histórico'],
    },
  ]

  let criadas = 0
  for (const p of proposicoes) {
    try {
      const tipoMateria = getTipo(p.tipo)
      const orgaoDestino = p.orgao ? getOrgao(p.orgao) : null
      const autor = getUser(p.autor)
      if (!tipoMateria || !autor) continue

      await prisma.proposicao.upsert({
        where: { numero: p.numero },
        create: {
          casaId:         casa.id,
          numero:         p.numero,
          ano:            p.ano,
          tipoMateriaId:  tipoMateria.id,
          autorId:        autor.id,
          ementa:         p.ementa,
          origem:         'VEREADOR' as any,
          regime:         p.regime as any,
          status:         p.status as any,
          palavrasChave:  p.palavrasChave,
          orgaoDestinoId: orgaoDestino?.id,
          protocoladoEm:  new Date(2024, Math.floor(Math.random()*10) + 1, Math.floor(Math.random()*28) + 1),
        },
        update: {
          ementa: p.ementa, status: p.status as any, regime: p.regime as any,
          orgaoDestinoId: orgaoDestino?.id,
        },
      })
      criadas++
    } catch (err) {
      console.error(`Erro em ${p.numero}:`, err)
    }
  }

  console.log(`✅ ${criadas} proposições criadas/atualizadas`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
