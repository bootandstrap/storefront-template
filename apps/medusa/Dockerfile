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
    useradd --system --uid 1001 --gid medusa -m medusa && \
    mkdir -p /home/medusa/.config/medusa && \
    chown -R medusa:medusa /home/medusa

# Copy the built server output (includes package.json, compiled src, medusa-config.js)
COPY --from=builder --chown=medusa:medusa /app/.medusa/server ./

# Install production dependencies for the server output
RUN npm install --production && chown -R medusa:medusa /app

# Copy entrypoint script (runs db:migrate before starting — idempotent, scalable)
COPY --chown=medusa:medusa docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER medusa

EXPOSE 9000
ENV PORT=9000

# Auto-migrate + start via entrypoint (no SSH/external commands needed)
CMD ["/app/docker-entrypoint.sh"]
