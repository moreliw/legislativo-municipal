FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# Dependências
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile --prod=false

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @legislativo/api exec prisma generate
RUN pnpm --filter @legislativo/api build

# Runner
FROM node:20-alpine AS runner
RUN corepack enable pnpm
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 legislativo && \
    adduser --system --uid 1001 legislativo

# Copiar apenas o necessário
COPY --from=builder --chown=legislativo:legislativo /app/apps/api/dist ./dist
COPY --from=builder --chown=legislativo:legislativo /app/apps/api/prisma ./prisma
COPY --from=builder --chown=legislativo:legislativo /app/node_modules ./node_modules
COPY --from=builder --chown=legislativo:legislativo /app/apps/api/node_modules ./apps/api/node_modules

USER legislativo

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
