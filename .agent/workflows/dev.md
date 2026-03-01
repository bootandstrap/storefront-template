---
description: Run the tenant storefront locally for development
---

# Local Development Workflow

## Prerequisites

- Node.js 22+
- pnpm 9+
- Medusa backend running (or mock endpoints)

## Start dev server

// turbo-all

1. Install dependencies:
```bash
pnpm install
```

2. Start the storefront dev server:
```bash
cd apps/storefront && pnpm dev
```

3. Open in browser: `http://localhost:3000`

## What you need running

The storefront connects to:
- **Medusa backend** — for products, cart, orders (needs `MEDUSA_BACKEND_URL`)
- **Supabase** — for auth, config, feature flags (needs `NEXT_PUBLIC_SUPABASE_URL`)

These are pre-configured in `.env`. Do NOT modify them.

## Testing

// turbo-all

1. Run unit tests:
```bash
pnpm test:run
```

2. Run build check:
```bash
pnpm build
```

3. Run full release gate:
```bash
bash scripts/release-gate.sh
```

## Deploying

Just push to main. GitHub Actions handles everything:
```bash
git push origin main
```

Build → GHCR → Dokploy auto-redeploy (~4 min).
