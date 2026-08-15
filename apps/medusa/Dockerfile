# ============================================
# Medusa Backend — Multi-stage Dockerfile
# ============================================
# The build context is the workspace root because Medusa consumes the canonical
# @bootandstrap/shared workspace package. pnpm deploy emits a portable,
# production-only dependency graph for the runtime image.

# ── Stage 1: Install + Build ─────────────────
FROM node:20.9.0-bookworm-slim@sha256:d272d96f3ad3a4e5bb2b6c36ea7427b4e83d1b23fb24b9df8b71d01aa59951b1 AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/medusa ./apps/medusa

RUN pnpm install --frozen-lockfile --filter apps/medusa...
RUN pnpm --filter @bootandstrap/shared build && \
    pnpm --filter apps/medusa build
RUN pnpm --filter apps/medusa deploy --prod /opt/medusa && \
    cp -R apps/medusa/.medusa /opt/medusa/.medusa

# ── Stage 2: Runner ──────────────────────────
FROM node:20.9.0-bookworm-slim@sha256:d272d96f3ad3a4e5bb2b6c36ea7427b4e83d1b23fb24b9df8b71d01aa59951b1 AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 medusa && \
    useradd --system --uid 1001 --gid medusa -m medusa && \
    mkdir -p /home/medusa/.config/medusa && \
    chown -R medusa:medusa /home/medusa

# Copy the built server output (includes package.json, compiled src, medusa-config.js)
COPY --from=builder --chown=medusa:medusa /opt/medusa/.medusa/server ./

# Copy pruned production node_modules from builder (skip second npm install!)
COPY --from=builder --chown=medusa:medusa /opt/medusa/node_modules ./node_modules

# Copy entrypoint script (runs db:migrate before starting — idempotent, scalable)
COPY --from=builder --chown=medusa:medusa /opt/medusa/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER medusa

EXPOSE 9000
ENV PORT=9000

# Auto-migrate + start via entrypoint (no SSH/external commands needed)
CMD ["/app/docker-entrypoint.sh"]
