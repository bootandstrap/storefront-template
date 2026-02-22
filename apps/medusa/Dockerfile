# ============================================
# Medusa Backend — Multi-stage Dockerfile
# ============================================
# Builds Medusa v2 with custom modules (supabase-auth, supabase-storage).
# Optimized: single npm install → build → prune dev → copy to runner.

# ── Stage 1: Install + Build ─────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx medusa build

# Prune devDependencies in-place (faster than re-installing)
RUN npm prune --omit=dev

# ── Stage 2: Runner ──────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 medusa && \
    useradd --system --uid 1001 --gid medusa medusa

# Copy built server + production node_modules
COPY --from=builder /app/.medusa/server ./
COPY --from=builder /app/medusa-config.ts ./medusa-config.ts
COPY --from=builder /app/node_modules ./node_modules

USER medusa

EXPOSE 9000
ENV PORT=9000

CMD ["node", "index.js"]
