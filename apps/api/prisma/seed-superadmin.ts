import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Criando Superadmin do Sistema...')

  // Casa especial: Sistema (não é uma câmara municipal real)
  const casaSistema = await prisma.casaLegislativa.upsert({
    where: { sigla: 'SISTEMA' },
    create: {
      id:        'sistema',
      nome:      'Administração do Sistema',
      sigla:     'SISTEMA',
      cnpj:      '00.000.000/0000-00',
      municipio: 'Sistema',
      uf:        'BR',
      configuracoes: { superadmin: true },
      ativo: true,
    },
    update: {},
  })

  // Perfil superadmin
  const perfilSuper = await prisma.perfil.upsert({
    where: { casaId_nome: { casaId: 'sistema', nome: 'SUPERADMIN' } },
    create: {
      casaId:     'sistema',
      nome:       'SUPERADMIN',
      descricao:  'Administrador geral do sistema',
      permissoes: ['*:*', 'sistema:*', 'casas:criar', 'casas:editar', 'casas:deletar'],
    },
    update: {},
  })

  // Usuário superadmin
  const hash = await bcrypt.hash('Admin@Sistema2024!', 12)
  const super_user = await prisma.usuario.upsert({
    where: { id: 'superadmin' },
    create: {
      id:      'superadmin',
      casaId:  'sistema',
      nome:    'Administrador Geral',
      email:   'admin@legislativo.sistema.gov.br',
      cargo:   'Superadministrador',
      ativo:   true,
    },
    update: {},
  })

  await prisma.credencialUsuario.upsert({
    where: { usuarioId: 'superadmin' },
    create: { usuarioId: 'superadmin', senhaHash: hash, precisaTrocar: false },
    update: { senhaHash: hash },
  })

  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfilId: { usuarioId: 'superadmin', perfilId: perfilSuper.id } },
    create: { usuarioId: 'superadmin', perfilId: perfilSuper.id },
    update: {},
  })

  console.log('')
  console.log('✅ Superadmin criado!')
  console.log('')
  console.log('🔑 LOGIN SUPERADMIN:')
  console.log('   Email: admin@legislativo.sistema.gov.br')
  console.log('   Senha: Admin@Sistema2024!')
  console.log('')
  console.log('⚠️  ATENÇÃO: Troque a senha após o primeiro acesso!')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
