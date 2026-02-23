# ============================================
# Medusa Backend — Multi-stage Dockerfile
# ============================================
# Builds Medusa v2 with custom modules (supabase-auth, supabase-storage).
# Optimized: install → build → copy server output → install prod deps → start.

# ── Stage 1: Install + Build ─────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx medusa build

# ── Stage 2: Runner ──────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 medusa && \
    useradd --system --uid 1001 --gid medusa medusa

# Copy the built server output (includes package.json, compiled src, medusa-config.js)
COPY --from=builder /app/.medusa/server ./

# Install production dependencies for the server output
RUN npm install --production

USER medusa

EXPOSE 9000
ENV PORT=9000

# Medusa v2 uses "medusa start" to boot the production server
CMD ["npx", "medusa", "start"]
