"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/modules/admin/numeracao.service.ts
var numeracao_service_exports = {};
__export(numeracao_service_exports, {
  gerarNumero: () => gerarNumero,
  numeracaoService: () => numeracaoService
});
async function gerarNumero(casaId, prefixo) {
  const ano = (/* @__PURE__ */ new Date()).getFullYear();
  const ultimo = await prisma5.proposicao.findFirst({
    where: {
      casaId,
      numero: { startsWith: `${prefixo}-` },
      ano
    },
    orderBy: { criadoEm: "desc" },
    select: { numero: true }
  });
  let proximoSeq = 1;
  if (ultimo) {
    const partes = ultimo.numero.split("-");
    const anoNumero = partes[partes.length - 1];
    const seq = partes[partes.length - 2];
    if (anoNumero === String(ano) && seq) {
      proximoSeq = parseInt(seq) + 1;
    }
  }
  const numero = `${prefixo}-${String(proximoSeq).padStart(3, "0")}/${ano}`;
  return numero;
}
var import_client5, prisma5, numeracaoService;
var init_numeracao_service = __esm({
  "src/modules/admin/numeracao.service.ts"() {
    "use strict";
    import_client5 = require("@prisma/client");
    prisma5 = new import_client5.PrismaClient();
    numeracaoService = { gerarNumero };
  }
});

// src/server.ts
var server_exports = {};
__export(server_exports, {
  build: () => build
});
module.exports = __toCommonJS(server_exports);
var import_fastify = __toESM(require("fastify"));
var import_cors = __toESM(require("@fastify/cors"));
var import_jwt = __toESM(require("@fastify/jwt"));
var import_cookie = __toESM(require("@fastify/cookie"));
var import_multipart = __toESM(require("@fastify/multipart"));
var import_rate_limit = __toESM(require("@fastify/rate-limit"));

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = global.__prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// src/lib/logger.ts
var import_pino = __toESM(require("pino"));
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" }
  } : void 0
});

// src/modules/auth/auth.routes.ts
var import_zod = require("zod");

// src/modules/auth/auth.service.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_crypto = __toESM(require("crypto"));
var import_client2 = require("@prisma/client");
var prisma2 = new import_client2.PrismaClient();
var BCRYPT_ROUNDS = 12;
var ACCESS_TOKEN_TTL = 15 * 60;
var REFRESH_TOKEN_TTL = 7 * 24 * 3600;
var MAX_TENTATIVAS = 5;
var BLOQUEIO_MINUTOS = 30;
var TOKEN_RECUPERACAO_TTL = 2 * 3600;
function hashSenha(senha) {
  return import_bcryptjs.default.hash(senha, BCRYPT_ROUNDS);
}
function verificarSenha(senha, hash) {
  return import_bcryptjs.default.compare(senha, hash);
}
function hashToken(token) {
  return import_crypto.default.createHash("sha256").update(token).digest("hex");
}
function gerarToken() {
  return import_crypto.default.randomUUID();
}
async function realizarLogin(input, assinarJwt) {
  const { email, senha, ip, userAgent } = input;
  const usuario = await prisma2.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ativo: true },
    include: {
      casa: { select: { id: true, nome: true, sigla: true, municipio: true, uf: true, logo: true } },
      credencial: true,
      perfis: { include: { perfil: { select: { nome: true, permissoes: true } } } }
    }
  });
  if (!usuario || !usuario.credencial) {
    await registrarEvento({
      tipo: import_client2.TipoEventoAuth.TENTATIVA_INVALIDA,
      email,
      ip,
      userAgent,
      sucesso: false,
      detalhes: "Usu\xE1rio n\xE3o encontrado"
    });
    throw new AuthError("Credenciais inv\xE1lidas", 401);
  }
  if (usuario.credencial.bloqueadoAte && usuario.credencial.bloqueadoAte > /* @__PURE__ */ new Date()) {
    const minutosRestantes = Math.ceil(
      (usuario.credencial.bloqueadoAte.getTime() - Date.now()) / 6e4
    );
    await registrarEvento({
      tipo: import_client2.TipoEventoAuth.BLOQUEIO_TEMPORARIO,
      usuarioId: usuario.id,
      casaId: usuario.casaId,
      ip,
      userAgent,
      sucesso: false,
      detalhes: `Bloqueado por mais ${minutosRestantes} min`
    });
    throw new AuthError(`Conta bloqueada temporariamente. Tente novamente em ${minutosRestantes} minutos.`, 429);
  }
  const senhaCorreta = await verificarSenha(senha, usuario.credencial.senhaHash);
  if (!senhaCorreta) {
    const novasTentativas = usuario.credencial.tentativasFalhas + 1;
    const deveBloquear = novasTentativas >= MAX_TENTATIVAS;
    await prisma2.credencialUsuario.update({
      where: { id: usuario.credencial.id },
      data: {
        tentativasFalhas: novasTentativas,
        bloqueadoAte: deveBloquear ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1e3) : null
      }
    });
    await registrarEvento({
      tipo: deveBloquear ? import_client2.TipoEventoAuth.BLOQUEIO_TEMPORARIO : import_client2.TipoEventoAuth.TENTATIVA_INVALIDA,
      usuarioId: usuario.id,
      casaId: usuario.casaId,
      ip,
      userAgent,
      sucesso: false,
      detalhes: `Tentativa ${novasTentativas}/${MAX_TENTATIVAS}`
    });
    if (deveBloquear) {
      throw new AuthError(`Muitas tentativas falhas. Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos.`, 429);
    }
    throw new AuthError("Credenciais inv\xE1lidas", 401);
  }
  await prisma2.credencialUsuario.update({
    where: { id: usuario.credencial.id },
    data: {
      tentativasFalhas: 0,
      bloqueadoAte: null,
      ultimoLoginEm: /* @__PURE__ */ new Date(),
      ultimoLoginIp: ip
    }
  });
  const permissoes = /* @__PURE__ */ new Set();
  const perfisNomes = [];
  for (const up of usuario.perfis) {
    perfisNomes.push(up.perfil.nome);
    for (const perm of up.perfil.permissoes) permissoes.add(perm);
  }
  const jwtPayload = {
    sub: usuario.id,
    casaId: usuario.casaId,
    email: usuario.email,
    nome: usuario.nome,
    perfis: perfisNomes,
    permissoes: [...permissoes],
    iat: Math.floor(Date.now() / 1e3)
  };
  const accessToken = assinarJwt(jwtPayload, { expiresIn: `${ACCESS_TOKEN_TTL}s` });
  const refreshToken = gerarToken();
  const refreshHash = hashToken(refreshToken);
  await prisma2.sessaoAuth.deleteMany({
    where: { credencialId: usuario.credencial.id, expiraEm: { lt: /* @__PURE__ */ new Date() } }
  });
  await prisma2.sessaoAuth.create({
    data: {
      credencialId: usuario.credencial.id,
      refreshTokenHash: refreshHash,
      ip,
      userAgent,
      expiraEm: new Date(Date.now() + REFRESH_TOKEN_TTL * 1e3)
    }
  });
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.LOGIN,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip,
    userAgent,
    sucesso: true
  });
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      casaId: usuario.casaId,
      casaNome: usuario.casa.nome,
      casaSigla: usuario.casa.sigla,
      municipio: usuario.casa.municipio,
      uf: usuario.casa.uf,
      perfis: perfisNomes,
      permissoes: [...permissoes],
      precisaTrocar: usuario.credencial.precisaTrocar,
      avatar: usuario.avatar
    }
  };
}
async function renovarTokens(refreshToken, ip, userAgent, assinarJwt) {
  const hash = hashToken(refreshToken);
  const sessao = await prisma2.sessaoAuth.findUnique({
    where: { refreshTokenHash: hash },
    include: {
      credencial: {
        include: {
          usuario: {
            include: {
              perfis: { include: { perfil: true } },
              casa: { select: { id: true, nome: true, sigla: true } }
            }
          }
        }
      }
    }
  });
  if (!sessao || !sessao.ativo || sessao.expiraEm < /* @__PURE__ */ new Date()) {
    throw new AuthError("Sess\xE3o inv\xE1lida ou expirada", 401);
  }
  const usuario = sessao.credencial.usuario;
  if (!usuario.ativo) throw new AuthError("Usu\xE1rio inativo", 403);
  await prisma2.sessaoAuth.update({
    where: { id: sessao.id },
    data: { ultimoUsoEm: /* @__PURE__ */ new Date(), ip }
  });
  const permissoes = /* @__PURE__ */ new Set();
  const perfisNomes = [];
  for (const up of usuario.perfis) {
    perfisNomes.push(up.perfil.nome);
    for (const perm of up.perfil.permissoes) permissoes.add(perm);
  }
  const accessToken = assinarJwt({
    sub: usuario.id,
    casaId: usuario.casaId,
    email: usuario.email,
    nome: usuario.nome,
    perfis: perfisNomes,
    permissoes: [...permissoes],
    iat: Math.floor(Date.now() / 1e3)
  }, { expiresIn: `${ACCESS_TOKEN_TTL}s` });
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.REFRESH_TOKEN,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip,
    userAgent,
    sucesso: true
  });
  return { accessToken, expiresIn: ACCESS_TOKEN_TTL };
}
async function realizarLogout(refreshToken, usuarioId, ip) {
  const hash = hashToken(refreshToken);
  await prisma2.sessaoAuth.updateMany({
    where: { refreshTokenHash: hash },
    data: { ativo: false }
  });
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.LOGOUT,
    usuarioId,
    ip,
    sucesso: true
  });
}
async function solicitarRecuperacaoSenha(email, ip) {
  const usuario = await prisma2.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ativo: true }
  });
  if (!usuario) {
    return null;
  }
  await prisma2.tokenSeguranca.updateMany({
    where: { usuarioId: usuario.id, tipo: import_client2.TipoTokenSeguranca.RECUPERACAO_SENHA, usado: false },
    data: { usado: true }
  });
  const token = gerarToken();
  await prisma2.tokenSeguranca.create({
    data: {
      usuarioId: usuario.id,
      token,
      tipo: import_client2.TipoTokenSeguranca.RECUPERACAO_SENHA,
      expiraEm: new Date(Date.now() + TOKEN_RECUPERACAO_TTL * 1e3),
      ip
    }
  });
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.RECUPERACAO_SENHA_SOLICITADA,
    usuarioId: usuario.id,
    casaId: usuario.casaId,
    ip,
    sucesso: true
  });
  return token;
}
async function concluirRecuperacaoSenha(token, novaSenha, ip) {
  const registro = await prisma2.tokenSeguranca.findUnique({
    where: { token },
    include: { usuario: { include: { credencial: true } } }
  });
  if (!registro || registro.usado || registro.expiraEm < /* @__PURE__ */ new Date()) {
    throw new AuthError("Token inv\xE1lido ou expirado", 400);
  }
  if (registro.tipo !== import_client2.TipoTokenSeguranca.RECUPERACAO_SENHA) {
    throw new AuthError("Tipo de token incorreto", 400);
  }
  if (!registro.usuario.credencial) {
    throw new AuthError("Usu\xE1rio sem credencial", 400);
  }
  const hash = await hashSenha(novaSenha);
  await prisma2.$transaction([
    prisma2.credencialUsuario.update({
      where: { id: registro.usuario.credencial.id },
      data: { senhaHash: hash, tentativasFalhas: 0, bloqueadoAte: null, precisaTrocar: false }
    }),
    prisma2.tokenSeguranca.update({
      where: { id: registro.id },
      data: { usado: true, usadoEm: /* @__PURE__ */ new Date() }
    }),
    // Revogar todas as sessões ativas (segurança)
    prisma2.sessaoAuth.updateMany({
      where: { credencialId: registro.usuario.credencial.id, ativo: true },
      data: { ativo: false }
    })
  ]);
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.RECUPERACAO_SENHA_CONCLUIDA,
    usuarioId: registro.usuarioId,
    casaId: registro.usuario.casaId,
    ip,
    sucesso: true
  });
}
async function trocarSenha(usuarioId, senhaAtual, novaSenha, ip) {
  const credencial = await prisma2.credencialUsuario.findUnique({ where: { usuarioId } });
  if (!credencial) throw new AuthError("Credencial n\xE3o encontrada", 404);
  const correta = await verificarSenha(senhaAtual, credencial.senhaHash);
  if (!correta) {
    await registrarEvento({
      tipo: import_client2.TipoEventoAuth.TENTATIVA_INVALIDA,
      usuarioId,
      ip,
      sucesso: false,
      detalhes: "Senha atual incorreta na troca de senha"
    });
    throw new AuthError("Senha atual incorreta", 400);
  }
  const mesmaSenha = await verificarSenha(novaSenha, credencial.senhaHash);
  if (mesmaSenha) throw new AuthError("Nova senha n\xE3o pode ser igual \xE0 senha atual", 400);
  const hash = await hashSenha(novaSenha);
  await prisma2.credencialUsuario.update({
    where: { id: credencial.id },
    data: { senhaHash: hash, precisaTrocar: false }
  });
  await registrarEvento({
    tipo: import_client2.TipoEventoAuth.TROCA_SENHA,
    usuarioId,
    ip,
    sucesso: true
  });
}
function validarForcaSenha(senha) {
  const erros = [];
  if (senha.length < 8) erros.push("M\xEDnimo de 8 caracteres");
  if (!/[A-Z]/.test(senha)) erros.push("Pelo menos uma letra mai\xFAscula");
  if (!/[a-z]/.test(senha)) erros.push("Pelo menos uma letra min\xFAscula");
  if (!/[0-9]/.test(senha)) erros.push("Pelo menos um n\xFAmero");
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push("Pelo menos um caractere especial (!@#$%...)");
  return { valida: erros.length === 0, erros };
}
async function registrarEvento(data) {
  try {
    await prisma2.eventoAuth.create({ data });
  } catch {
  }
}
var AuthError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
  statusCode;
};

// src/modules/auth/auth.routes.ts
var REFRESH_COOKIE = "leg_refresh";
var COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 3600
  // 7 dias
};
var loginSchema = import_zod.z.object({
  email: import_zod.z.string().email("Email inv\xE1lido").toLowerCase(),
  senha: import_zod.z.string().min(1, "Senha obrigat\xF3ria")
});
var recuperarSenhaSchema = import_zod.z.object({
  email: import_zod.z.string().email()
});
var redefinirSenhaSchema = import_zod.z.object({
  token: import_zod.z.string().uuid("Token inv\xE1lido"),
  novaSenha: import_zod.z.string().min(8)
});
var trocarSenhaSchema = import_zod.z.object({
  senhaAtual: import_zod.z.string().min(1),
  novaSenha: import_zod.z.string().min(8)
});
function handleAuthError(err, reply) {
  if (err instanceof AuthError) {
    return reply.status(err.statusCode).send({ error: "AuthError", message: err.message });
  }
  if (err instanceof import_zod.z.ZodError) {
    return reply.status(400).send({ error: "ValidationError", issues: err.errors });
  }
  throw err;
}
async function authRoutes(app) {
  app.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
    // 10 tentativas/min por IP
  }, async (req, reply) => {
    try {
      const body = loginSchema.parse(req.body);
      const result = await realizarLogin(
        { ...body, ip: req.ip, userAgent: req.headers["user-agent"] },
        (payload, opts) => app.jwt.sign(payload, opts)
      );
      reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
      return reply.status(200).send({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        tokenType: "Bearer",
        usuario: result.usuario
      });
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });
  app.post("/refresh", async (req, reply) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (!refreshToken) {
        return reply.status(401).send({ error: "Unauthorized", message: "Sess\xE3o expirada" });
      }
      const result = await renovarTokens(
        refreshToken,
        req.ip,
        req.headers["user-agent"],
        (payload, opts) => app.jwt.sign(payload, opts)
      );
      return reply.status(200).send(result);
    } catch (err) {
      reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
      return handleAuthError(err, reply);
    }
  });
  app.post("/logout", async (req, reply) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    const userId = req.user?.id;
    if (refreshToken && userId) {
      await realizarLogout(refreshToken, userId, req.ip).catch(() => {
      });
    }
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
    return reply.status(200).send({ message: "Logout realizado com sucesso" });
  });
  app.post("/recuperar-senha", {
    config: { rateLimit: { max: 3, timeWindow: "5 minutes" } }
  }, async (req, reply) => {
    try {
      const { email } = recuperarSenhaSchema.parse(req.body);
      const token = await solicitarRecuperacaoSenha(email, req.ip);
      const response = {
        message: "Se o e-mail estiver cadastrado, voc\xEA receber\xE1 as instru\xE7\xF5es em breve."
      };
      if (process.env.NODE_ENV !== "production" && token) {
        response._devToken = token;
      }
      return reply.status(200).send(response);
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });
  app.post("/redefinir-senha", async (req, reply) => {
    try {
      const { token, novaSenha } = redefinirSenhaSchema.parse(req.body);
      const { valida, erros } = validarForcaSenha(novaSenha);
      if (!valida) {
        return reply.status(400).send({ error: "SenhaFraca", erros });
      }
      await concluirRecuperacaoSenha(token, novaSenha, req.ip);
      return reply.status(200).send({ message: "Senha redefinida com sucesso. Fa\xE7a login novamente." });
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });
  app.post("/trocar-senha", async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body);
      const { valida, erros } = validarForcaSenha(novaSenha);
      if (!valida) {
        return reply.status(400).send({ error: "SenhaFraca", erros });
      }
      await trocarSenha(req.user.id, senhaAtual, novaSenha, req.ip);
      return reply.status(200).send({ message: "Senha alterada com sucesso." });
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });
  app.get("/me", async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return reply.status(200).send({ usuario: req.user });
  });
  app.get("/sessoes", async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const { PrismaClient: PrismaClient21 } = await import("@prisma/client");
    const prisma21 = new PrismaClient21();
    const sessoes = await prisma21.sessaoAuth.findMany({
      where: {
        credencial: { usuarioId: req.user.id },
        ativo: true,
        expiraEm: { gt: /* @__PURE__ */ new Date() }
      },
      select: { id: true, ip: true, userAgent: true, criadoEm: true, ultimoUsoEm: true },
      orderBy: { ultimoUsoEm: "desc" }
    });
    return reply.status(200).send({ sessoes });
  });
  app.delete("/sessoes/:id", async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const { PrismaClient: PrismaClient21 } = await import("@prisma/client");
    const prisma21 = new PrismaClient21();
    await prisma21.sessaoAuth.updateMany({
      where: {
        id,
        credencial: { usuarioId: req.user.id }
      },
      data: { ativo: false }
    });
    return reply.status(200).send({ message: "Sess\xE3o revogada" });
  });
}

// src/modules/proposicoes/routes.ts
var import_zod2 = require("zod");
var import_client6 = require("@prisma/client");

// src/modules/tramitacao/tramitacao.service.ts
var import_client3 = require("@prisma/client");

// src/lib/errors.ts
var AppError = class _AppError extends Error {
  constructor(message, statusCode = 400, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AppError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _AppError);
    }
  }
  statusCode;
  code;
};

// src/modules/tramitacao/tramitacao.service.ts
var prisma3 = new import_client3.PrismaClient();
var TramitacaoService = class {
  constructor(camundaService2, notificacaoService2, auditoriaService2) {
    this.camundaService = camundaService2;
    this.notificacaoService = notificacaoService2;
    this.auditoriaService = auditoriaService2;
  }
  camundaService;
  notificacaoService;
  auditoriaService;
  /**
   * Registra um evento de tramitação.
   * - Persiste o evento no histórico
   * - Atualiza o status da proposição
   * - Notifica responsáveis
   * - Audita a ação
   */
  async registrarEvento(input, usuarioId) {
    const proposicao = await prisma3.proposicao.findUnique({
      where: { id: input.proposicaoId },
      include: { tipoMateria: true }
    });
    if (!proposicao) {
      throw new AppError("Proposi\xE7\xE3o n\xE3o encontrada", 404);
    }
    if (input.novoStatus) {
      await this.validarTransicao(proposicao.status, input.novoStatus, input.tipo);
    }
    const ultimoEvento = await prisma3.tramitacaoEvento.findFirst({
      where: { proposicaoId: input.proposicaoId },
      orderBy: { sequencia: "desc" }
    });
    const proximaSequencia = (ultimoEvento?.sequencia ?? 0) + 1;
    const resultado = await prisma3.$transaction(async (tx) => {
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
          dadosAdicionais: input.dadosAdicionais,
          camundaTaskId: input.camundaTaskId
        },
        include: {
          usuario: { select: { nome: true, email: true } },
          orgaoOrigem: { select: { nome: true, sigla: true } }
        }
      });
      if (input.novoStatus && input.novoStatus !== proposicao.status) {
        await tx.proposicao.update({
          where: { id: input.proposicaoId },
          data: {
            status: input.novoStatus,
            orgaoDestinoId: input.orgaoDestinoId,
            atualizadoEm: /* @__PURE__ */ new Date(),
            ...input.novoStatus === import_client3.StatusProposicao.PROTOCOLADO ? { protocoladoEm: /* @__PURE__ */ new Date() } : {},
            ...input.novoStatus === import_client3.StatusProposicao.ARQUIVADO ? { arquivadoEm: /* @__PURE__ */ new Date() } : {}
          }
        });
      }
      return evento;
    });
    await this.acoesPosEvento(resultado, proposicao, input);
    return resultado;
  }
  /**
   * Retorna o histórico completo de tramitação de uma proposição
   */
  async buscarHistorico(filtros) {
    const where = {
      proposicaoId: filtros.proposicaoId,
      ...filtros.tipo ? { tipo: filtros.tipo } : {},
      ...filtros.de || filtros.ate ? {
        criadoEm: {
          ...filtros.de ? { gte: filtros.de } : {},
          ...filtros.ate ? { lte: filtros.ate } : {}
        }
      } : {}
    };
    const eventos = await prisma3.tramitacaoEvento.findMany({
      where,
      orderBy: { sequencia: "asc" },
      include: {
        usuario: {
          select: { id: true, nome: true, cargo: true, avatar: true }
        },
        orgaoOrigem: {
          select: { id: true, nome: true, sigla: true, tipo: true }
        },
        documentosGerados: {
          include: {
            documento: {
              select: { id: true, nome: true, tipo: true, status: true }
            }
          }
        }
      }
    });
    return eventos;
  }
  /**
   * Encaminhar proposição para um órgão
   */
  async encaminhar(proposicaoId, orgaoDestinoId, observacao, usuarioId) {
    const orgaoDestino = await prisma3.orgao.findUnique({ where: { id: orgaoDestinoId } });
    if (!orgaoDestino) throw new AppError("\xD3rg\xE3o de destino n\xE3o encontrado", 404);
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: import_client3.TipoEventoTramitacao.ENCAMINHAMENTO,
        descricao: `Encaminhado para ${orgaoDestino.nome}`,
        usuarioId,
        orgaoDestinoId,
        observacao,
        novoStatus: import_client3.StatusProposicao.EM_ANALISE
      },
      usuarioId
    );
  }
  /**
   * Devolver proposição ao autor com justificativa
   */
  async devolver(proposicaoId, motivo, usuarioId) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: import_client3.TipoEventoTramitacao.DEVOLUCAO,
        descricao: "Proposi\xE7\xE3o devolvida ao autor",
        usuarioId,
        observacao: motivo,
        novoStatus: import_client3.StatusProposicao.DEVOLVIDO
      },
      usuarioId
    );
  }
  /**
   * Arquivar proposição
   */
  async arquivar(proposicaoId, motivo, usuarioId) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: import_client3.TipoEventoTramitacao.ARQUIVAMENTO,
        descricao: "Proposi\xE7\xE3o arquivada",
        usuarioId,
        observacao: motivo,
        novoStatus: import_client3.StatusProposicao.ARQUIVADO
      },
      usuarioId
    );
  }
  /**
   * Suspender tramitação
   */
  async suspender(proposicaoId, motivo, usuarioId) {
    return this.registrarEvento(
      {
        proposicaoId,
        tipo: import_client3.TipoEventoTramitacao.SUSPENSAO,
        descricao: "Tramita\xE7\xE3o suspensa",
        usuarioId,
        observacao: motivo,
        novoStatus: import_client3.StatusProposicao.SUSPENSO
      },
      usuarioId
    );
  }
  /**
   * Validações de transição de estado
   * Define quais transições são permitidas
   */
  async validarTransicao(statusAtual, novoStatus, tipoEvento) {
    const transicoesPermitidas = {
      [import_client3.StatusProposicao.RASCUNHO]: [import_client3.StatusProposicao.EM_ELABORACAO, import_client3.StatusProposicao.PROTOCOLADO],
      [import_client3.StatusProposicao.EM_ELABORACAO]: [import_client3.StatusProposicao.PROTOCOLADO, import_client3.StatusProposicao.RASCUNHO],
      [import_client3.StatusProposicao.PROTOCOLADO]: [
        import_client3.StatusProposicao.EM_ANALISE,
        import_client3.StatusProposicao.DEVOLVIDO,
        import_client3.StatusProposicao.SUSPENSO
      ],
      [import_client3.StatusProposicao.EM_ANALISE]: [
        import_client3.StatusProposicao.EM_COMISSAO,
        import_client3.StatusProposicao.AGUARDANDO_PARECER_JURIDICO,
        import_client3.StatusProposicao.EM_PAUTA,
        import_client3.StatusProposicao.DEVOLVIDO,
        import_client3.StatusProposicao.SUSPENSO,
        import_client3.StatusProposicao.ARQUIVADO
      ],
      [import_client3.StatusProposicao.AGUARDANDO_PARECER_JURIDICO]: [
        import_client3.StatusProposicao.EM_COMISSAO,
        import_client3.StatusProposicao.EM_ANALISE,
        import_client3.StatusProposicao.DEVOLVIDO
      ],
      [import_client3.StatusProposicao.EM_COMISSAO]: [
        import_client3.StatusProposicao.EM_PAUTA,
        import_client3.StatusProposicao.DEVOLVIDO,
        import_client3.StatusProposicao.ARQUIVADO
      ],
      [import_client3.StatusProposicao.EM_PAUTA]: [
        import_client3.StatusProposicao.EM_VOTACAO,
        import_client3.StatusProposicao.EM_COMISSAO,
        import_client3.StatusProposicao.SUSPENSO
      ],
      [import_client3.StatusProposicao.EM_VOTACAO]: [
        import_client3.StatusProposicao.APROVADO,
        import_client3.StatusProposicao.REJEITADO,
        import_client3.StatusProposicao.EM_PAUTA
      ],
      [import_client3.StatusProposicao.APROVADO]: [
        import_client3.StatusProposicao.PUBLICADO,
        import_client3.StatusProposicao.ARQUIVADO
      ],
      [import_client3.StatusProposicao.REJEITADO]: [import_client3.StatusProposicao.ARQUIVADO],
      [import_client3.StatusProposicao.PUBLICADO]: [import_client3.StatusProposicao.ARQUIVADO],
      [import_client3.StatusProposicao.DEVOLVIDO]: [
        import_client3.StatusProposicao.EM_ELABORACAO,
        import_client3.StatusProposicao.ARQUIVADO
      ],
      [import_client3.StatusProposicao.SUSPENSO]: [
        import_client3.StatusProposicao.EM_ANALISE,
        import_client3.StatusProposicao.ARQUIVADO
      ],
      [import_client3.StatusProposicao.ARQUIVADO]: []
    };
    const permitidos = transicoesPermitidas[statusAtual] || [];
    if (!permitidos.includes(novoStatus)) {
      throw new AppError(
        `Transi\xE7\xE3o n\xE3o permitida: ${statusAtual} \u2192 ${novoStatus}`,
        422
      );
    }
  }
  /**
   * Ações assíncronas pós-evento
   */
  async acoesPosEvento(evento, proposicao, input) {
    try {
      if (input.orgaoDestinoId) {
        await this.notificacaoService.notificarOrgao(input.orgaoDestinoId, {
          tipo: "ENCAMINHAMENTO",
          titulo: `Nova proposi\xE7\xE3o: ${proposicao.numero}`,
          mensagem: input.descricao,
          proposicaoId: proposicao.id
        });
      }
      await this.auditoriaService.registrar({
        usuarioId: input.usuarioId,
        entidade: "TramitacaoEvento",
        entidadeId: evento.id,
        acao: "CRIAR",
        dadosDepois: {
          tipo: input.tipo,
          proposicaoId: input.proposicaoId,
          status: input.novoStatus
        }
      });
    } catch (err) {
      console.error("Erro em a\xE7\xF5es p\xF3s-evento:", err);
    }
  }
};

// src/plugins/auth.ts
var import_client4 = require("@prisma/client");
var prisma4 = new import_client4.PrismaClient();
var ROTAS_PUBLICAS = [
  "/health",
  "/docs",
  "/docs/",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/recuperar-senha",
  "/api/v1/auth/redefinir-senha",
  "/api/v1/publicacao/portal",
  "/api/v1/publicacao/portal/"
];
async function authPlugin(app) {
  app.addHook("onRequest", async (req, reply) => {
    const url = req.url.split("?")[0];
    if (ROTAS_PUBLICAS.some((p) => url === p || url.startsWith(p))) return;
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized", message: "Token n\xE3o fornecido" });
    }
    let payload;
    try {
      payload = await req.jwtVerify();
    } catch (err) {
      const msg = err?.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED" ? "Token expirado" : "Token inv\xE1lido";
      return reply.status(401).send({ error: "Unauthorized", message: msg });
    }
    const userId = payload.sub;
    const usuario = await prisma4.usuario.findUnique({
      where: { id: userId },
      include: {
        perfis: { include: { perfil: { select: { nome: true, permissoes: true } } } },
        orgaos: { select: { orgaoId: true } },
        credencial: { select: { precisaTrocar: true } }
      }
    });
    if (!usuario || !usuario.ativo) {
      return reply.status(403).send({ error: "Forbidden", message: "Usu\xE1rio inativo" });
    }
    const permissoes = /* @__PURE__ */ new Set();
    const perfisNomes = [];
    for (const up of usuario.perfis) {
      perfisNomes.push(up.perfil.nome);
      for (const p of up.perfil.permissoes) permissoes.add(p);
    }
    req.user = {
      id: usuario.id,
      casaId: usuario.casaId,
      nome: usuario.nome,
      email: usuario.email,
      perfis: perfisNomes,
      permissoes: [...permissoes],
      orgaos: usuario.orgaos.map((o) => o.orgaoId),
      precisaTrocar: usuario.credencial?.precisaTrocar ?? false
    };
  });
}
function requireAuth(req, reply, done) {
  if (!req.user) return reply.status(401).send({ error: "Unauthorized" });
  done();
}
function requirePermission(...requeridas) {
  return (req, reply, done) => {
    if (!req.user) return reply.status(401).send({ error: "Unauthorized" });
    const tem = requeridas.every((r) => checarPermissao(req.user.permissoes, r));
    if (!tem) return reply.status(403).send({
      error: "Forbidden",
      message: `Permiss\xE3o insuficiente: ${requeridas.join(", ")}`
    });
    done();
  };
}
function checarPermissao(permissoes, requerida) {
  if (permissoes.includes("*:*")) return true;
  const [modulo, acao] = requerida.split(":");
  return permissoes.some((p) => {
    const [pm, pa] = p.split(":");
    return (pm === "*" || pm === modulo) && (pa === "*" || pa === acao);
  });
}

// src/modules/proposicoes/routes.ts
init_numeracao_service();
var prisma6 = new import_client6.PrismaClient();
var createProposicaoSchema = import_zod2.z.object({
  tipoMateriaId: import_zod2.z.string().cuid(),
  ementa: import_zod2.z.string().min(20).max(2e3),
  textoCompleto: import_zod2.z.string().optional(),
  origem: import_zod2.z.enum(["VEREADOR", "MESA_DIRETORA", "COMISSAO", "PREFEITURA", "POPULAR", "EXTERNA"]),
  regime: import_zod2.z.enum(["ORDINARIO", "URGENTE", "URGENCIA_ESPECIAL", "SUMARIO"]).default("ORDINARIO"),
  prioridade: import_zod2.z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  autorExterno: import_zod2.z.string().optional(),
  palavrasChave: import_zod2.z.array(import_zod2.z.string()).optional(),
  assunto: import_zod2.z.string().optional(),
  observacoes: import_zod2.z.string().optional()
});
var listProposicaoSchema = import_zod2.z.object({
  page: import_zod2.z.coerce.number().min(1).default(1),
  pageSize: import_zod2.z.coerce.number().min(1).max(100).default(20),
  status: import_zod2.z.nativeEnum(import_client6.StatusProposicao).optional(),
  tipoMateriaId: import_zod2.z.string().optional(),
  autorId: import_zod2.z.string().optional(),
  orgaoDestinoId: import_zod2.z.string().optional(),
  busca: import_zod2.z.string().optional(),
  de: import_zod2.z.string().datetime().optional(),
  ate: import_zod2.z.string().datetime().optional(),
  orderBy: import_zod2.z.enum(["criadoEm", "atualizadoEm", "numero"]).default("criadoEm"),
  order: import_zod2.z.enum(["asc", "desc"]).default("desc")
});
async function proposicoesRoutes(app) {
  app.get("/", {
    preHandler: [requireAuth],
    schema: { querystring: listProposicaoSchema }
  }, async (req, reply) => {
    const query = listProposicaoSchema.parse(req.query);
    const where = {
      ...query.status ? { status: query.status } : {},
      ...query.tipoMateriaId ? { tipoMateriaId: query.tipoMateriaId } : {},
      ...query.autorId ? { autorId: query.autorId } : {},
      ...query.orgaoDestinoId ? { orgaoDestinoId: query.orgaoDestinoId } : {},
      ...query.busca ? {
        OR: [
          { numero: { contains: query.busca, mode: "insensitive" } },
          { ementa: { contains: query.busca, mode: "insensitive" } },
          { assunto: { contains: query.busca, mode: "insensitive" } },
          { palavrasChave: { has: query.busca } }
        ]
      } : {},
      ...query.de || query.ate ? {
        criadoEm: {
          ...query.de ? { gte: new Date(query.de) } : {},
          ...query.ate ? { lte: new Date(query.ate) } : {}
        }
      } : {}
    };
    const [total, items] = await Promise.all([
      prisma6.proposicao.count({ where }),
      prisma6.proposicao.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.orderBy]: query.order },
        include: {
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true, cargo: true } },
          orgaoDestino: { select: { nome: true, sigla: true } },
          _count: {
            select: { tramitacoes: true, documentos: true }
          }
        }
      })
    ]);
    return {
      data: items,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize)
      }
    };
  });
  app.get("/:id", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const proposicao = await prisma6.proposicao.findUnique({
      where: { id: req.params.id },
      include: {
        tipoMateria: true,
        autor: { select: { id: true, nome: true, cargo: true, avatar: true } },
        orgaoDestino: true,
        documentos: {
          include: { versoes: true },
          orderBy: { criadoEm: "desc" }
        },
        tramitacoes: {
          orderBy: { sequencia: "asc" },
          include: {
            usuario: { select: { id: true, nome: true, cargo: true, avatar: true } },
            orgaoOrigem: { select: { id: true, nome: true, sigla: true } },
            documentosGerados: {
              include: { documento: { select: { id: true, nome: true, tipo: true } } }
            }
          }
        },
        instanciaProcesso: {
          include: {
            tarefas: {
              where: { status: "PENDENTE" },
              orderBy: { criadoEm: "desc" }
            }
          }
        },
        pautas: {
          include: { sessao: { select: { id: true, numero: true, data: true, tipo: true } } },
          orderBy: { criadoEm: "desc" },
          take: 5
        },
        publicacoes: { orderBy: { criadoEm: "desc" } }
      }
    });
    if (!proposicao) return reply.status(404).send({ error: "Proposi\xE7\xE3o n\xE3o encontrada" });
    await req.auditoria?.registrar({
      entidade: "Proposicao",
      entidadeId: proposicao.id,
      acao: "LER"
    });
    return proposicao;
  });
  app.post("/", {
    preHandler: [requireAuth, requirePermission("proposicoes:criar")]
  }, async (req, reply) => {
    const body = createProposicaoSchema.parse(req.body);
    const usuarioId = req.user.id;
    const casaId = req.user.casaId;
    const tipoMateria = await prisma6.tipoMateria.findUnique({
      where: { id: body.tipoMateriaId }
    });
    if (!tipoMateria) return reply.status(400).send({ error: "Tipo de mat\xE9ria n\xE3o encontrado" });
    const numero = await numeracaoService.gerarNumero(casaId, tipoMateria.prefixoNumero);
    const proposicao = await prisma6.proposicao.create({
      data: {
        casaId,
        numero,
        ano: (/* @__PURE__ */ new Date()).getFullYear(),
        tipoMateriaId: body.tipoMateriaId,
        autorId: usuarioId,
        autorExterno: body.autorExterno,
        ementa: body.ementa,
        textoCompleto: body.textoCompleto,
        origem: body.origem,
        regime: body.regime,
        prioridade: body.prioridade,
        palavrasChave: body.palavrasChave || [],
        assunto: body.assunto,
        observacoes: body.observacoes,
        status: "RASCUNHO"
      }
    });
    return reply.status(201).send(proposicao);
  });
  app.post("/:id/protocolar", {
    preHandler: [requireAuth, requirePermission("proposicoes:protocolar")]
  }, async (req, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService
    );
    const evento = await tramitacaoSvc.registrarEvento({
      proposicaoId: req.params.id,
      tipo: "PROTOCOLO",
      descricao: "Proposi\xE7\xE3o protocolada e recebida pelo setor de protocolo",
      usuarioId: req.user.id,
      novoStatus: "PROTOCOLADO"
    }, req.user.id);
    const proposicao = await prisma6.proposicao.findUnique({
      where: { id: req.params.id },
      include: { tipoMateria: true }
    });
    if (proposicao) {
      try {
        const instance = await req.server.camundaService.startProcess({
          processDefinitionKey: "tramitacao_proposicao_basica",
          businessKey: proposicao.numero,
          variables: {
            proposicaoId: { value: proposicao.id, type: "String" },
            tipoMateria: { value: proposicao.tipoMateria.sigla, type: "String" },
            origem: { value: proposicao.origem, type: "String" },
            regime: { value: proposicao.regime, type: "String" }
          }
        });
        await prisma6.instanciaProcesso.create({
          data: {
            proposicaoId: proposicao.id,
            fluxoProcessoId: "default",
            // referência ao fluxo ativo
            camundaInstanceId: instance.id,
            camundaStatus: "ACTIVE",
            etapaAtual: "task_analise_inicial"
          }
        });
      } catch (err) {
        req.log.error({ err }, "Falha ao iniciar processo no Camunda");
      }
    }
    return reply.status(201).send(evento);
  });
  app.post("/:id/encaminhar", {
    preHandler: [requireAuth, requirePermission("tramitacao:encaminhar")]
  }, async (req, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService
    );
    const { orgaoDestinoId, observacao } = req.body;
    const evento = await tramitacaoSvc.encaminhar(req.params.id, orgaoDestinoId, observacao, req.user.id);
    return reply.status(201).send(evento);
  });
  app.post("/:id/devolver", {
    preHandler: [requireAuth, requirePermission("tramitacao:devolver")]
  }, async (req, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService
    );
    const { motivo } = req.body;
    const evento = await tramitacaoSvc.devolver(req.params.id, motivo, req.user.id);
    return reply.status(201).send(evento);
  });
  app.get("/:id/historico", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService
    );
    const historico = await tramitacaoSvc.buscarHistorico({ proposicaoId: req.params.id });
    return historico;
  });
  app.post("/:id/arquivar", {
    preHandler: [requireAuth, requirePermission("tramitacao:arquivar")]
  }, async (req, reply) => {
    const tramitacaoSvc = new TramitacaoService(
      req.server.camundaService,
      req.server.notificacaoService,
      req.server.auditoriaService
    );
    const { motivo } = req.body;
    const evento = await tramitacaoSvc.arquivar(req.params.id, motivo, req.user.id);
    return reply.status(201).send(evento);
  });
}

// src/modules/tramitacao/routes.ts
var import_client9 = require("@prisma/client");
var import_zod3 = require("zod");

// src/modules/processos/camunda.service.ts
var import_axios = __toESM(require("axios"));
var CamundaService = class {
  client;
  engineName;
  constructor(config) {
    this.engineName = config.engineName || "default";
    this.client = import_axios.default.create({
      baseURL: `${config.baseUrl}/engine-rest`,
      headers: {
        "Content-Type": "application/json",
        ...config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}
      },
      timeout: 3e4
    });
    this.client.interceptors.request.use((req) => {
      logger.debug({ method: req.method, url: req.url }, "Camunda API request");
      return req;
    });
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error(
          { status: err.response?.status, data: err.response?.data, url: err.config?.url },
          "Camunda API error"
        );
        throw err;
      }
    );
  }
  /**
   * Deploy de um arquivo BPMN/DMN
   */
  async deployProcess(name, xmlContent, isDmn = false) {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("deployment-name", name);
    form.append("enable-duplicate-filtering", "true");
    form.append("deployment-source", "legislativo-api");
    form.append(
      isDmn ? `${name}.dmn` : `${name}.bpmn`,
      Buffer.from(xmlContent, "utf-8"),
      { filename: isDmn ? `${name}.dmn` : `${name}.bpmn` }
    );
    const response = await this.client.post("/deployment/create", form, {
      headers: form.getHeaders()
    });
    return {
      id: response.data.id,
      name: response.data.name,
      deploymentTime: response.data.deploymentTime
    };
  }
  /**
   * Inicia uma instância de processo
   */
  async startProcess(input) {
    const response = await this.client.post(
      `/process-definition/key/${input.processDefinitionKey}/start`,
      {
        businessKey: input.businessKey,
        variables: this.formatVariables(input.variables)
      }
    );
    return response.data;
  }
  /**
   * Busca instância de processo pelo ID
   */
  async getProcessInstance(instanceId) {
    const response = await this.client.get(`/process-instance/${instanceId}`);
    return response.data;
  }
  /**
   * Lista tarefas do usuário por grupos
   */
  async getUserTasks(candidateGroups, assigneeId) {
    const params = {};
    if (candidateGroups.length > 0) {
      params.candidateGroups = candidateGroups.join(",");
    }
    if (assigneeId) {
      params.assignee = assigneeId;
    }
    const response = await this.client.get("/task", { params });
    return response.data;
  }
  /**
   * Busca uma tarefa específica
   */
  async getTask(taskId) {
    const response = await this.client.get(`/task/${taskId}`);
    return response.data;
  }
  /**
   * Completa uma tarefa humana com variáveis
   */
  async completeTask(taskId, variables) {
    await this.client.post(`/task/${taskId}/complete`, {
      variables: this.formatVariables(variables)
    });
  }
  /**
   * Atribui uma tarefa a um usuário
   */
  async assignTask(taskId, userId) {
    await this.client.post(`/task/${taskId}/assignee`, { userId });
  }
  /**
   * Busca variáveis de uma instância
   */
  async getProcessVariables(instanceId) {
    const response = await this.client.get(
      `/process-instance/${instanceId}/variables`
    );
    return response.data;
  }
  /**
   * Atualiza variáveis de uma instância
   */
  async setProcessVariables(instanceId, variables) {
    await this.client.post(`/process-instance/${instanceId}/variables`, {
      modifications: this.formatVariables(variables)
    });
  }
  /**
   * Busca histórico de atividades de uma instância
   */
  async getActivityHistory(instanceId) {
    const response = await this.client.get(
      "/history/activity-instance",
      { params: { processInstanceId: instanceId } }
    );
    return response.data;
  }
  /**
   * Cancela uma instância de processo
   */
  async cancelProcess(instanceId, reason) {
    await this.client.delete(`/process-instance/${instanceId}`, {
      data: { deleteReason: reason }
    });
  }
  /**
   * Avalia uma tabela DMN
   */
  async evaluateDecision(decisionKey, variables) {
    const response = await this.client.post(
      `/decision-definition/key/${decisionKey}/evaluate`,
      { variables: this.formatVariables(variables) }
    );
    return response.data;
  }
  /**
   * Busca definições de processo disponíveis
   */
  async listProcessDefinitions() {
    const response = await this.client.get("/process-definition", {
      params: { latestVersion: true }
    });
    return response.data;
  }
  // Helper: formata variáveis para o formato Camunda
  formatVariables(vars) {
    const formatted = {};
    for (const [key, variable] of Object.entries(vars)) {
      formatted[key] = {
        value: variable.type === "Json" ? JSON.stringify(variable.value) : variable.value,
        type: variable.type
      };
    }
    return formatted;
  }
};
var camundaService = new CamundaService({
  baseUrl: process.env.CAMUNDA_URL || "http://localhost:8085",
  authToken: process.env.CAMUNDA_AUTH_TOKEN
});

// src/modules/notificacoes/notificacao.service.ts
var import_client7 = require("@prisma/client");
var import_nodemailer = __toESM(require("nodemailer"));
var prisma7 = new import_client7.PrismaClient();
var NotificacaoService = class {
  mailer;
  constructor() {
    this.mailer = import_nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025"),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : void 0
    });
  }
  /**
   * Notifica um usuário específico
   */
  async notificarUsuario(usuarioId, input) {
    const usuario = await prisma7.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || !usuario.ativo) return;
    const notificacao = await prisma7.notificacao.create({
      data: {
        usuarioId,
        proposicaoId: input.proposicaoId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        acao: input.acao
      }
    });
    try {
      await this.mailer.sendMail({
        from: process.env.SMTP_FROM || "noreply@camaramunicipal.gov.br",
        to: usuario.email,
        subject: `[C\xE2mara Municipal] ${input.titulo}`,
        html: this.gerarHtmlEmail(usuario.nome, input)
      });
    } catch (err) {
      logger.error({ err, usuarioId }, "Falha ao enviar e-mail de notifica\xE7\xE3o");
    }
    return notificacao;
  }
  /**
   * Notifica todos os usuários de um órgão
   */
  async notificarOrgao(orgaoId, input) {
    const membros = await prisma7.usuarioOrgao.findMany({
      where: { orgaoId },
      include: { usuario: { select: { id: true, ativo: true } } }
    });
    const ativos = membros.filter((m) => m.usuario.ativo);
    await Promise.allSettled(
      ativos.map((m) => this.notificarUsuario(m.usuarioId, input))
    );
  }
  /**
   * Notifica usuários com um perfil específico
   */
  async notificarPorPerfil(casaId, nomePerfil, input) {
    const perfil = await prisma7.perfil.findUnique({ where: { nome: nomePerfil } });
    if (!perfil) return;
    const usuariosPerfil = await prisma7.usuarioPerfil.findMany({
      where: { perfilId: perfil.id },
      include: {
        usuario: { select: { id: true, casaId: true, ativo: true } }
      }
    });
    const alvos = usuariosPerfil.filter(
      (up) => up.usuario.casaId === casaId && up.usuario.ativo
    );
    await Promise.allSettled(
      alvos.map((up) => this.notificarUsuario(up.usuarioId, input))
    );
  }
  /**
   * Alerta de prazo vencendo (chamado por job scheduler)
   */
  async alertarPrazos() {
    const amanha = /* @__PURE__ */ new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(23, 59, 59);
    const hoje = /* @__PURE__ */ new Date();
    hoje.setHours(0, 0, 0, 0);
    const tarefasVencendo = await prisma7.tarefaProcesso.findMany({
      where: {
        status: "PENDENTE",
        prazo: { gte: hoje, lte: amanha }
      },
      include: {
        instancia: { include: { proposicao: { select: { numero: true, id: true } } } }
      }
    });
    for (const tarefa of tarefasVencendo) {
      if (tarefa.atribuidoAId) {
        await this.notificarUsuario(tarefa.atribuidoAId, {
          tipo: "PRAZO_VENCENDO",
          titulo: `Prazo vencendo \u2014 ${tarefa.nome}`,
          mensagem: `A tarefa "${tarefa.nome}" referente \xE0 proposi\xE7\xE3o ${tarefa.instancia.proposicao.numero} vence amanh\xE3.`,
          proposicaoId: tarefa.instancia.proposicaoId,
          acao: `/proposicoes/${tarefa.instancia.proposicaoId}/tramitacao`
        });
      }
      if (tarefa.atribuidoAOrgaoId) {
        await this.notificarOrgao(tarefa.atribuidoAOrgaoId, {
          tipo: "PRAZO_VENCENDO",
          titulo: `Prazo vencendo \u2014 ${tarefa.nome}`,
          mensagem: `A tarefa "${tarefa.nome}" vence amanh\xE3.`,
          proposicaoId: tarefa.instancia.proposicaoId
        });
      }
    }
    logger.info(`Alertas de prazo enviados: ${tarefasVencendo.length} tarefas`);
  }
  /**
   * Marcar notificação como lida
   */
  async marcarLida(notificacaoId, usuarioId) {
    return prisma7.notificacao.updateMany({
      where: { id: notificacaoId, usuarioId },
      data: { lida: true, lidaEm: /* @__PURE__ */ new Date() }
    });
  }
  /**
   * Marcar todas como lidas
   */
  async marcarTodasLidas(usuarioId) {
    return prisma7.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true, lidaEm: /* @__PURE__ */ new Date() }
    });
  }
  gerarHtmlEmail(nome, input) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; }
  .header { border-bottom: 3px solid #1e4d8c; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { color: #1e4d8c; font-size: 18px; margin: 0; }
  h2 { color: #333; font-size: 16px; }
  p { color: #555; line-height: 1.6; }
  .btn { display: inline-block; background: #1e4d8c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
</style></head>
<body>
  <div class="card">
    <div class="header">
      <h1>\u{1F3DB}\uFE0F C\xE2mara Municipal</h1>
    </div>
    <p>Ol\xE1, <strong>${nome}</strong></p>
    <h2>${input.titulo}</h2>
    <p>${input.mensagem}</p>
    ${input.acao ? `<a href="${process.env.FRONTEND_URL || "http://localhost:3000"}${input.acao}" class="btn">Acessar no Sistema</a>` : ""}
    <div class="footer">
      Esta \xE9 uma notifica\xE7\xE3o autom\xE1tica do Sistema Legislativo Municipal.<br>
      Acesse o sistema para mais detalhes.
    </div>
  </div>
</body>
</html>`;
  }
};

// src/plugins/auditoria.ts
var import_client8 = require("@prisma/client");
var prisma8 = new import_client8.PrismaClient();
async function auditoriaPlugin(app) {
  app.addHook("onRequest", async (req) => {
    req.auditoria = {
      registrar: async ({ entidade, entidadeId, acao, dadosAntes, dadosDepois }) => {
        try {
          await prisma8.auditoriaLog.create({
            data: {
              entidade,
              entidadeId,
              acao,
              usuarioId: req.user?.id ?? null,
              ip: req.ip,
              endpoint: `${req.method} ${req.url}`,
              dadosAntes: dadosAntes ? dadosAntes : void 0,
              dadosDepois: dadosDepois ? dadosDepois : void 0
            }
          });
        } catch {
        }
      }
    };
  });
}
var AuditoriaService = class {
  prisma;
  constructor() {
    this.prisma = new import_client8.PrismaClient();
  }
  async registrar(data) {
    try {
      await this.prisma.auditoriaLog.create({ data });
    } catch {
    }
  }
  async listar(filtros) {
    const { entidade, entidadeId, usuarioId, de, ate, page = 1, pageSize = 50 } = filtros;
    const where = {};
    if (entidade) where.entidade = entidade;
    if (entidadeId) where.entidadeId = entidadeId;
    if (usuarioId) where.usuarioId = usuarioId;
    if (de || ate) where.criadoEm = { ...de ? { gte: de } : {}, ...ate ? { lte: ate } : {} };
    const [total, data] = await Promise.all([
      this.prisma.auditoriaLog.count({ where }),
      this.prisma.auditoriaLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: "desc" },
        include: { usuario: { select: { nome: true, email: true } } }
      })
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }
};
var auditoriaService = new AuditoriaService();

// src/modules/tramitacao/routes.ts
var prisma9 = new import_client9.PrismaClient();
var registrarEventoSchema = import_zod3.z.object({
  tipo: import_zod3.z.enum([
    "DESPACHO",
    "ENCAMINHAMENTO",
    "DEVOLUCAO",
    "SUSPENSAO",
    "REATIVACAO",
    "ANEXACAO",
    "RETIFICACAO",
    "COMPLEMENTACAO",
    "PARECER_JURIDICO",
    "PARECER_COMISSAO"
  ]),
  descricao: import_zod3.z.string().min(5).max(500),
  observacao: import_zod3.z.string().max(2e3).optional(),
  orgaoDestinoId: import_zod3.z.string().optional(),
  novoStatus: import_zod3.z.string().optional(),
  dadosAdicionais: import_zod3.z.record(import_zod3.z.unknown()).optional()
});
async function tramitacaoRoutes(app) {
  const getSvc = () => new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService);
  app.get("/:proposicaoId/historico", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const { tipo, de, ate } = req.query;
    const svc = getSvc();
    const historico = await svc.buscarHistorico({
      proposicaoId: req.params.proposicaoId,
      tipo,
      de: de ? new Date(de) : void 0,
      ate: ate ? new Date(ate) : void 0
    });
    return historico;
  });
  app.post("/:proposicaoId/evento", {
    preHandler: [requireAuth, requirePermission("tramitacao:registrar")]
  }, async (req, reply) => {
    const body = registrarEventoSchema.parse(req.body);
    const svc = getSvc();
    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: body.tipo,
      descricao: body.descricao,
      usuarioId: req.user.id,
      orgaoDestinoId: body.orgaoDestinoId,
      observacao: body.observacao,
      novoStatus: body.novoStatus,
      dadosAdicionais: body.dadosAdicionais
    }, req.user.id);
    return reply.status(201).send(evento);
  });
  app.post("/:proposicaoId/despachar", {
    preHandler: [requireAuth, requirePermission("tramitacao:despachar")]
  }, async (req, reply) => {
    const { texto, orgaoDestinoId } = req.body;
    const svc = getSvc();
    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: "DESPACHO",
      descricao: `Despacho emitido`,
      usuarioId: req.user.id,
      orgaoDestinoId,
      observacao: texto,
      novoStatus: orgaoDestinoId ? "EM_ANALISE" : void 0
    }, req.user.id);
    return reply.status(201).send(evento);
  });
  app.post("/:proposicaoId/reativar", {
    preHandler: [requireAuth, requirePermission("tramitacao:reativar")]
  }, async (req, reply) => {
    const { motivo } = req.body;
    const svc = getSvc();
    const evento = await svc.registrarEvento({
      proposicaoId: req.params.proposicaoId,
      tipo: "REATIVACAO",
      descricao: "Tramita\xE7\xE3o reativada",
      usuarioId: req.user.id,
      observacao: motivo,
      novoStatus: "EM_ANALISE"
    }, req.user.id);
    return reply.status(201).send(evento);
  });
  app.post("/:proposicaoId/completar-tarefa", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const { taskId, variaveis } = req.body;
    const camundaVars = {};
    for (const [key, val] of Object.entries(variaveis)) {
      camundaVars[key] = {
        value: val,
        type: typeof val === "boolean" ? "Boolean" : typeof val === "number" ? "Long" : "String"
      };
    }
    await camundaService.completeTask(taskId, camundaVars);
    await prisma9.tarefaProcesso.updateMany({
      where: { camundaTaskId: taskId },
      data: { status: "CONCLUIDA", concluida: true, concluidaEm: /* @__PURE__ */ new Date() }
    });
    return { ok: true };
  });
  app.get("/:proposicaoId/tarefas", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const tarefas = await prisma9.tarefaProcesso.findMany({
      where: {
        instancia: { proposicaoId: req.params.proposicaoId },
        status: "PENDENTE"
      },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }]
    });
    return tarefas;
  });
  app.get("/:proposicaoId/processo", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const instancia = await prisma9.instanciaProcesso.findUnique({
      where: { proposicaoId: req.params.proposicaoId },
      include: {
        fluxoProcesso: { select: { nome: true, camundaKey: true } },
        tarefas: { where: { status: "PENDENTE" } }
      }
    });
    if (!instancia) return reply.status(404).send({ error: "Processo n\xE3o iniciado" });
    let atividadesCamunda = [];
    if (instancia.camundaInstanceId) {
      try {
        atividadesCamunda = await camundaService.getActivityHistory(instancia.camundaInstanceId);
      } catch {
      }
    }
    return { instancia, atividadesCamunda };
  });
}

// src/modules/processos/routes.ts
var import_client10 = require("@prisma/client");
var prisma10 = new import_client10.PrismaClient();
async function processosRoutes(app) {
  app.get("/definicoes", {
    preHandler: [requireAuth, requirePermission("admin:processos")]
  }, async (req, reply) => {
    try {
      return await camundaService.listProcessDefinitions();
    } catch {
      return reply.status(503).send({ error: "Camunda indispon\xEDvel" });
    }
  });
  app.get("/instancias", {
    preHandler: [requireAuth, requirePermission("admin:processos")]
  }, async (req, reply) => {
    const page = parseInt(req.query.page || "1");
    const pageSize = 20;
    const where = {};
    if (req.query.fluxoId) where.fluxoProcessoId = req.query.fluxoId;
    if (req.query.status) where.camundaStatus = req.query.status;
    const [total, instancias] = await Promise.all([
      prisma10.instanciaProcesso.count({ where }),
      prisma10.instanciaProcesso.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: "desc" },
        include: {
          proposicao: { select: { id: true, numero: true, ementa: true, status: true } },
          fluxoProcesso: { select: { nome: true } },
          tarefas: { where: { status: "PENDENTE" }, select: { id: true, nome: true, prazo: true } }
        }
      })
    ]);
    return { data: instancias, meta: { total, page, pageSize } };
  });
  app.get("/instancias/:id", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const instancia = await prisma10.instanciaProcesso.findUnique({
      where: { id: req.params.id },
      include: {
        proposicao: true,
        fluxoProcesso: true,
        tarefas: { orderBy: { criadoEm: "desc" } }
      }
    });
    if (!instancia) return reply.status(404).send({ error: "Inst\xE2ncia n\xE3o encontrada" });
    let camundaData = null;
    if (instancia.camundaInstanceId) {
      try {
        const [instance, historico] = await Promise.all([
          camundaService.getProcessInstance(instancia.camundaInstanceId),
          camundaService.getActivityHistory(instancia.camundaInstanceId)
        ]);
        camundaData = { instance, historico };
      } catch {
      }
    }
    return { instancia, camundaData };
  });
  app.delete("/instancias/:id", {
    preHandler: [requireAuth, requirePermission("admin:processos")]
  }, async (req, reply) => {
    const { motivo } = req.body;
    const instancia = await prisma10.instanciaProcesso.findUnique({
      where: { id: req.params.id }
    });
    if (!instancia) return reply.status(404).send({ error: "Inst\xE2ncia n\xE3o encontrada" });
    if (instancia.camundaInstanceId) {
      try {
        await camundaService.cancelProcess(instancia.camundaInstanceId, motivo);
      } catch {
        req.log.warn("Falha ao cancelar no Camunda, prosseguindo com cancelamento local");
      }
    }
    await prisma10.instanciaProcesso.update({
      where: { id: req.params.id },
      data: { camundaStatus: "CANCELLED", atualizadoEm: /* @__PURE__ */ new Date() }
    });
    return { ok: true };
  });
  app.get("/tarefas/minhas", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const tarefas = await prisma10.tarefaProcesso.findMany({
      where: {
        status: "PENDENTE",
        OR: [
          { atribuidoAId: req.user.id },
          { atribuidoAOrgaoId: { in: req.user.orgaos } }
        ]
      },
      include: {
        instancia: {
          include: {
            proposicao: {
              select: {
                id: true,
                numero: true,
                ementa: true,
                status: true,
                tipoMateria: { select: { nome: true, sigla: true } }
              }
            }
          }
        }
      },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }]
    });
    return tarefas;
  });
  app.post("/tarefas/:taskId/assumir", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const tarefa = await prisma10.tarefaProcesso.findUnique({
      where: { camundaTaskId: req.params.taskId }
    });
    if (!tarefa) return reply.status(404).send({ error: "Tarefa n\xE3o encontrada" });
    await camundaService.assignTask(req.params.taskId, req.user.id);
    await prisma10.tarefaProcesso.update({
      where: { camundaTaskId: req.params.taskId },
      data: { atribuidoAId: req.user.id, status: "EM_ANDAMENTO" }
    });
    return { ok: true };
  });
  app.post("/deploy", {
    preHandler: [requireAuth, requirePermission("admin:processos")]
  }, async (req, reply) => {
    const { fluxoId } = req.body;
    const fluxo = await prisma10.fluxoProcesso.findUnique({ where: { id: fluxoId } });
    if (!fluxo) return reply.status(404).send({ error: "Fluxo n\xE3o encontrado" });
    const deploy = await camundaService.deployProcess(fluxo.nome, fluxo.bpmnXml);
    await prisma10.fluxoProcesso.update({
      where: { id: fluxoId },
      data: {
        camundaKey: deploy.id,
        status: "ATIVO",
        publicadoEm: /* @__PURE__ */ new Date()
      }
    });
    return { ok: true, deploy };
  });
  app.post("/avaliar-decisao", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const { decisionKey, variaveis } = req.body;
    const camundaVars = {};
    for (const [key, val] of Object.entries(variaveis)) {
      camundaVars[key] = { value: val, type: typeof val === "boolean" ? "Boolean" : "String" };
    }
    const resultado = await camundaService.evaluateDecision(decisionKey, camundaVars);
    return { resultado };
  });
}

// src/modules/sessoes/routes.ts
var import_client11 = require("@prisma/client");
var import_zod4 = require("zod");
var prisma11 = new import_client11.PrismaClient();
var criarSessaoSchema = import_zod4.z.object({
  numero: import_zod4.z.string(),
  tipo: import_zod4.z.enum(["ORDINARIA", "EXTRAORDINARIA", "ESPECIAL", "SOLENE", "SECRETA"]),
  data: import_zod4.z.string().datetime(),
  horaInicio: import_zod4.z.string().optional(),
  local: import_zod4.z.string().optional(),
  quorumMinimo: import_zod4.z.number().int().min(1).optional(),
  observacoes: import_zod4.z.string().optional()
});
var registrarVotoSchema = import_zod4.z.object({
  proposicaoId: import_zod4.z.string().cuid(),
  votos: import_zod4.z.array(import_zod4.z.object({
    vereadorId: import_zod4.z.string().cuid(),
    voto: import_zod4.z.enum(["SIM", "NAO", "ABSTENCAO", "AUSENTE"]),
    justificativa: import_zod4.z.string().optional()
  }))
});
async function sessoesRoutes(app) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { status, tipo, de, ate } = req.query;
      const sessoes = await prisma11.sessaoLegislativa.findMany({
        where: {
          casaId: req.user.casaId,
          ...status ? { status } : {},
          ...tipo ? { tipo } : {},
          ...de || ate ? { data: { gte: de ? new Date(de) : void 0, lte: ate ? new Date(ate) : void 0 } } : {}
        },
        orderBy: { data: "desc" },
        include: {
          _count: { select: { pauta: true, presencas: true, votos: true } }
        }
      });
      return sessoes;
    }
  );
  app.post("/", {
    preHandler: [requireAuth, requirePermission("sessoes:criar")]
  }, async (req, reply) => {
    const body = criarSessaoSchema.parse(req.body);
    const sessao = await prisma11.sessaoLegislativa.create({
      data: {
        casaId: req.user.casaId,
        numero: body.numero,
        tipo: body.tipo,
        data: new Date(body.data),
        horaInicio: body.horaInicio,
        local: body.local,
        quorumMinimo: body.quorumMinimo,
        observacoes: body.observacoes,
        status: "AGENDADA"
      }
    });
    return reply.status(201).send(sessao);
  });
  app.get(
    "/:id",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const sessao = await prisma11.sessaoLegislativa.findUnique({
        where: { id: req.params.id },
        include: {
          pauta: {
            orderBy: { ordem: "asc" },
            include: {
              proposicao: {
                include: {
                  tipoMateria: { select: { nome: true, sigla: true } },
                  autor: { select: { nome: true } }
                }
              }
            }
          },
          presencas: true,
          votos: {
            include: {
              proposicao: { select: { numero: true, ementa: true } }
            }
          }
        }
      });
      if (!sessao) return reply.status(404).send({ error: "Sess\xE3o n\xE3o encontrada" });
      return sessao;
    }
  );
  app.post("/:id/pauta", {
    preHandler: [requireAuth, requirePermission("sessoes:pauta")]
  }, async (req, reply) => {
    const { proposicaoId, tipo } = req.body;
    const proposicao = await prisma11.proposicao.findUnique({ where: { id: proposicaoId } });
    if (!proposicao) return reply.status(404).send({ error: "Proposi\xE7\xE3o n\xE3o encontrada" });
    const statusPermitidosPauta = ["EM_COMISSAO", "EM_ANALISE", "EM_PAUTA"];
    if (!statusPermitidosPauta.includes(proposicao.status)) {
      return reply.status(422).send({
        error: "Status inv\xE1lido",
        message: `Proposi\xE7\xE3o com status ${proposicao.status} n\xE3o pode ser inclu\xEDda em pauta`
      });
    }
    const maxOrdem = await prisma11.itemPauta.aggregate({
      where: { sessaoId: req.params.id },
      _max: { ordem: true }
    });
    const ordem = (maxOrdem._max.ordem ?? 0) + 1;
    const item = await prisma11.itemPauta.create({
      data: { sessaoId: req.params.id, proposicaoId, tipo, ordem }
    });
    await prisma11.proposicao.update({
      where: { id: proposicaoId },
      data: { status: "EM_PAUTA" }
    });
    const tramitacaoSvc = new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService);
    await tramitacaoSvc.registrarEvento({
      proposicaoId,
      tipo: "INCLUSAO_PAUTA",
      descricao: `Inclu\xEDdo na pauta da sess\xE3o ${req.params.id}`,
      usuarioId: req.user.id,
      novoStatus: "EM_PAUTA",
      dadosAdicionais: { sessaoId: req.params.id, ordem, tipoPauta: tipo }
    }, req.user.id);
    return reply.status(201).send(item);
  });
  app.post("/:id/abrir", {
    preHandler: [requireAuth, requirePermission("sessoes:conduzir")]
  }, async (req, reply) => {
    const sessao = await prisma11.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { status: "ABERTA" }
    });
    return sessao;
  });
  app.post("/:id/presencas", {
    preHandler: [requireAuth, requirePermission("sessoes:conduzir")]
  }, async (req, reply) => {
    const { presencas } = req.body;
    const ops = presencas.map(
      (p) => prisma11.presencaSessao.upsert({
        where: { sessaoId_vereadorId: { sessaoId: req.params.id, vereadorId: p.vereadorId } },
        create: { sessaoId: req.params.id, vereadorId: p.vereadorId, presente: p.presente, justificativa: p.justificativa },
        update: { presente: p.presente, justificativa: p.justificativa }
      })
    );
    const resultado = await prisma11.$transaction(ops);
    const presentes = presencas.filter((p) => p.presente).length;
    await prisma11.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { presentes }
    });
    return { presentes, total: presencas.length, registros: resultado };
  });
  app.post("/:id/votar", {
    preHandler: [requireAuth, requirePermission("sessoes:votar")]
  }, async (req, reply) => {
    const body = registrarVotoSchema.parse(req.body);
    const sessao = await prisma11.sessaoLegislativa.findUnique({
      where: { id: req.params.id },
      include: { presencas: { where: { presente: true } } }
    });
    if (!sessao) return reply.status(404).send({ error: "Sess\xE3o n\xE3o encontrada" });
    if (sessao.status !== "ABERTA") return reply.status(422).send({ error: "Sess\xE3o n\xE3o est\xE1 aberta" });
    const presentes = sessao.presencas.length;
    if (sessao.quorumMinimo && presentes < sessao.quorumMinimo) {
      return reply.status(422).send({
        error: "Qu\xF3rum insuficiente",
        message: `Presentes: ${presentes}. M\xEDnimo: ${sessao.quorumMinimo}`
      });
    }
    const ops = body.votos.map(
      (v) => prisma11.votoRegistrado.upsert({
        where: { sessaoId_proposicaoId_vereadorId: {
          sessaoId: req.params.id,
          proposicaoId: body.proposicaoId,
          vereadorId: v.vereadorId
        } },
        create: { sessaoId: req.params.id, proposicaoId: body.proposicaoId, vereadorId: v.vereadorId, voto: v.voto, justificativa: v.justificativa },
        update: { voto: v.voto, justificativa: v.justificativa }
      })
    );
    const votosRegistrados = await prisma11.$transaction(ops);
    const sim = body.votos.filter((v) => v.voto === "SIM").length;
    const nao = body.votos.filter((v) => v.voto === "NAO").length;
    const abstencao = body.votos.filter((v) => v.voto === "ABSTENCAO").length;
    const aprovado = sim > nao;
    const tramitacaoSvc = new TramitacaoService(camundaService, new NotificacaoService(), auditoriaService);
    await tramitacaoSvc.registrarEvento({
      proposicaoId: body.proposicaoId,
      tipo: "VOTACAO",
      descricao: `Vota\xE7\xE3o realizada na sess\xE3o ${sessao.numero}: ${aprovado ? "APROVADO" : "REJEITADO"} (${sim} \xD7 ${nao})`,
      usuarioId: req.user.id,
      novoStatus: aprovado ? "APROVADO" : "REJEITADO",
      dadosAdicionais: { sim, nao, abstencao, aprovado, sessaoId: req.params.id, presentes }
    }, req.user.id);
    await prisma11.itemPauta.updateMany({
      where: { sessaoId: req.params.id, proposicaoId: body.proposicaoId },
      data: { situacao: "VOTADO" }
    });
    return {
      resultado: aprovado ? "APROVADO" : "REJEITADO",
      sim,
      nao,
      abstencao,
      presentes,
      votos: votosRegistrados
    };
  });
  app.post("/:id/encerrar", {
    preHandler: [requireAuth, requirePermission("sessoes:conduzir")]
  }, async (req, reply) => {
    const { ata } = req.body;
    const sessao = await prisma11.sessaoLegislativa.update({
      where: { id: req.params.id },
      data: { status: "ENCERRADA", ata }
    });
    return sessao;
  });
  app.get("/:id/resultado/:proposicaoId", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const votos = await prisma11.votoRegistrado.findMany({
      where: { sessaoId: req.params.id, proposicaoId: req.params.proposicaoId }
    });
    const sim = votos.filter((v) => v.voto === "SIM").length;
    const nao = votos.filter((v) => v.voto === "NAO").length;
    const abstencao = votos.filter((v) => v.voto === "ABSTENCAO").length;
    const ausente = votos.filter((v) => v.voto === "AUSENTE").length;
    return { votos, resumo: { sim, nao, abstencao, ausente, total: votos.length } };
  });
}

// src/modules/documentos/routes.ts
var import_client12 = require("@prisma/client");
var import_crypto2 = require("crypto");
var import_minio = require("minio");
var prisma12 = new import_client12.PrismaClient();
var minio = new import_minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "legislativo",
  secretKey: process.env.MINIO_SECRET_KEY || "legislativo_secret_minio"
});
var BUCKET = process.env.MINIO_BUCKET || "legislativo-documentos";
async function documentosRoutes(app) {
  app.post("/upload", {
    preHandler: [requireAuth, requirePermission("documentos:criar")]
  }, async (req, reply) => {
    const parts = req.parts();
    let proposicaoId;
    let tipo = "OUTROS";
    let nome = "";
    let fileBuffer;
    let mimeType = "application/octet-stream";
    let fileName = "documento";
    for await (const part of parts) {
      if (part.type === "field") {
        if (part.fieldname === "proposicaoId") proposicaoId = part.value;
        if (part.fieldname === "tipo") tipo = part.value;
        if (part.fieldname === "nome") nome = part.value;
      } else {
        mimeType = part.mimetype;
        fileName = part.filename || "documento";
        const chunks = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
      }
    }
    if (!fileBuffer) {
      return reply.status(400).send({ error: "Nenhum arquivo enviado" });
    }
    const hash = (0, import_crypto2.createHash)("sha256").update(fileBuffer).digest("hex");
    const storageKey = `${proposicaoId || "avulso"}/${Date.now()}-${fileName}`;
    const bucketExists = await minio.bucketExists(BUCKET);
    if (!bucketExists) await minio.makeBucket(BUCKET);
    await minio.putObject(BUCKET, storageKey, fileBuffer, fileBuffer.length, {
      "Content-Type": mimeType,
      "X-File-Hash": hash
    });
    const documento = await prisma12.documento.create({
      data: {
        proposicaoId: proposicaoId || null,
        nome: nome || fileName,
        tipo,
        status: "RASCUNHO",
        storageKey,
        mimeType,
        tamanho: fileBuffer.length,
        hash,
        versaoAtual: 1,
        metadados: { fileName, uploadedBy: req.user.id }
      }
    });
    await prisma12.versaoDocumento.create({
      data: {
        documentoId: documento.id,
        versao: 1,
        storageKey,
        hash,
        alteracoes: "Vers\xE3o inicial",
        criadoPorId: req.user.id
      }
    });
    return reply.status(201).send(documento);
  });
  app.get("/:id/download", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const documento = await prisma12.documento.findUnique({ where: { id: req.params.id } });
    if (!documento) return reply.status(404).send({ error: "Documento n\xE3o encontrado" });
    let storageKey = documento.storageKey;
    if (req.query.versao) {
      const versao = await prisma12.versaoDocumento.findUnique({
        where: { documentoId_versao: { documentoId: documento.id, versao: parseInt(req.query.versao) } }
      });
      if (!versao) return reply.status(404).send({ error: "Vers\xE3o n\xE3o encontrada" });
      storageKey = versao.storageKey;
    }
    const url = await minio.presignedGetObject(BUCKET, storageKey, 3600);
    await req.auditoria.registrar({
      entidade: "Documento",
      entidadeId: documento.id,
      acao: "LER"
    });
    return { url, expiresIn: 3600 };
  });
  app.get("/proposicao/:proposicaoId", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const documentos = await prisma12.documento.findMany({
      where: { proposicaoId: req.params.proposicaoId },
      include: {
        versoes: { orderBy: { versao: "desc" }, take: 3 },
        assinaturas: {
          include: { usuario: { select: { nome: true, cargo: true } } }
        }
      },
      orderBy: { criadoEm: "desc" }
    });
    return documentos;
  });
  app.post("/:id/versao", {
    preHandler: [requireAuth, requirePermission("documentos:criar")]
  }, async (req, reply) => {
    const documento = await prisma12.documento.findUnique({ where: { id: req.params.id } });
    if (!documento) return reply.status(404).send({ error: "Documento n\xE3o encontrado" });
    const parts = req.parts();
    let fileBuffer;
    let alteracoes = "";
    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "alteracoes") {
        alteracoes = part.value;
      } else if (part.type !== "field") {
        const chunks = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
      }
    }
    if (!fileBuffer) return reply.status(400).send({ error: "Arquivo n\xE3o enviado" });
    const hash = (0, import_crypto2.createHash)("sha256").update(fileBuffer).digest("hex");
    const novaVersao = documento.versaoAtual + 1;
    const storageKey = `${documento.proposicaoId}/${Date.now()}-v${novaVersao}`;
    await minio.putObject(BUCKET, storageKey, fileBuffer);
    const [versao] = await prisma12.$transaction([
      prisma12.versaoDocumento.create({
        data: { documentoId: documento.id, versao: novaVersao, storageKey, hash, alteracoes, criadoPorId: req.user.id }
      }),
      prisma12.documento.update({
        where: { id: documento.id },
        data: { versaoAtual: novaVersao, storageKey, hash }
      })
    ]);
    return reply.status(201).send(versao);
  });
  app.post("/:id/assinar", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const body = req.body;
    const documento = await prisma12.documento.findUnique({ where: { id: req.params.id } });
    if (!documento) return reply.status(404).send({ error: "Documento n\xE3o encontrado" });
    const assinaturaHash = (0, import_crypto2.createHash)("sha256").update(`${documento.id}-${documento.hash}-${req.user.id}-${Date.now()}`).digest("hex");
    const assinatura = await prisma12.assinaturaDocumento.create({
      data: {
        documentoId: documento.id,
        usuarioId: req.user.id,
        tipo: body.tipo,
        status: "ASSINADO",
        hash: assinaturaHash,
        observacao: body.observacao,
        assinadoEm: /* @__PURE__ */ new Date()
      }
    });
    await req.auditoria.registrar({
      entidade: "Documento",
      entidadeId: documento.id,
      acao: "ASSINAR",
      dadosDepois: { assinaturaId: assinatura.id, tipo: body.tipo }
    });
    return reply.status(201).send(assinatura);
  });
  app.patch("/:id/status", {
    preHandler: [requireAuth, requirePermission("documentos:editar")]
  }, async (req, reply) => {
    const { status } = req.body;
    const doc = await prisma12.documento.update({
      where: { id: req.params.id },
      data: { status }
    });
    return doc;
  });
}

// src/modules/documentos/pdf.routes.ts
var import_client13 = require("@prisma/client");

// src/lib/pdf.service.ts
var import_pdfmake = __toESM(require("pdfmake"));
var fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique"
  }
};
var printer = new import_pdfmake.default(fonts);
var estilosBase = {
  cabecalho: { fontSize: 10, bold: false, color: "#444444" },
  titulo: { fontSize: 14, bold: true, alignment: "center", margin: [0, 12, 0, 4] },
  subtitulo: { fontSize: 11, bold: true, margin: [0, 8, 0, 4] },
  corpo: { fontSize: 10, lineHeight: 1.5 },
  rodape: { fontSize: 8, color: "#888888", alignment: "center" },
  destaque: { fontSize: 10, bold: true, color: "#1e4d8c" },
  label: { fontSize: 9, color: "#666666", bold: true },
  valor: { fontSize: 10 }
};
function cabecalhoCamara(nomeCamara, municipio) {
  return [
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: nomeCamara.toUpperCase(), style: "titulo", fontSize: 13 },
            { text: municipio, alignment: "center", fontSize: 10, color: "#555555" }
          ]
        }
      ],
      margin: [0, 0, 0, 12]
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#1e4d8c" }] },
    { text: "", margin: [0, 0, 0, 12] }
  ];
}
function rodapePadrao(pagina, totalPaginas, geradoEm) {
  return {
    columns: [
      { text: `Gerado em: ${geradoEm}`, style: "rodape", alignment: "left" },
      { text: `P\xE1gina ${pagina} de ${totalPaginas}`, style: "rodape", alignment: "right" }
    ],
    margin: [0, 8, 0, 0]
  };
}
async function gerarDespacho(params) {
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [60, 80, 60, 60],
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    styles: estilosBase,
    header: (currentPage, pageCount) => ({
      stack: cabecalhoCamara(params.nomeCamara, params.municipio),
      margin: [60, 30, 60, 0]
    }),
    footer: (currentPage, pageCount) => ({
      ...rodapePadrao(currentPage, pageCount, params.data.toLocaleDateString("pt-BR")),
      margin: [60, 0, 60, 20]
    }),
    content: [
      { text: "DESPACHO", style: "titulo" },
      { text: "", margin: [0, 8] },
      {
        table: {
          widths: [100, "*"],
          body: [
            [
              { text: "Proposi\xE7\xE3o:", style: "label", border: [false, false, false, false] },
              { text: params.proposicao.numero, style: "destaque", border: [false, false, false, false] }
            ],
            [
              { text: "Tipo:", style: "label", border: [false, false, false, false] },
              { text: params.proposicao.tipoMateria.nome, style: "valor", border: [false, false, false, false] }
            ],
            [
              { text: "Ementa:", style: "label", border: [false, false, false, false] },
              { text: params.proposicao.ementa, style: "valor", border: [false, false, false, false] }
            ]
          ]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 16]
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 395, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }] },
      { text: "", margin: [0, 8] },
      { text: params.texto, style: "corpo", alignment: "justify" },
      { text: "", margin: [0, 32] },
      {
        stack: [
          { text: "_".repeat(50), alignment: "center", margin: [0, 0, 0, 4] },
          { text: params.autorNome, bold: true, alignment: "center" },
          { text: params.autorCargo, alignment: "center", color: "#555555", fontSize: 9 },
          { text: params.municipio + ", " + params.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), alignment: "center", fontSize: 9, margin: [0, 4, 0, 0] }
        ]
      }
    ]
  };
  return bufferFromDoc(docDefinition);
}
async function gerarPautaSessao(params) {
  const tipoSessao = {
    ORDINARIA: "Ordin\xE1ria",
    EXTRAORDINARIA: "Extraordin\xE1ria",
    ESPECIAL: "Especial",
    SOLENE: "Solene"
  };
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [60, 80, 60, 60],
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    styles: estilosBase,
    header: () => ({ stack: cabecalhoCamara(params.nomeCamara, params.municipio), margin: [60, 30, 60, 0] }),
    footer: (c, t) => ({ ...rodapePadrao(c, t, (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")), margin: [60, 0, 60, 20] }),
    content: [
      { text: "PAUTA DE SESS\xC3O", style: "titulo" },
      {
        text: `${tipoSessao[params.sessao.tipo] ?? params.sessao.tipo} n.\xBA ${params.sessao.numero}`,
        alignment: "center",
        bold: true,
        fontSize: 11,
        margin: [0, 0, 0, 4]
      },
      {
        text: `${new Date(params.sessao.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} \xB7 ${params.sessao.horaInicio ?? ""}`,
        alignment: "center",
        fontSize: 10,
        color: "#555555",
        margin: [0, 0, 0, 4]
      },
      {
        text: params.sessao.local ?? "",
        alignment: "center",
        fontSize: 10,
        color: "#555555",
        margin: [0, 0, 0, 16]
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 395, y2: 0, lineWidth: 1, lineColor: "#1e4d8c" }] },
      { text: "", margin: [0, 8] },
      { text: "ORDEM DO DIA", style: "subtitulo" },
      { text: "", margin: [0, 4] },
      {
        table: {
          widths: [20, 80, "*", 100],
          headerRows: 1,
          body: [
            [
              { text: "#", bold: true, fillColor: "#f0f4f8", fontSize: 9 },
              { text: "Proposi\xE7\xE3o", bold: true, fillColor: "#f0f4f8", fontSize: 9 },
              { text: "Ementa", bold: true, fillColor: "#f0f4f8", fontSize: 9 },
              { text: "Tipo", bold: true, fillColor: "#f0f4f8", fontSize: 9 }
            ],
            ...params.itens.map((item) => [
              { text: String(item.ordem), fontSize: 9, alignment: "center" },
              { text: item.proposicao.numero, fontSize: 9, bold: true, color: "#1e4d8c" },
              {
                stack: [
                  { text: item.proposicao.ementa, fontSize: 9 },
                  item.proposicao.autor ? { text: `Autoria: ${item.proposicao.autor.nome}`, fontSize: 8, color: "#777777", margin: [0, 2, 0, 0] } : ""
                ]
              },
              { text: item.tipo.replace(/_/g, " "), fontSize: 9 }
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#dddddd",
          vLineColor: () => "#dddddd"
        }
      },
      { text: "", margin: [0, 24] },
      {
        text: `${params.municipio}, ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
        alignment: "right",
        fontSize: 9,
        color: "#555555"
      }
    ]
  };
  return bufferFromDoc(docDefinition);
}
async function gerarRelatorioProposicoes(params) {
  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 70, 40, 50],
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    styles: estilosBase,
    header: () => ({ stack: cabecalhoCamara(params.nomeCamara, params.municipio), margin: [40, 20, 40, 0] }),
    footer: (c, t) => ({ ...rodapePadrao(c, t, (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")), margin: [40, 0, 40, 15] }),
    content: [
      { text: "RELAT\xD3RIO DE PROPOSI\xC7\xD5ES", style: "titulo" },
      {
        text: `Gerado em ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")} \xB7 Total: ${params.proposicoes.length} proposi\xE7\xF5es`,
        alignment: "center",
        fontSize: 9,
        color: "#555555",
        margin: [0, 0, 0, 12]
      },
      {
        table: {
          widths: [70, "*", 80, 80, 60],
          headerRows: 1,
          body: [
            [
              { text: "N\xFAmero", bold: true, fillColor: "#1e4d8c", color: "white", fontSize: 9 },
              { text: "Ementa", bold: true, fillColor: "#1e4d8c", color: "white", fontSize: 9 },
              { text: "Autoria", bold: true, fillColor: "#1e4d8c", color: "white", fontSize: 9 },
              { text: "Status", bold: true, fillColor: "#1e4d8c", color: "white", fontSize: 9 },
              { text: "Data", bold: true, fillColor: "#1e4d8c", color: "white", fontSize: 9 }
            ],
            ...params.proposicoes.map((p, i) => [
              { text: p.numero, fontSize: 9, bold: true, color: "#1e4d8c", fillColor: i % 2 === 0 ? "#f9f9f9" : "white" },
              { text: p.ementa.slice(0, 120) + (p.ementa.length > 120 ? "..." : ""), fontSize: 8, fillColor: i % 2 === 0 ? "#f9f9f9" : "white" },
              { text: p.autor?.nome ?? "\u2014", fontSize: 8, fillColor: i % 2 === 0 ? "#f9f9f9" : "white" },
              { text: p.status.replace(/_/g, " "), fontSize: 8, fillColor: i % 2 === 0 ? "#f9f9f9" : "white" },
              {
                text: p.criadoEm ? new Date(p.criadoEm).toLocaleDateString("pt-BR") : "\u2014",
                fontSize: 8,
                fillColor: i % 2 === 0 ? "#f9f9f9" : "white"
              }
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#eeeeee"
        }
      }
    ]
  };
  return bufferFromDoc(docDefinition);
}
function bufferFromDoc(docDef) {
  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDef);
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

// src/modules/documentos/pdf.routes.ts
var prisma13 = new import_client13.PrismaClient();
async function pdfRoutes(app) {
  app.get("/despacho/:eventoId", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const evento = await prisma13.tramitacaoEvento.findUnique({
      where: { id: req.params.eventoId },
      include: {
        proposicao: { include: { tipoMateria: true } },
        usuario: { select: { nome: true, cargo: true } }
      }
    });
    if (!evento) return reply.status(404).send({ error: "Evento n\xE3o encontrado" });
    const casa = await prisma13.casaLegislativa.findUnique({
      where: { id: req.user.casaId }
    });
    const pdfBuffer = await gerarDespacho({
      proposicao: {
        numero: evento.proposicao.numero,
        ementa: evento.proposicao.ementa,
        tipoMateria: { nome: evento.proposicao.tipoMateria.nome, sigla: evento.proposicao.tipoMateria.sigla }
      },
      texto: evento.observacao ?? evento.descricao,
      autorNome: evento.usuario?.nome ?? "Secretaria",
      autorCargo: evento.usuario?.cargo ?? "",
      nomeCamara: casa?.nome ?? "C\xE2mara Municipal",
      municipio: casa?.municipio ?? "",
      data: new Date(evento.criadoEm)
    });
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="despacho-${evento.proposicao.numero.replace("/", "-")}.pdf"`);
    return reply.send(pdfBuffer);
  });
  app.get("/pauta/:sessaoId", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const sessao = await prisma13.sessaoLegislativa.findUnique({
      where: { id: req.params.sessaoId },
      include: {
        pauta: {
          orderBy: { ordem: "asc" },
          include: {
            proposicao: {
              include: {
                autor: { select: { nome: true } }
              }
            }
          }
        },
        casa: { select: { nome: true, municipio: true } }
      }
    });
    if (!sessao) return reply.status(404).send({ error: "Sess\xE3o n\xE3o encontrada" });
    const pdfBuffer = await gerarPautaSessao({
      sessao: {
        numero: sessao.numero,
        tipo: sessao.tipo,
        data: sessao.data.toISOString(),
        horaInicio: sessao.horaInicio ?? void 0,
        local: sessao.local ?? void 0
      },
      itens: sessao.pauta.map((item) => ({
        ordem: item.ordem,
        tipo: item.tipo,
        proposicao: {
          numero: item.proposicao.numero,
          ementa: item.proposicao.ementa,
          autor: item.proposicao.autor
        }
      })),
      nomeCamara: sessao.casa?.nome ?? "C\xE2mara Municipal",
      municipio: sessao.casa?.municipio ?? ""
    });
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="pauta-sessao-${sessao.numero.replace("/", "-")}.pdf"`);
    return reply.send(pdfBuffer);
  });
  app.get("/relatorio/proposicoes", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const where = { casaId: req.user.casaId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.tipoMateriaId) where.tipoMateriaId = req.query.tipoMateriaId;
    if (req.query.de || req.query.ate) {
      where.criadoEm = {
        ...req.query.de ? { gte: new Date(req.query.de) } : {},
        ...req.query.ate ? { lte: new Date(req.query.ate) } : {}
      };
    }
    const [proposicoes, casa] = await Promise.all([
      prisma13.proposicao.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        include: {
          tipoMateria: { select: { nome: true, sigla: true } },
          autor: { select: { nome: true } }
        },
        take: 500
      }),
      prisma13.casaLegislativa.findUnique({ where: { id: req.user.casaId } })
    ]);
    const pdfBuffer = await gerarRelatorioProposicoes({
      proposicoes: proposicoes.map((p) => ({
        numero: p.numero,
        ementa: p.ementa,
        status: p.status,
        criadoEm: p.criadoEm.toISOString(),
        tipoMateria: p.tipoMateria,
        autor: p.autor
      })),
      filtros: req.query,
      nomeCamara: casa?.nome ?? "C\xE2mara Municipal",
      municipio: casa?.municipio ?? ""
    });
    const dataStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="relatorio-proposicoes-${dataStr}.pdf"`);
    return reply.send(pdfBuffer);
  });
}

// src/modules/usuarios/routes.ts
var import_client14 = require("@prisma/client");
var prisma14 = new import_client14.PrismaClient();
async function usuariosRoutes(app) {
  app.get(
    "/me",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const usuario = await prisma14.usuario.findUnique({
        where: { id: req.user.id },
        include: {
          orgaos: { include: { orgao: { select: { nome: true, sigla: true, tipo: true } } } },
          perfis: { include: { perfil: { select: { nome: true, descricao: true } } } }
        }
      });
      if (!usuario) return reply.status(404).send({ error: "Usu\xE1rio n\xE3o encontrado" });
      return usuario;
    }
  );
  app.get(
    "/me/tarefas",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const tarefas = await prisma14.tarefaProcesso.findMany({
        where: {
          status: "PENDENTE",
          OR: [
            { atribuidoAId: req.user.id },
            { atribuidoAOrgaoId: { in: req.user.orgaos } }
          ]
        },
        include: {
          instancia: {
            include: {
              proposicao: { select: { id: true, numero: true, ementa: true, status: true } }
            }
          }
        },
        orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }]
      });
      return tarefas;
    }
  );
  app.patch(
    "/me",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { cargo } = req.body;
      const usuario = await prisma14.usuario.update({
        where: { id: req.user.id },
        data: { ...cargo ? { cargo } : {} }
      });
      return usuario;
    }
  );
}

// src/modules/auditoria/routes.ts
async function auditoriaRoutes(app) {
  app.get("/", {
    preHandler: [requireAuth, requirePermission("auditoria:listar")]
  }, async (req, reply) => {
    const { entidade, entidadeId, usuarioId, de, ate, page, pageSize } = req.query;
    return auditoriaService.listar({
      entidade,
      entidadeId,
      usuarioId,
      de: de ? new Date(de) : void 0,
      ate: ate ? new Date(ate) : void 0,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50
    });
  });
  app.get("/exportar", {
    preHandler: [requireAuth, requirePermission("auditoria:exportar")]
  }, async (req, reply) => {
    const csv = await auditoriaService.exportar({
      entidade: req.query.entidade,
      de: req.query.de ? new Date(req.query.de) : void 0,
      ate: req.query.ate ? new Date(req.query.ate) : void 0
    });
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="auditoria-${Date.now()}.csv"`);
    return reply.send(csv);
  });
}

// src/modules/admin/routes.ts
var import_client15 = require("@prisma/client");
var import_zod5 = require("zod");
var import_fs = require("fs");
var import_path = __toESM(require("path"));
var prisma15 = new import_client15.PrismaClient();
async function adminRoutes(app) {
  app.get(
    "/tipos-materia",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return prisma15.tipoMateria.findMany({
        where: { casaId: req.user.casaId, ativo: true },
        orderBy: { nome: "asc" }
      });
    }
  );
  app.post("/tipos-materia", {
    preHandler: [requireAuth, requirePermission("admin:tipos-materia")]
  }, async (req, reply) => {
    const body = import_zod5.z.object({
      nome: import_zod5.z.string(),
      sigla: import_zod5.z.string().max(10),
      prefixoNumero: import_zod5.z.string().max(10),
      descricao: import_zod5.z.string().optional(),
      exigeParecerJuridico: import_zod5.z.boolean().default(false),
      exigeComissao: import_zod5.z.boolean().default(true),
      prazoTramitacao: import_zod5.z.number().optional()
    }).parse(req.body);
    const tipo = await prisma15.tipoMateria.create({
      data: { ...body, casaId: req.user.casaId }
    });
    return reply.status(201).send(tipo);
  });
  app.get(
    "/fluxos",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return prisma15.fluxoProcesso.findMany({
        include: { tipoMateria: { select: { nome: true, sigla: true } } },
        orderBy: { criadoEm: "desc" }
      });
    }
  );
  app.post("/fluxos", {
    preHandler: [requireAuth, requirePermission("admin:fluxos")]
  }, async (req, reply) => {
    const body = import_zod5.z.object({
      nome: import_zod5.z.string(),
      tipoMateriaId: import_zod5.z.string().optional(),
      descricao: import_zod5.z.string().optional(),
      bpmnXml: import_zod5.z.string()
    }).parse(req.body);
    const fluxo = await prisma15.fluxoProcesso.create({
      data: { ...body, status: "RASCUNHO" }
    });
    return reply.status(201).send(fluxo);
  });
  app.post("/fluxos/:id/deploy", {
    preHandler: [requireAuth, requirePermission("admin:fluxos")]
  }, async (req, reply) => {
    const fluxo = await prisma15.fluxoProcesso.findUnique({ where: { id: req.params.id } });
    if (!fluxo) return reply.status(404).send({ error: "Fluxo n\xE3o encontrado" });
    const deploy = await camundaService.deployProcess(fluxo.nome, fluxo.bpmnXml);
    await prisma15.fluxoProcesso.update({
      where: { id: fluxo.id },
      data: {
        camundaKey: deploy.id,
        camundaVersion: 1,
        status: "ATIVO",
        publicadoEm: /* @__PURE__ */ new Date()
      }
    });
    return { deploy, fluxoId: fluxo.id };
  });
  app.get(
    "/fluxos/template/basico",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const bpmnPath = import_path.default.resolve(
        process.cwd(),
        "../../infra/camunda/bpmn/tramitacao_proposicao_basica.bpmn"
      );
      try {
        const xml = (0, import_fs.readFileSync)(bpmnPath, "utf-8");
        return { xml };
      } catch {
        return reply.status(404).send({ error: "Template n\xE3o encontrado" });
      }
    }
  );
  app.get(
    "/regras",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return prisma15.regra.findMany({
        where: { ativo: true },
        include: { tipoMateria: { select: { nome: true, sigla: true } } },
        orderBy: [{ prioridade: "desc" }, { criadoEm: "desc" }]
      });
    }
  );
  app.post("/regras", {
    preHandler: [requireAuth, requirePermission("admin:regras")]
  }, async (req, reply) => {
    const body = import_zod5.z.object({
      nome: import_zod5.z.string(),
      descricao: import_zod5.z.string().optional(),
      tipo: import_zod5.z.enum(["ROTEAMENTO", "VALIDACAO", "PRAZO", "NOTIFICACAO", "BLOQUEIO", "QUORUM"]),
      tipoMateriaId: import_zod5.z.string().optional(),
      condicoes: import_zod5.z.record(import_zod5.z.unknown()),
      acoes: import_zod5.z.record(import_zod5.z.unknown()),
      prioridade: import_zod5.z.number().default(0)
    }).parse(req.body);
    const regra = await prisma15.regra.create({ data: body });
    return reply.status(201).send(regra);
  });
  app.patch("/regras/:id", {
    preHandler: [requireAuth, requirePermission("admin:regras")]
  }, async (req, reply) => {
    const regra = await prisma15.regra.update({
      where: { id: req.params.id },
      data: { ...req.body, versao: { increment: 1 } }
    });
    return regra;
  });
  app.get("/usuarios", {
    preHandler: [requireAuth, requirePermission("admin:usuarios")]
  }, async (req, reply) => {
    return prisma15.usuario.findMany({
      where: { casaId: req.user.casaId },
      include: {
        orgaos: { include: { orgao: { select: { nome: true, sigla: true } } } },
        perfis: { include: { perfil: { select: { nome: true } } } }
      },
      orderBy: { nome: "asc" }
    });
  });
  app.patch("/usuarios/:id/perfis", {
    preHandler: [requireAuth, requirePermission("admin:usuarios")]
  }, async (req, reply) => {
    const { perfis } = req.body;
    await prisma15.usuarioPerfil.deleteMany({ where: { usuarioId: req.params.id } });
    const perfisEncontrados = await prisma15.perfil.findMany({ where: { nome: { in: perfis } } });
    await prisma15.usuarioPerfil.createMany({
      data: perfisEncontrados.map((p) => ({ usuarioId: req.params.id, perfilId: p.id }))
    });
    return { ok: true, perfis: perfisEncontrados.map((p) => p.nome) };
  });
  app.get(
    "/orgaos",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return prisma15.orgao.findMany({
        where: { casaId: req.user.casaId, ativo: true },
        include: { _count: { select: { usuarios: true } } },
        orderBy: { nome: "asc" }
      });
    }
  );
  app.get(
    "/configuracoes",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return prisma15.casaLegislativa.findUnique({
        where: { id: req.user.casaId },
        select: { nome: true, sigla: true, municipio: true, uf: true, configuracoes: true }
      });
    }
  );
  app.patch("/configuracoes", {
    preHandler: [requireAuth, requirePermission("admin:configuracoes")]
  }, async (req, reply) => {
    const casa = await prisma15.casaLegislativa.update({
      where: { id: req.user.casaId },
      data: req.body
    });
    return casa;
  });
  app.get(
    "/numeracao/:prefixo",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { gerarNumero: gerarNumero2 } = await Promise.resolve().then(() => (init_numeracao_service(), numeracao_service_exports));
      const ano = (/* @__PURE__ */ new Date()).getFullYear();
      const ultimo = await prisma15.proposicao.findFirst({
        where: { numero: { startsWith: `${req.params.prefixo}-` }, ano },
        orderBy: { numero: "desc" }
      });
      const proximoSeq = ultimo ? parseInt(ultimo.numero.split("-")[1]) + 1 : 1;
      return { proximo: `${req.params.prefixo}-${String(proximoSeq).padStart(3, "0")}/${ano}` };
    }
  );
  app.get("/processos/definicoes", {
    preHandler: [requireAuth, requirePermission("admin:processos")]
  }, async (req, reply) => {
    return camundaService.listProcessDefinitions();
  });
  app.get(
    "/calendario",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const ano = parseInt(req.query.ano || String((/* @__PURE__ */ new Date()).getFullYear()));
      const mes = req.query.mes ? parseInt(req.query.mes) : void 0;
      const inicio = new Date(ano, (mes ?? 1) - 1, 1);
      const fim = mes ? new Date(ano, mes, 0) : new Date(ano, 11, 31);
      return prisma15.calendarioLegislativo.findMany({
        where: { casaId: req.user.casaId, data: { gte: inicio, lte: fim } },
        orderBy: { data: "asc" }
      });
    }
  );
  app.post("/calendario", {
    preHandler: [requireAuth, requirePermission("admin:calendario")]
  }, async (req, reply) => {
    const body = import_zod5.z.object({
      data: import_zod5.z.string(),
      tipo: import_zod5.z.enum(["FERIADO_NACIONAL", "FERIADO_MUNICIPAL", "RECESSO", "SESSAO_AGENDADA", "EVENTO_ESPECIAL"]),
      descricao: import_zod5.z.string().optional(),
      impactoTramitacao: import_zod5.z.boolean().default(false)
    }).parse(req.body);
    const item = await prisma15.calendarioLegislativo.create({
      data: { ...body, data: new Date(body.data), casaId: req.user.casaId }
    });
    return reply.status(201).send(item);
  });
}

// src/modules/publicacao/routes.ts
var import_client16 = require("@prisma/client");
var prisma16 = new import_client16.PrismaClient();
async function publicacaoRoutes(app) {
  app.post("/:proposicaoId", {
    preHandler: [requireAuth, requirePermission("publicacao:publicar")]
  }, async (req, reply) => {
    const { tipo, numero } = req.body;
    const proposicao = await prisma16.proposicao.findUnique({
      where: { id: req.params.proposicaoId },
      include: { tipoMateria: true, autor: { select: { nome: true } } }
    });
    if (!proposicao) return reply.status(404).send({ error: "Proposi\xE7\xE3o n\xE3o encontrada" });
    if (proposicao.status !== "APROVADO") {
      return reply.status(422).send({ error: "Somente proposi\xE7\xF5es aprovadas podem ser publicadas" });
    }
    const conteudo = `${proposicao.tipoMateria.nome} N\xB0 ${proposicao.numero}

${proposicao.ementa}

Publicado em: ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}`;
    const publicacao = await prisma16.publicacaoOficial.create({
      data: {
        proposicaoId: proposicao.id,
        tipo,
        numero,
        data: /* @__PURE__ */ new Date(),
        conteudo,
        status: "PUBLICADO"
      }
    });
    await prisma16.proposicao.update({
      where: { id: proposicao.id },
      data: { status: "PUBLICADO" }
    });
    return reply.status(201).send(publicacao);
  });
  app.get("/portal", async (req, reply) => {
    const page = parseInt(req.query.page || "1");
    const pageSize = 20;
    const busca = req.query.busca;
    const [total, publicacoes] = await Promise.all([
      prisma16.publicacaoOficial.count({
        where: {
          status: "PUBLICADO",
          proposicao: {
            ...busca ? {
              OR: [
                { numero: { contains: busca, mode: "insensitive" } },
                { ementa: { contains: busca, mode: "insensitive" } }
              ]
            } : {}
          }
        }
      }),
      prisma16.publicacaoOficial.findMany({
        where: {
          status: "PUBLICADO",
          proposicao: {
            ...busca ? {
              OR: [
                { numero: { contains: busca, mode: "insensitive" } },
                { ementa: { contains: busca, mode: "insensitive" } }
              ]
            } : {}
          }
        },
        include: {
          proposicao: {
            select: { numero: true, ementa: true, tipoMateria: { select: { nome: true, sigla: true } } }
          }
        },
        orderBy: { data: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { data: publicacoes, meta: { total, page, pageSize } };
  });
  app.get("/:proposicaoId/historico", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    return prisma16.publicacaoOficial.findMany({
      where: { proposicaoId: req.params.proposicaoId },
      orderBy: { data: "desc" }
    });
  });
}

// src/modules/busca/routes.ts
var import_client17 = require("@prisma/client");
var prisma17 = new import_client17.PrismaClient();
async function buscaRoutes(app) {
  app.get("/global", {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: "object",
        properties: {
          q: { type: "string", minLength: 2 },
          tipos: { type: "string" },
          limit: { type: "integer", default: 10 }
        },
        required: ["q"]
      }
    }
  }, async (req, reply) => {
    const { q, tipos, limit = 10 } = req.query;
    const tiposFiltro = tipos?.split(",") ?? ["proposicao", "sessao", "documento"];
    const resultados = [];
    if (tiposFiltro.includes("proposicao")) {
      const proposicoes = await prisma17.proposicao.findMany({
        where: {
          casaId: req.user.casaId,
          OR: [
            { numero: { contains: q, mode: "insensitive" } },
            { ementa: { contains: q, mode: "insensitive" } },
            { assunto: { contains: q, mode: "insensitive" } },
            { autorExterno: { contains: q, mode: "insensitive" } }
          ]
        },
        take: limit,
        orderBy: { atualizadoEm: "desc" },
        select: {
          id: true,
          numero: true,
          ementa: true,
          status: true,
          tipoMateria: { select: { sigla: true } },
          autor: { select: { nome: true } }
        }
      });
      resultados.push(...proposicoes.map((p) => ({
        id: p.id,
        tipo: "proposicao",
        titulo: p.ementa,
        subtitulo: `${p.status.replace(/_/g, " ")} \xB7 ${p.autor?.nome ?? ""}`,
        numero: p.numero,
        href: `/proposicoes/${p.id}`,
        status: p.status
      })));
    }
    if (tiposFiltro.includes("sessao")) {
      const sessoes = await prisma17.sessaoLegislativa.findMany({
        where: {
          casaId: req.user.casaId,
          OR: [
            { numero: { contains: q, mode: "insensitive" } },
            { local: { contains: q, mode: "insensitive" } }
          ]
        },
        take: Math.floor(limit / 2),
        orderBy: { data: "desc" },
        select: { id: true, numero: true, tipo: true, data: true, status: true }
      });
      resultados.push(...sessoes.map((s) => ({
        id: s.id,
        tipo: "sessao",
        titulo: `Sess\xE3o ${s.tipo} ${s.numero}`,
        subtitulo: `${new Date(s.data).toLocaleDateString("pt-BR")} \xB7 ${s.status}`,
        href: `/sessoes/${s.id}`
      })));
    }
    if (tiposFiltro.includes("documento")) {
      const documentos = await prisma17.documento.findMany({
        where: {
          nome: { contains: q, mode: "insensitive" },
          proposicao: { casaId: req.user.casaId }
        },
        take: Math.floor(limit / 2),
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          nome: true,
          tipo: true,
          status: true,
          proposicao: { select: { numero: true, id: true } }
        }
      });
      resultados.push(...documentos.map((d) => ({
        id: d.id,
        tipo: "documento",
        titulo: d.nome,
        subtitulo: `${d.proposicao?.numero ?? "Avulso"} \xB7 ${d.tipo}`,
        href: d.proposicao ? `/proposicoes/${d.proposicao.id}/documentos` : "/documentos"
      })));
    }
    return {
      query: q,
      total: resultados.length,
      resultados
    };
  });
}

// src/modules/notificacoes/routes.ts
var import_client18 = require("@prisma/client");
var prisma18 = new import_client18.PrismaClient();
var notificacaoService = new NotificacaoService();
async function notificacoesRoutes(app) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const page = parseInt(req.query.page || "1");
      const pageSize = 20;
      const where = {
        usuarioId: req.user.id,
        ...req.query.lida !== void 0 ? { lida: req.query.lida === "true" } : {}
      };
      const [total, notificacoes] = await Promise.all([
        prisma18.notificacao.count({ where }),
        prisma18.notificacao.findMany({
          where,
          orderBy: { criadoEm: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { proposicao: { select: { numero: true, ementa: true } } }
        })
      ]);
      const naoLidas = await prisma18.notificacao.count({ where: { usuarioId: req.user.id, lida: false } });
      return { data: notificacoes, meta: { total, page, pageSize, naoLidas } };
    }
  );
  app.patch(
    "/:id/lida",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      await notificacaoService.marcarLida(req.params.id, req.user.id);
      return { ok: true };
    }
  );
  app.patch(
    "/todas/lidas",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      await notificacaoService.marcarTodasLidas(req.user.id);
      return { ok: true };
    }
  );
}

// src/lib/export.service.ts
var import_client19 = require("@prisma/client");
var prisma19 = new import_client19.PrismaClient();
function escapeCsv(value) {
  const str = value === null || value === void 0 ? "" : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
function linhasCsv(headers, rows) {
  const cabecalho = headers.map((h) => escapeCsv(h)).join(",");
  const linhas = rows.map((row) => row.map(escapeCsv).join(","));
  return [cabecalho, ...linhas].join("\n");
}
async function exportarProposicoes(opcoes) {
  const where = { casaId: opcoes.casaId };
  if (opcoes.filtros?.status) where.status = opcoes.filtros.status;
  if (opcoes.filtros?.tipoMateriaId) where.tipoMateriaId = opcoes.filtros.tipoMateriaId;
  if (opcoes.filtros?.de || opcoes.filtros?.ate) {
    where.criadoEm = {
      ...opcoes.filtros.de ? { gte: opcoes.filtros.de } : {},
      ...opcoes.filtros.ate ? { lte: opcoes.filtros.ate } : {}
    };
  }
  const proposicoes = await prisma19.proposicao.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      tipoMateria: { select: { nome: true, sigla: true } },
      autor: { select: { nome: true } },
      orgaoDestino: { select: { nome: true, sigla: true } },
      _count: { select: { tramitacoes: true, documentos: true } }
    },
    take: 1e4
  });
  logger.info({ total: proposicoes.length, formato: opcoes.formato }, "Exportando proposi\xE7\xF5es");
  if (opcoes.formato === "json") {
    return {
      dados: JSON.stringify(proposicoes, null, 2),
      mimeType: "application/json",
      extensao: "json"
    };
  }
  const headers = [
    "N\xFAmero",
    "Tipo",
    "Ementa",
    "Autoria",
    "Status",
    "Regime",
    "\xD3rg\xE3o Atual",
    "Data Protocolo",
    "\xDAltima Atualiza\xE7\xE3o",
    "Qtd Eventos",
    "Qtd Documentos"
  ];
  const rows = proposicoes.map((p) => [
    p.numero,
    p.tipoMateria.sigla,
    p.ementa,
    p.autor?.nome ?? p.autorExterno ?? "\u2014",
    p.status.replace(/_/g, " "),
    p.regime,
    p.orgaoDestino?.sigla ?? "\u2014",
    p.protocoladoEm ? new Date(p.protocoladoEm).toLocaleDateString("pt-BR") : "\u2014",
    new Date(p.atualizadoEm).toLocaleDateString("pt-BR"),
    p._count.tramitacoes,
    p._count.documentos
  ]);
  return {
    dados: linhasCsv(headers, rows),
    mimeType: "text/csv; charset=utf-8",
    extensao: "csv"
  };
}
async function exportarTramitacao(proposicaoId, formato) {
  const [proposicao, eventos] = await Promise.all([
    prisma19.proposicao.findUnique({
      where: { id: proposicaoId },
      select: { numero: true, ementa: true }
    }),
    prisma19.tramitacaoEvento.findMany({
      where: { proposicaoId },
      orderBy: { sequencia: "asc" },
      include: {
        usuario: { select: { nome: true, cargo: true } },
        orgaoOrigem: { select: { nome: true, sigla: true } }
      }
    })
  ]);
  if (!proposicao) throw new Error("Proposi\xE7\xE3o n\xE3o encontrada");
  if (formato === "json") {
    return {
      dados: JSON.stringify({ proposicao, eventos }, null, 2),
      mimeType: "application/json",
      extensao: "json"
    };
  }
  const headers = [
    "Seq",
    "Data/Hora",
    "Tipo Evento",
    "Descri\xE7\xE3o",
    "Status Antes",
    "Status Depois",
    "\xD3rg\xE3o Origem",
    "Usu\xE1rio",
    "Cargo",
    "Observa\xE7\xE3o"
  ];
  const rows = eventos.map((e) => [
    e.sequencia,
    new Date(e.criadoEm).toLocaleString("pt-BR"),
    e.tipo.replace(/_/g, " "),
    e.descricao,
    e.statusAntes ?? "\u2014",
    e.statusDepois ?? "\u2014",
    e.orgaoOrigem?.sigla ?? "\u2014",
    e.usuario?.nome ?? "(sistema)",
    e.usuario?.cargo ?? "\u2014",
    e.observacao ?? "\u2014"
  ]);
  return {
    dados: linhasCsv(headers, rows),
    mimeType: "text/csv; charset=utf-8",
    extensao: "csv"
  };
}
async function exportarPresencaSessoes(casaId, formato) {
  const sessoes = await prisma19.sessaoLegislativa.findMany({
    where: { casaId, status: "ENCERRADA" },
    orderBy: { data: "desc" },
    take: 50,
    include: {
      presencas: true,
      _count: { select: { pauta: true, votos: true } }
    }
  });
  if (formato === "json") {
    return {
      dados: JSON.stringify(sessoes, null, 2),
      mimeType: "application/json",
      extensao: "json"
    };
  }
  const headers = ["Sess\xE3o", "Tipo", "Data", "Presentes", "Qu\xF3rum M\xEDnimo", "Itens Pauta", "Vota\xE7\xF5es"];
  const rows = sessoes.map((s) => [
    s.numero,
    s.tipo,
    new Date(s.data).toLocaleDateString("pt-BR"),
    s.presentes ?? s.presencas.filter((p) => p.presente).length,
    s.quorumMinimo ?? "\u2014",
    s._count.pauta,
    s._count.votos
  ]);
  return {
    dados: linhasCsv(headers, rows),
    mimeType: "text/csv; charset=utf-8",
    extensao: "csv"
  };
}

// src/modules/exportacao/routes.ts
async function exportacaoRoutes(app) {
  app.get("/proposicoes", {
    preHandler: [requireAuth, requirePermission("relatorios:exportar")]
  }, async (req, reply) => {
    const formato = req.query.formato ?? "csv";
    const { dados, mimeType, extensao } = await exportarProposicoes({
      formato,
      casaId: req.user.casaId,
      filtros: {
        status: req.query.status,
        de: req.query.de ? new Date(req.query.de) : void 0,
        ate: req.query.ate ? new Date(req.query.ate) : void 0
      }
    });
    await auditoriaService.registrar({
      usuarioId: req.user.id,
      entidade: "Proposicao",
      entidadeId: "exportacao",
      acao: "EXPORTAR",
      dadosDepois: { formato, filtros: req.query }
    });
    const dataStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    reply.header("Content-Type", mimeType);
    reply.header("Content-Disposition", `attachment; filename="proposicoes-${dataStr}.${extensao}"`);
    return reply.send(dados);
  });
  app.get("/tramitacao/:proposicaoId", {
    preHandler: [requireAuth]
  }, async (req, reply) => {
    const formato = req.query.formato ?? "csv";
    const { dados, mimeType, extensao } = await exportarTramitacao(req.params.proposicaoId, formato);
    await auditoriaService.registrar({
      usuarioId: req.user.id,
      entidade: "TramitacaoEvento",
      entidadeId: req.params.proposicaoId,
      acao: "EXPORTAR"
    });
    reply.header("Content-Type", mimeType);
    reply.header("Content-Disposition", `attachment; filename="tramitacao-${req.params.proposicaoId}.${extensao}"`);
    return reply.send(dados);
  });
  app.get("/sessoes/presencas", {
    preHandler: [requireAuth, requirePermission("relatorios:exportar")]
  }, async (req, reply) => {
    const formato = req.query.formato ?? "csv";
    const { dados, mimeType, extensao } = await exportarPresencaSessoes(req.user.casaId, formato);
    reply.header("Content-Type", mimeType);
    reply.header("Content-Disposition", `attachment; filename="presencas-sessoes.${extensao}"`);
    return reply.send(dados);
  });
}

// src/modules/sistema/routes.ts
var import_client20 = require("@prisma/client");
var import_bcryptjs2 = __toESM(require("bcryptjs"));
var import_zod6 = require("zod");
var prisma20 = new import_client20.PrismaClient();
function requireSuperAdmin(req, reply, done) {
  const user = req.user;
  if (!user) return reply.status(401).send({ error: "Unauthorized" });
  if (user.casaId !== "sistema" && !user.permissoes.includes("sistema:*")) {
    return reply.status(403).send({ error: "Forbidden", message: "Acesso restrito ao superadministrador" });
  }
  done();
}
var criarCasaSchema = import_zod6.z.object({
  nome: import_zod6.z.string().min(5, "Nome muito curto"),
  sigla: import_zod6.z.string().min(2).max(10).toUpperCase(),
  cnpj: import_zod6.z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inv\xE1lido"),
  municipio: import_zod6.z.string().min(3),
  uf: import_zod6.z.string().length(2).toUpperCase(),
  email: import_zod6.z.string().email().optional(),
  telefone: import_zod6.z.string().optional(),
  site: import_zod6.z.string().url().optional().or(import_zod6.z.literal("")),
  totalVereadores: import_zod6.z.number().int().min(7).max(55).default(9),
  // Credenciais do admin inicial da câmara
  adminNome: import_zod6.z.string().min(3),
  adminEmail: import_zod6.z.string().email(),
  adminSenha: import_zod6.z.string().min(8)
});
async function sistemaRoutes(app) {
  app.get("/casas", { preHandler: requireSuperAdmin }, async (req) => {
    const casas = await prisma20.casaLegislativa.findMany({
      where: { sigla: { not: "SISTEMA" } },
      include: {
        _count: { select: { usuarios: true, proposicoes: true, sessoes: true } }
      },
      orderBy: { criadoEm: "desc" }
    });
    return casas;
  });
  app.get("/casas/:id", { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { id } = req.params;
    const casa = await prisma20.casaLegislativa.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true, proposicoes: true, sessoes: true } },
        usuarios: {
          take: 10,
          select: { id: true, nome: true, email: true, cargo: true, ativo: true, criadoEm: true },
          orderBy: { criadoEm: "asc" }
        }
      }
    });
    if (!casa) return reply.status(404).send({ error: "C\xE2mara n\xE3o encontrada" });
    return casa;
  });
  app.post("/casas", { preHandler: requireSuperAdmin }, async (req, reply) => {
    try {
      const body = criarCasaSchema.parse(req.body);
      const existente = await prisma20.casaLegislativa.findFirst({
        where: { OR: [{ sigla: body.sigla }, { cnpj: body.cnpj }] }
      });
      if (existente) {
        return reply.status(409).send({
          error: "Conflict",
          message: existente.sigla === body.sigla ? `Sigla ${body.sigla} j\xE1 est\xE1 em uso` : `CNPJ ${body.cnpj} j\xE1 cadastrado`
        });
      }
      const quorumSimples = Math.floor(body.totalVereadores / 2) + 1;
      const resultado = await prisma20.$transaction(async (tx) => {
        const casa = await tx.casaLegislativa.create({
          data: {
            nome: body.nome,
            sigla: body.sigla,
            cnpj: body.cnpj,
            municipio: body.municipio,
            uf: body.uf,
            email: body.email,
            telefone: body.telefone,
            site: body.site || null,
            configuracoes: {
              totalVereadores: body.totalVereadores,
              quorumSimples,
              quorumQualificado: Math.ceil(body.totalVereadores * 2 / 3),
              legislatura: `${(/* @__PURE__ */ new Date()).getFullYear()}-${(/* @__PURE__ */ new Date()).getFullYear() + 3}`
            },
            ativo: true
          }
        });
        const [pAdmin, pSecretario, pVereador, pJuridico, pConsulta] = await Promise.all([
          tx.perfil.create({ data: { casaId: casa.id, nome: "ADMINISTRADOR", descricao: "Acesso total", permissoes: ["*:*"] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: "SECRETARIO_LEGISLATIVO", descricao: "Gest\xE3o legislativa", permissoes: ["proposicoes:ler", "proposicoes:criar", "proposicoes:editar", "tramitacao:ler", "tramitacao:criar", "sessoes:ler", "sessoes:criar", "sessoes:editar", "documentos:ler", "documentos:criar", "usuarios:ler", "busca:ler", "notificacoes:ler", "relatorios:ler"] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: "VEREADOR", descricao: "Vereador eleito", permissoes: ["proposicoes:ler", "proposicoes:criar", "tramitacao:ler", "sessoes:ler", "documentos:ler", "busca:ler", "notificacoes:ler"] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: "JURIDICO", descricao: "Assessoria jur\xEDdica", permissoes: ["proposicoes:ler", "tramitacao:ler", "tramitacao:criar", "documentos:ler", "documentos:criar", "busca:ler"] } }),
          tx.perfil.create({ data: { casaId: casa.id, nome: "CONSULTA", descricao: "Somente leitura", permissoes: ["proposicoes:ler", "sessoes:ler", "documentos:ler", "busca:ler"] } })
        ]);
        await Promise.all([
          tx.orgao.create({ data: { casaId: casa.id, nome: "Presid\xEAncia", sigla: "PRES", tipo: "PRESIDENCIA", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Secretaria Legislativa", sigla: "SEC", tipo: "SECRETARIA", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Protocolo", sigla: "PROTO", tipo: "PROTOCOLO", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Assessoria Jur\xEDdica", sigla: "JUR", tipo: "PROCURADORIA", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Plen\xE1rio", sigla: "PLN", tipo: "PLENARIO", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Comiss\xE3o de Finan\xE7as", sigla: "CFO", tipo: "COMISSAO_PERMANENTE", ativo: true } }),
          tx.orgao.create({ data: { casaId: casa.id, nome: "Comiss\xE3o de Justi\xE7a", sigla: "CJIP", tipo: "COMISSAO_PERMANENTE", ativo: true } })
        ]);
        await Promise.all([
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Projeto de Lei", sigla: "PL", prefixoNumero: "PL", exigeParecerJuridico: true, exigeComissao: true, prazoTramitacao: 60 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Projeto de Lei Complementar", sigla: "PLC", prefixoNumero: "PLC", exigeParecerJuridico: true, prazoTramitacao: 60 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Emenda \xE0 Lei Org\xE2nica", sigla: "PELO", prefixoNumero: "PELO", exigeParecerJuridico: true, prazoTramitacao: 90 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Decreto Legislativo", sigla: "DL", prefixoNumero: "DL", exigeParecerJuridico: true, prazoTramitacao: 30 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Mo\xE7\xE3o", sigla: "MOC", prefixoNumero: "MOC", exigeComissao: false, prazoTramitacao: 15 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Requerimento", sigla: "REQ", prefixoNumero: "REQ", exigeComissao: false, prazoTramitacao: 10 } }),
          tx.tipoMateria.create({ data: { casaId: casa.id, nome: "Indica\xE7\xE3o", sigla: "IND", prefixoNumero: "IND", exigeComissao: false, prazoTramitacao: 10 } })
        ]);
        const senhaHash = await import_bcryptjs2.default.hash(body.adminSenha, 12);
        const adminUser = await tx.usuario.create({
          data: {
            casaId: casa.id,
            nome: body.adminNome,
            email: body.adminEmail,
            cargo: "Administrador",
            ativo: true
          }
        });
        await tx.credencialUsuario.create({
          data: { usuarioId: adminUser.id, senhaHash, precisaTrocar: true }
        });
        await tx.usuarioPerfil.create({
          data: { usuarioId: adminUser.id, perfilId: pAdmin.id }
        });
        return { casa, adminUser };
      });
      return reply.status(201).send({
        message: "C\xE2mara criada com sucesso!",
        casa: {
          id: resultado.casa.id,
          nome: resultado.casa.nome,
          sigla: resultado.casa.sigla,
          municipio: resultado.casa.municipio,
          uf: resultado.casa.uf
        },
        adminLogin: {
          email: body.adminEmail,
          senha: body.adminSenha,
          aviso: "Troca de senha obrigat\xF3ria no primeiro acesso"
        },
        estrutura: {
          perfis: 5,
          orgaos: 7,
          tiposMateria: 7
        }
      });
    } catch (err) {
      if (err?.name === "ZodError") {
        return reply.status(400).send({ error: "ValidationError", issues: err.errors });
      }
      throw err;
    }
  });
  app.patch("/casas/:id", { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { id } = req.params;
    const { ativo } = req.body;
    const casa = await prisma20.casaLegislativa.update({
      where: { id },
      data: { ativo }
    });
    return reply.status(200).send({ message: `C\xE2mara ${ativo ? "ativada" : "desativada"}`, casa });
  });
  app.get("/stats", { preHandler: requireSuperAdmin }, async () => {
    const [totalCasas, totalUsuarios, totalProposicoes, totalSessoes, casasPorUF] = await Promise.all([
      prisma20.casaLegislativa.count({ where: { ativo: true, sigla: { not: "SISTEMA" } } }),
      prisma20.usuario.count({ where: { ativo: true, casa: { sigla: { not: "SISTEMA" } } } }),
      prisma20.proposicao.count(),
      prisma20.sessaoLegislativa.count(),
      prisma20.casaLegislativa.groupBy({
        by: ["uf"],
        where: { ativo: true, sigla: { not: "SISTEMA" } },
        _count: true,
        orderBy: { _count: { uf: "desc" } }
      })
    ]);
    return {
      totalCasas,
      totalUsuarios,
      totalProposicoes,
      totalSessoes,
      casasPorUF: casasPorUF.map((c) => ({ uf: c.uf, total: c._count }))
    };
  });
}

// src/plugins/swagger.ts
var import_swagger = __toESM(require("@fastify/swagger"));
var import_swagger_ui = __toESM(require("@fastify/swagger-ui"));
async function swaggerPlugin(app) {
  await app.register(import_swagger.default, {
    openapi: {
      info: {
        title: "Sistema Legislativo Municipal \u2014 API",
        description: "API REST para gest\xE3o legislativa municipal.",
        version: "1.0.0"
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });
  await app.register(import_swagger_ui.default, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true }
  });
  app.log.info("Swagger UI dispon\xEDvel em /docs");
}

// src/plugins/lgpd.ts
async function lgpdPlugin(app) {
  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Privacy-Policy", "https://legislativo.gov.br/privacidade");
    return payload;
  });
}

// src/server.ts
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres");
}
async function build() {
  const app = (0, import_fastify.default)({
    logger: { level: process.env.LOG_LEVEL || "info" },
    trustProxy: true
  });
  await app.register(import_cors.default, {
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:3000",
      "https://pleno.morelidev.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept"]
  });
  await app.register(import_cookie.default, { secret: JWT_SECRET });
  await app.register(import_rate_limit.default, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip
  });
  await app.register(import_jwt.default, {
    secret: JWT_SECRET,
    sign: { algorithm: "HS256", expiresIn: "15m" },
    verify: { algorithms: ["HS256"] }
  });
  await app.register(import_multipart.default, { limits: { fileSize: 50 * 1024 * 1024 } });
  app.decorateRequest("user", null);
  app.decorateRequest("auditoria", null);
  await app.register(swaggerPlugin);
  await app.register(authPlugin);
  await app.register(auditoriaPlugin);
  await app.register(lgpdPlugin);
  app.get("/health", async () => ({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV
  }));
  const v1 = "/api/v1";
  await app.register(authRoutes, { prefix: `${v1}/auth` });
  await app.register(proposicoesRoutes, { prefix: `${v1}/proposicoes` });
  await app.register(tramitacaoRoutes, { prefix: `${v1}/tramitacao` });
  await app.register(processosRoutes, { prefix: `${v1}/processos` });
  await app.register(sessoesRoutes, { prefix: `${v1}/sessoes` });
  await app.register(documentosRoutes, { prefix: `${v1}/documentos` });
  await app.register(pdfRoutes, { prefix: `${v1}/pdf` });
  await app.register(usuariosRoutes, { prefix: `${v1}/usuarios` });
  await app.register(auditoriaRoutes, { prefix: `${v1}/auditoria` });
  await app.register(adminRoutes, { prefix: `${v1}/admin` });
  await app.register(buscaRoutes, { prefix: `${v1}/busca` });
  await app.register(notificacoesRoutes, { prefix: `${v1}/notificacoes` });
  await app.register(exportacaoRoutes, { prefix: `${v1}/exportar` });
  await app.register(sistemaRoutes, { prefix: `${v1}/sistema` });
  await app.register(publicacaoRoutes, { prefix: `${v1}/publicacao` });
  app.setErrorHandler((error, req, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) app.log.error({ err: error.message, url: req.url });
    reply.status(status).send({
      error: error.name || "InternalServerError",
      message: status === 500 ? "Erro interno do servidor" : error.message,
      statusCode: status
    });
  });
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: "NotFound", message: `${req.method} ${req.url} n\xE3o existe` });
  });
  return app;
}
async function start() {
  const server = await build();
  try {
    await prisma.$connect();
    logger.info("Banco conectado");
  } catch (err) {
    logger.warn({ err }, "Banco n\xE3o conectou \u2014 tentar\xE1 reconectar");
  }
  const port = parseInt(process.env.PORT || "3001");
  await server.listen({ host: "0.0.0.0", port });
  logger.info(`API rodando em http://0.0.0.0:${port}`);
}
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
start().catch((err) => {
  console.error("Falha fatal:", err);
  process.exit(1);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  build
});
