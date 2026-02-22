# ============================================
# Medusa Backend — Multi-stage Dockerfile
# ============================================
# Builds Medusa v2 with custom modules (supabase-auth, supabase-storage).
# Uses bookworm-slim for fast native dependency builds.

# ── Stage 1: Dependencies ────────────────────
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
RUN npm install

# ── Stage 2: Builder ─────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx medusa build

# ── Stage 3: Runner ──────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 medusa
RUN useradd --system --uid 1001 --gid medusa medusa

# Copy built server
COPY --from=builder /app/.medusa/server ./
COPY --from=builder /app/medusa-config.ts ./medusa-config.ts

# Install production dependencies in the runner
RUN npm install --omit=dev

USER medusa

EXPOSE 9000
ENV PORT=9000

CMD ["node", "index.js"]
