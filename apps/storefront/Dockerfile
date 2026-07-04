# ============================================
# Storefront Template — Monorepo-aware build
# ============================================

FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/platform-contract/package.json ./packages/platform-contract/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tenant-context/package.json ./packages/tenant-context/
COPY apps/storefront/package.json ./apps/storefront/

RUN pnpm install --frozen-lockfile --prod=false --filter storefront...

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/platform-contract/node_modules ./packages/platform-contract/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 
COPY --from=deps /app/packages/tenant-context/node_modules ./packages/tenant-context/node_modules
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules
COPY packages/platform-contract ./packages/platform-contract
COPY packages/shared ./packages/shared
COPY packages/tenant-context ./packages/tenant-context
COPY apps/storefront ./apps/storefront
COPY pnpm-workspace.yaml package.json ./

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STORE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @bootandstrap/platform-contract build \
    && pnpm --filter @bootandstrap/tenant-context build
RUN cd apps/storefront && pnpm build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/storefront/server.js"]
