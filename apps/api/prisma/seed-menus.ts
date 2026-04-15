import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MENUS = [
  // ── Menus principais (visíveis por todos os usuários logados) ──
  {
    codigo: 'dashboard',
    label: 'Painel',
    href: '/dashboard',
    icon: 'home',
    secao: null,
    ordem: 1,
    permissao: null,
    descricao: 'Visão geral do sistema',
  },
  {
    codigo: 'proposicoes',
    label: 'Proposições',
    href: '/proposicoes',
    icon: 'doc',
    secao: null,
    ordem: 2,
    permissao: 'proposicoes:ler',
    descricao: 'Projetos de lei, moções, requerimentos e outras matérias',
  },
  {
    codigo: 'sessoes',
    label: 'Sessões',
    href: '/sessoes',
    icon: 'calendar',
    secao: null,
    ordem: 3,
    permissao: 'sessoes:ler',
    descricao: 'Sessões legislativas, pauta e atas',
  },
  {
    codigo: 'documentos',
    label: 'Documentos',
    href: '/documentos',
    icon: 'folder',
    secao: null,
    ordem: 4,
    permissao: 'documentos:ler',
    descricao: 'Gestão de documentos e arquivos digitais',
  },
  {
    codigo: 'processos',
    label: 'Processos',
    href: '/processos',
    icon: 'proc',
    secao: null,
    ordem: 5,
    permissao: 'processos:ler',
    descricao: 'Motor de processos BPM com Camunda',
  },
  {
    codigo: 'relatorios',
    label: 'Relatórios',
    href: '/relatorios',
    icon: 'chart',
    secao: null,
    ordem: 6,
    permissao: 'relatorios:ler',
    descricao: 'Relatórios gerenciais e estatísticas legislativas',
  },
  {
    codigo: 'notificacoes',
    label: 'Notificações',
    href: '/notificacoes',
    icon: 'bell',
    secao: null,
    ordem: 7,
    permissao: null,
    descricao: 'Central de alertas e notificações',
  },
  {
    codigo: 'tramitacao',
    label: 'Tramitação',
    href: '/tramitacao',
    icon: 'flow',
    secao: null,
    ordem: 8,
    permissao: 'tramitacao:ler',
    descricao: 'Histórico e eventos de tramitação',
  },
  {
    codigo: 'portal',
    label: 'Portal Público',
    href: '/portal',
    icon: 'globe',
    secao: null,
    ordem: 9,
    permissao: null,
    descricao: 'Portal de transparência legislativa',
  },

  // ── Seção Administração (requer permissões específicas) ────────
  {
    codigo: 'admin-usuarios',
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: 'users',
    secao: 'admin',
    ordem: 10,
    permissao: 'usuarios:ler',
    descricao: 'Gestão de usuários da câmara',
  },
  {
    codigo: 'admin-perfis',
    label: 'Perfis e Permissões',
    href: '/admin/perfis',
    icon: 'shield',
    secao: 'admin',
    ordem: 11,
    permissao: 'usuarios:ler',
    descricao: 'Controle de perfis e permissões de acesso',
  },
  {
    codigo: 'admin-orgaos',
    label: 'Órgãos',
    href: '/admin/orgaos',
    icon: 'building',
    secao: 'admin',
    ordem: 12,
    permissao: 'admin:configuracoes',
    descricao: 'Comissões, plenário e órgãos internos',
  },
  {
    codigo: 'admin-tipos-materia',
    label: 'Tipos de Matéria',
    href: '/admin/tipos-materia',
    icon: 'tag',
    secao: 'admin',
    ordem: 13,
    permissao: 'admin:configuracoes',
    descricao: 'Configuração de tipos de proposição',
  },
  {
    codigo: 'admin-configuracoes',
    label: 'Configurações',
    href: '/admin/configuracoes',
    icon: 'gear',
    secao: 'admin',
    ordem: 14,
    permissao: 'admin:configuracoes',
    descricao: 'Configurações gerais da câmara',
  },
  {
    codigo: 'admin-fluxos',
    label: 'Fluxos BPM',
    href: '/admin/fluxos',
    icon: 'flow',
    secao: 'admin',
    ordem: 15,
    permissao: 'admin:configuracoes',
    descricao: 'Configuração de fluxos de tramitação',
  },
  {
    codigo: 'auditoria',
    label: 'Auditoria',
    href: '/auditoria',
    icon: 'shield-check',
    secao: 'admin',
    ordem: 16,
    permissao: 'auditoria:ler',
    descricao: 'Trilha de auditoria e logs de segurança',
  },
  {
    codigo: 'exportacao',
    label: 'Exportação',
    href: '/exportacao',
    icon: 'download',
    secao: 'admin',
    ordem: 17,
    permissao: 'relatorios:ler',
    descricao: 'Exportar dados em CSV, PDF e Excel',
  },

  // ── Seção Sistema (APENAS Superadmin) ─────────────────────────
  {
    codigo: 'sistema-casas',
    label: 'Câmaras Municipais',
    href: '/sistema',
    icon: 'sistema',
    secao: 'sistema',
    ordem: 20,
    permissao: 'sistema:*',
    descricao: 'Gerenciar câmaras municipais cadastradas',
  },
  {
    codigo: 'sistema-usuarios',
    label: 'Todos os Usuários',
    href: '/sistema/usuarios',
    icon: 'users',
    secao: 'sistema',
    ordem: 21,
    permissao: 'sistema:*',
    descricao: 'Visão global de todos os usuários do sistema',
  },
  {
    codigo: 'sistema-logs',
    label: 'Logs do Sistema',
    href: '/sistema/logs',
    icon: 'terminal',
    secao: 'sistema',
    ordem: 22,
    permissao: 'sistema:*',
    descricao: 'Logs de autenticação e eventos do sistema',
  },
  {
    codigo: 'sistema-configuracoes',
    label: 'Config. Global',
    href: '/sistema/configuracoes',
    icon: 'gear',
    secao: 'sistema',
    ordem: 23,
    permissao: 'sistema:*',
    descricao: 'Configurações globais da plataforma',
  },
]

async function main() {
  console.log('🌱 Populando tabela de menus...')
  console.log('═'.repeat(55))

  let criados = 0, atualizados = 0

  for (const menu of MENUS) {
    const existing = await prisma.menu.findUnique({ where: { codigo: menu.codigo } })
    if (existing) {
      await prisma.menu.update({ where: { codigo: menu.codigo }, data: menu })
      atualizados++
    } else {
      await prisma.menu.create({ data: menu })
      criados++
    }
  }

  console.log(`✅ ${criados} menus criados, ${atualizados} atualizados`)
  console.log(`📊 Total: ${MENUS.length} menus no banco`)
  console.log('')
  console.log('Seções:')
  console.log(`  • Principal (null): ${MENUS.filter(m => !m.secao).length} menus`)
  console.log(`  • Administração:    ${MENUS.filter(m => m.secao === 'admin').length} menus`)
  console.log(`  • Sistema:          ${MENUS.filter(m => m.secao === 'sistema').length} menus`)
  console.log('═'.repeat(55))
}

main()
  .catch(err => { console.error('❌ Erro:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
