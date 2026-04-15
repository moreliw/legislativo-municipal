import { FastifyInstance, FastifyRequest } from 'fastify'

// Definição completa dos menus com permissões necessárias
const MENU_TREE = [
  {
    id: 'dashboard',
    label: 'Painel',
    href: '/dashboard',
    icon: 'home',
    ordem: 1,
    permissao: null, // sempre visível para logados
  },
  {
    id: 'proposicoes',
    label: 'Proposições',
    href: '/proposicoes',
    icon: 'doc',
    ordem: 2,
    permissao: 'proposicoes:ler',
  },
  {
    id: 'sessoes',
    label: 'Sessões',
    href: '/sessoes',
    icon: 'calendar',
    ordem: 3,
    permissao: 'sessoes:ler',
  },
  {
    id: 'documentos',
    label: 'Documentos',
    href: '/documentos',
    icon: 'folder',
    ordem: 4,
    permissao: 'documentos:ler',
  },
  {
    id: 'processos',
    label: 'Processos',
    href: '/processos',
    icon: 'proc',
    ordem: 5,
    permissao: 'processos:ler',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    href: '/relatorios',
    icon: 'chart',
    ordem: 6,
    permissao: 'relatorios:ler',
  },
  {
    id: 'notificacoes',
    label: 'Notificações',
    href: '/notificacoes',
    icon: 'bell',
    ordem: 7,
    permissao: null,
  },
  // Seção Administração
  {
    id: 'admin-usuarios',
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: 'users',
    secao: 'admin',
    ordem: 10,
    permissao: 'usuarios:ler',
  },
  {
    id: 'admin-configuracoes',
    label: 'Configurações',
    href: '/admin/configuracoes',
    icon: 'gear',
    secao: 'admin',
    ordem: 11,
    permissao: 'admin:configuracoes',
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    href: '/auditoria',
    icon: 'shield',
    secao: 'admin',
    ordem: 12,
    permissao: 'auditoria:ler',
  },
  {
    id: 'portal',
    label: 'Portal Público',
    href: '/portal',
    icon: 'globe',
    secao: 'admin',
    ordem: 13,
    permissao: null,
  },
  // Seção Sistema (apenas superadmin)
  {
    id: 'sistema',
    label: 'Administração Geral',
    href: '/sistema',
    icon: 'sistema',
    secao: 'sistema',
    ordem: 20,
    permissao: 'sistema:*',
  },
]

function checarPermissao(permissoes: string[], requerida: string | null): boolean {
  if (!requerida) return true
  if (permissoes.includes('*:*')) return true
  if (permissoes.includes(requerida)) return true
  const [modulo, acao] = requerida.split(':')
  return permissoes.some(p => {
    const [pm, pa] = p.split(':')
    return (pm === '*' || pm === modulo) && (pa === '*' || pa === acao)
  })
}

export async function menusRoutes(app: FastifyInstance) {
  // GET /api/v1/menus — retorna menus filtrados pelas permissões do usuário
  app.get('/', async (req: FastifyRequest) => {
    const user = (req as any).user
    if (!user) return { menus: [], secoes: {} }

    const { permissoes, casaId } = user
    const isSuperAdmin = casaId === 'sistema' || permissoes.includes('sistema:*')

    const menusVisiveis = MENU_TREE.filter(m => {
      // Menus do sistema só para superadmin
      if (m.secao === 'sistema') return isSuperAdmin
      return checarPermissao(permissoes, m.permissao)
    })

    return {
      menus: menusVisiveis,
      isSuperAdmin,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        casaId: user.casaId,
        perfis: user.perfis,
      },
    }
  })
}
