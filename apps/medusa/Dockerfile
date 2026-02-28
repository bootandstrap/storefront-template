# ============================================
# Medusa Backend — Multi-stage Dockerfile
# ============================================
# Optimized: single npm install, prune devDeps in builder, copy to runner.
# Cold-cache build time: ~25 min (was ~40 min with double npm install).

# ── Stage 1: Install + Build ─────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx medusa build

# Prune devDependencies IN the builder (avoids second npm install)
RUN npm prune --production

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

# Copy pruned production node_modules from builder (skip second npm install!)
COPY --from=builder --chown=medusa:medusa /app/node_modules ./node_modules

# Copy entrypoint script (runs db:migrate before starting — idempotent, scalable)
COPY --chown=medusa:medusa docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER medusa

EXPOSE 9000
ENV PORT=9000

# Auto-migrate + start via entrypoint (no SSH/external commands needed)
CMD ["/app/docker-entrypoint.sh"]
