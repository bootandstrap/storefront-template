# BootandStrap Medusa Backend

Medusa v2 headless commerce engine for the BootandStrap SaaS e-commerce template. Handles catalog, cart, orders, payments, and fulfillment.

## Custom Modules

| Module | Purpose |
|--------|---------|
| `supabase-auth` | JWT validation via Supabase Auth → Medusa AuthIdentity |
| `supabase-storage` | File uploads via Supabase Storage CDN |

## Quick Start

```bash
# First-time DB setup
npx medusa db:migrate

# Seed products (idempotent — safe to re-run)
npx medusa exec ./src/scripts/seed.ts

# Start dev server
pnpm dev
```

Opens at [http://localhost:9000](http://localhost:9000). Admin UI at `/app`.

## Key Files

| Path | Purpose |
|------|---------|
| `medusa-config.ts` | Module registration, DB connection, providers |
| `src/modules/` | Custom Supabase auth + storage providers |
| `src/scripts/seed.ts` | Idempotent seed (13 products, 5 categories) |
| `src/api/` | Custom API routes |
| `src/subscribers/` | Event handlers (order.placed, etc.) |

## Full Documentation

See [GEMINI.md](../../GEMINI.md) at the repo root for architecture, patterns, and development guides.
