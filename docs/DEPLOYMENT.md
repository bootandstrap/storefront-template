# Deployment — Dokploy on Contabo VPS

> **Repository**: [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce) (private)
> **CI**: GitHub Actions — build + type-check on PRs to `main` (see `.github/workflows/ci.yml`)

## Overview

Campifrut runs as Docker containers on a **Contabo VPS** managed by **Dokploy**:

| Service | Port | Purpose |
|---------|------|---------|
| **storefront** | 3000 | Next.js 16 (standalone build) |
| **medusa-server** | 9000 | Medusa.js API + Admin |
| **redis** | 6379 | Events, cache, sessions |

PostgreSQL is hosted on **Supabase Cloud** (not in VPS).

## Dockerfiles

### Next.js Storefront (`apps/storefront/Dockerfile`)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Medusa Backend (`apps/medusa/Dockerfile`)

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm medusa build
EXPOSE 9000
CMD ["pnpm", "medusa", "start"]
```

## Environment Variables

See `.env.example` at project root. Critical production vars:

| Variable | Service | Notes |
|----------|---------|-------|
| `SUPABASE_DB_URL` | medusa | Transaction pool (port 6543) |
| `REDIS_URL` | medusa | `redis://redis:6379` in compose |
| `COOKIE_SECRET` | medusa | Random 32+ chars |
| `JWT_SECRET` | medusa | Random 32+ chars |
| `STORE_CORS` | medusa | Storefront URL |
| `ADMIN_CORS` | medusa | Admin URLs |
| `STRIPE_API_KEY` | medusa | Stripe secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | storefront | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | storefront | Publishable anon key |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | storefront | `https://api.campifrut.com` |

## Dokploy Configuration

1. **Connect repo** in Dokploy dashboard (GitHub)
2. **Set build method**: Docker Compose
3. **Upload `.env`** via Dokploy secrets panel
4. **Configure domains**:
   - `campifrut.com` → storefront:3000
   - `api.campifrut.com` → medusa-server:9000
5. **Enable SSL** via Dokploy (auto Let's Encrypt)
6. **Set deploy hooks** — auto-deploy on push to `main`

## Deploy Pipeline

```
git push main
    │
    ▼
Dokploy Webhook triggers
    │
    ▼
Docker Compose build (multi-stage)
    │
    ▼
Health checks pass
    │
    ▼
Rolling update (zero downtime)
```

## Scaling

- **storefront**: Increase replicas (stateless)
- **medusa-server**: Increase replicas (stateless, Redis handles sessions)
- **redis**: Consider Redis Sentinel for HA
- **PostgreSQL**: Supabase Pro plan scales automatically
