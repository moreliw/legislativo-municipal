FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @legislativo/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 legislativo && \
    adduser --system --uid 1001 legislativo

COPY --from=builder --chown=legislativo:legislativo /app/apps/web/.next/standalone ./
COPY --from=builder --chown=legislativo:legislativo /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=legislativo:legislativo /app/apps/web/public ./apps/web/public

USER legislativo
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
