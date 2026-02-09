# ============================================
# Campifrut Medusa Backend — Multi-stage Dockerfile
# ============================================
# Builds Medusa v2 with custom modules (supabase-auth, supabase-storage).

# ── Stage 1: Dependencies ────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Builder ─────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx medusa build

# ── Stage 3: Runner ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 medusa
RUN adduser --system --uid 1001 medusa

# Copy built server
COPY --from=builder /app/.medusa/server ./
COPY --from=builder /app/medusa-config.ts ./medusa-config.ts

# Install production dependencies in the runner
RUN npm ci --omit=dev 2>/dev/null || true

USER medusa

EXPOSE 9000
ENV PORT=9000

CMD ["node", "index.js"]
