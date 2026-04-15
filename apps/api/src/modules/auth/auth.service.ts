import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { PrismaClient, TipoEventoAuth, TipoTokenSeguranca } from '@prisma/client'

const prisma = new PrismaClient()

// Configurações de segurança
const BCRYPT_ROUNDS       = 12
const ACCESS_TOKEN_TTL    = 15 * 60           // 15 minutos em segundos
const REFRESH_TOKEN_TTL   = 7 * 24 * 3600     // 7 dias em segundos
const MAX_TENTATIVAS      = 5
const BLOQUEIO_MINUTOS    = 30
const TOKEN_RECUPERACAO_TTL = 2 * 3600         // 2 horas

// ── Tipos ───────────────────────────────────────────────────────────

export interface LoginInput {
  email: string
  senha: string
  ip: string
  userAgent?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number          // segundos até expirar o access token
  usuario: {
    id: string
    nome: string
    email: string
    casaId: string
    casaNome: string
    casaSigla: string
    municipio: string
    uf: string
    perfis: string[]
    permissoes: string[]
    precisaTrocar: boolean
    avatar: string | null
    preferencias: Record<string, unknown> | null
  }
}

// ── Hash utilities ───────────────────────────────────────────────────

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS)
}

export function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function gerarToken(): string {
  return crypto.randomUUID()
}

// ── Login ────────────────────────────────────────────────────────────

export async function realizarLogin(input: LoginInput, assinarJwt: (payload: object, options?: object) => string): Promise<TokenPair> {
  const { email, senha, ip, userAgent } = input

  // 1. Buscar usuário pelo email (case-insensitive)
  const usuario = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, ativo: true },
    include: {
      casa: { select: { id: true, nome: true, sigla: true, municipio: true, uf: true, logo: true } },
      credencial: true,
      perfis: { include: { perfil: { select: { nome: true, permissoes: true } } } },
    },
  })

  // 2. Se não encontrou ou não tem credencial → erro genérico (não revelar o motivo)
  if (!usuario || !usuario.credencial) {
    await registrarEvento({
      tipo: TipoEventoAuth.TENTATIVA_INVALIDA,
      email,
      ip,
      userAgent,
      sucesso: false,
      detalhes: 'Usuário não encontrado',
    })
    throw new AuthError('Credenciais inválidas', 401)
  }

  // 3. Verificar bloqueio temporário por brute-force
  if (usuario.credencial.bloqueadoAte && usuario.credencial.bloqueadoAte > new Date()) {
    const minutosRestantes = Math.ceil(
      (usuario.credencial.bloqueadoAte.getTime() - Date.now()) / 60000
    )
    await registrarEvento({
      tipo: TipoEventoAuth.BLOQUEIO_TEMPORARIO,
      usuarioId: usuario.id,
      casaId: usuario.casaId,
      ip, userAgent, sucesso: false,
      detalhes: `Bloqueado por mais ${minutosRestantes} min`,
    })
    throw new AuthError(`Conta bloqueada temporariamente. Tente novamente em ${minutosRestantes} minutos.`, 429)
  }

  // 4. Verificar senha
  const senhaCorreta = await verificarSenha(senha, usuario.credencial.senhaHash)

  if (!senhaCorreta) {
    const novasTentativas = usuario.credencial.tentativasFalhas + 1
    const deveBloquear = novasTentativas >= MAX_TENTATIVAS

    await prisma.credencialUsuario.update({
      where: { id: usuario.credencial.id },
      data: {
        tentativasFalhas: novasTentativas,
        bloqueadoAte: deveBloquear
          ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000)
          : null,
      },
    })

    await registrarEvento({
      tipo: deveBloquear ? TipoEventoAuth.BLOQUEIO_TEMPORARIO : TipoEventoAuth.TENTATIVA_INVALIDA,
      usuarioId: usuario.id,
      casaId: usuario.casaId,
      ip, userAgent, sucesso: false,
      detalhes: `Tentativa ${novasTentativas}/${MAX_TENTATIVAS}`,
    })

    if (deveBloquear) {
      throw new AuthError(`Muitas tentativas falhas. Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos.`, 429)
    }

    throw new AuthError('Credenciais inválidas', 401)
  }

  // 5. Login bem-sucedido — resetar contador de tentativas
  await prisma.credencialUsuario.update({
    where: { id: usuario.credencial.id },
    data: {
      tentativasFalhas: 0,
      bloqueadoAte: null,
      ultimoLoginEm: new Date(),
      ultimoLoginIp: ip,
    },
  })

  // 6. Construir payload do access token
  const permissoes = new Set<string>()
  const perfisNomes: string[] = []
  for (const up of usuario.perfis) {
    perfisNomes.push(up.perfil.nome)
    for (const perm of up.perfil.permissoes) permissoes.add(perm)
  }

  const jwtPayload = {
    sub:        usuario.id,
    casaId:     usuario.casaId,
    email:      usuario.email,
    nome:       usuario.nome,
    perfis:     perfisNomes,
    permissoes: [...permissoes],
    iat:        Math.floor(Date.now() / 1000),
  }

  const accessToken = assinarJwt(jwtPayload, { expiresIn: `${ACCESS_TOKEN_TTL}s` })

  // 7. Gerar refresh token e salvar hash no banco
  const refreshToken = gerarToken()
  const refreshHash  = hashToken(refreshToken)

  // Limpar sessões expiradas antigas deste usuário
  await prisma.sessaoAuth.deleteMany({
    where: { credencialId: usuario.credencial.id, expiraEm: { lt: new Date() } },
  })

  await prisma.sessaoAuth.create({
    data: {
      credencialId:     usuario.credencial.id,
      refreshTokenHash: refreshHash,
      ip,
      userAgent,
      expiraEm: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    },
  })

  // 8. Registrar evento de login
  await registrarEvento({
    tipo: TipoEventoAuth.LOGIN,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip, userAgent, sucesso: true,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
    usuario: {
      id:            usuario.id,
      nome:          usuario.nome,
      email:         usuario.email,
      casaId:        usuario.casaId,
      casaNome:      usuario.casa.nome,
      casaSigla:     usuario.casa.sigla,
      municipio:     usuario.casa.municipio,
      uf:            usuario.casa.uf,
      perfis:        perfisNomes,
      permissoes:    [...permissoes],
      precisaTrocar: usuario.credencial.precisaTrocar,
      avatar:        usuario.avatar,
      preferencias:  (usuario.preferencias as Record<string, unknown> | null) ?? {},
    },
  }
}

// ── Refresh Token ────────────────────────────────────────────────────

export async function renovarTokens(
  refreshToken: string,
  ip: string,
  userAgent: string | undefined,
  assinarJwt: (payload: object, options?: object) => string
): Promise<{ accessToken: string; expiresIn: number }> {
  const hash = hashToken(refreshToken)

  const sessao = await prisma.sessaoAuth.findUnique({
    where: { refreshTokenHash: hash },
    include: {
      credencial: {
        include: {
          usuario: {
            include: {
              perfis: { include: { perfil: true } },
              casa: { select: { id: true, nome: true, sigla: true } },
            },
          },
        },
      },
    },
  })

  if (!sessao || !sessao.ativo || sessao.expiraEm < new Date()) {
    throw new AuthError('Sessão inválida ou expirada', 401)
  }

  const usuario = sessao.credencial.usuario
  if (!usuario.ativo) throw new AuthError('Usuário inativo', 403)

  // Atualizar último uso da sessão
  await prisma.sessaoAuth.update({
    where: { id: sessao.id },
    data: { ultimoUsoEm: new Date(), ip },
  })

  const permissoes = new Set<string>()
  const perfisNomes: string[] = []
  for (const up of usuario.perfis) {
    perfisNomes.push(up.perfil.nome)
    for (const perm of up.perfil.permissoes) permissoes.add(perm)
  }

  const accessToken = assinarJwt({
    sub:        usuario.id,
    casaId:     usuario.casaId,
    email:      usuario.email,
    nome:       usuario.nome,
    perfis:     perfisNomes,
    permissoes: [...permissoes],
    iat:        Math.floor(Date.now() / 1000),
  }, { expiresIn: `${ACCESS_TOKEN_TTL}s` })

  await registrarEvento({
    tipo: TipoEventoAuth.REFRESH_TOKEN,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip, userAgent, sucesso: true,
  })

  return { accessToken, expiresIn: ACCESS_TOKEN_TTL }
}

// ── Logout ───────────────────────────────────────────────────────────

export async function realizarLogout(
  refreshToken: string,
  usuarioId: string,
  ip: string
): Promise<void> {
  const hash = hashToken(refreshToken)
  await prisma.sessaoAuth.updateMany({
    where: { refreshTokenHash: hash },
    data: { ativo: false },
  })
  await registrarEvento({
    tipo: TipoEventoAuth.LOGOUT,
    usuarioId, ip, sucesso: true,
  })
}

// ── Recuperação de Senha ─────────────────────────────────────────────

export async function solicitarRecuperacaoSenha(email: string, ip: string): Promise<string | null> {
  const usuario = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, ativo: true },
  })

  if (!usuario) {
    // Não revelar que o e-mail não existe (evitar enumeração)
    return null
  }

  // Invalidar tokens anteriores
  await prisma.tokenSeguranca.updateMany({
    where: { usuarioId: usuario.id, tipo: TipoTokenSeguranca.RECUPERACAO_SENHA, usado: false },
    data: { usado: true },
  })

  const token = gerarToken()
  await prisma.tokenSeguranca.create({
    data: {
      usuarioId: usuario.id,
      token,
      tipo: TipoTokenSeguranca.RECUPERACAO_SENHA,
      expiraEm: new Date(Date.now() + TOKEN_RECUPERACAO_TTL * 1000),
      ip,
    },
  })

  await registrarEvento({
    tipo: TipoEventoAuth.RECUPERACAO_SENHA_SOLICITADA,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip, sucesso: true,
  })

  return token
}

export async function concluirRecuperacaoSenha(
  token: string,
  novaSenha: string,
  ip: string
): Promise<void> {
  const registro = await prisma.tokenSeguranca.findUnique({
    where: { token },
    include: { usuario: { include: { credencial: true } } },
  })

  if (!registro || registro.usado || registro.expiraEm < new Date()) {
    throw new AuthError('Token inválido ou expirado', 400)
  }

  if (registro.tipo !== TipoTokenSeguranca.RECUPERACAO_SENHA) {
    throw new AuthError('Tipo de token incorreto', 400)
  }

  if (!registro.usuario.credencial) {
    throw new AuthError('Usuário sem credencial', 400)
  }

  const hash = await hashSenha(novaSenha)

  await prisma.$transaction([
    prisma.credencialUsuario.update({
      where: { id: registro.usuario.credencial.id },
      data: { senhaHash: hash, tentativasFalhas: 0, bloqueadoAte: null, precisaTrocar: false },
    }),
    prisma.tokenSeguranca.update({
      where: { id: registro.id },
      data: { usado: true, usadoEm: new Date() },
    }),
    // Revogar todas as sessões ativas (segurança)
    prisma.sessaoAuth.updateMany({
      where: { credencialId: registro.usuario.credencial.id, ativo: true },
      data: { ativo: false },
    }),
  ])

  await registrarEvento({
    tipo: TipoEventoAuth.RECUPERACAO_SENHA_CONCLUIDA,
    usuarioId: registro.usuarioId,
    casaId: registro.usuario.casaId,
    ip, sucesso: true,
  })
}

// ── Troca de Senha ───────────────────────────────────────────────────

export async function trocarSenha(
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
  ip: string
): Promise<void> {
  const credencial = await prisma.credencialUsuario.findUnique({ where: { usuarioId } })
  if (!credencial) throw new AuthError('Credencial não encontrada', 404)

  const correta = await verificarSenha(senhaAtual, credencial.senhaHash)
  if (!correta) {
    await registrarEvento({
      tipo: TipoEventoAuth.TENTATIVA_INVALIDA,
      usuarioId, ip, sucesso: false,
      detalhes: 'Senha atual incorreta na troca de senha',
    })
    throw new AuthError('Senha atual incorreta', 400)
  }

  // Não permitir reutilização da mesma senha
  const mesmaSenha = await verificarSenha(novaSenha, credencial.senhaHash)
  if (mesmaSenha) throw new AuthError('Nova senha não pode ser igual à senha atual', 400)

  const hash = await hashSenha(novaSenha)
  await prisma.credencialUsuario.update({
    where: { id: credencial.id },
    data: { senhaHash: hash, precisaTrocar: false },
  })

  await registrarEvento({
    tipo: TipoEventoAuth.TROCA_SENHA,
    usuarioId, ip, sucesso: true,
  })
}

// ── Validação de senha forte ─────────────────────────────────────────

export function validarForcaSenha(senha: string): { valida: boolean; erros: string[] } {
  const erros: string[] = []
  if (senha.length < 8)           erros.push('Mínimo de 8 caracteres')
  if (!/[A-Z]/.test(senha))       erros.push('Pelo menos uma letra maiúscula')
  if (!/[a-z]/.test(senha))       erros.push('Pelo menos uma letra minúscula')
  if (!/[0-9]/.test(senha))       erros.push('Pelo menos um número')
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push('Pelo menos um caractere especial (!@#$%...)')
  return { valida: erros.length === 0, erros }
}

// ── Utilitários internos ─────────────────────────────────────────────

async function registrarEvento(data: {
  tipo: TipoEventoAuth
  ip: string
  sucesso: boolean
  usuarioId?: string
  casaId?: string
  email?: string
  userAgent?: string
  detalhes?: string
}) {
  try {
    await prisma.eventoAuth.create({ data })
  } catch {
    // Nunca deixar falha de log quebrar o fluxo de autenticação
  }
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'AuthError'
  }
}
