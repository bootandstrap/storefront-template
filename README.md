# BootandStrap E-Commerce Template

A **reusable, SaaS-managed e-commerce template** built with Next.js 16, Medusa v2, and Supabase. White-labeled storefronts governed remotely via feature flags, plan limits, and dynamic theming — no code changes needed per client.

## Stack

| Component | Role |
|-----------|------|
| **Next.js 16** | Storefront (App Router, Server Components, Streaming) |
| **Medusa v2** | Headless commerce engine (catalog, cart, orders, payments) |
| **Supabase** | Auth, PostgreSQL, Storage CDN |
| **Stripe** | Payment processing |
| **Redis** | Medusa event bus, cache, rate limiting |
| **Tailwind CSS v4** | Styling (CSS-first config) |
| **Turborepo + pnpm** | Monorepo build orchestration |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Redis)
- Supabase project ([supabase.com](https://supabase.com))
- Stripe account (optional, for payments)

## Quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase + Stripe credentials

# 3. Initialize Medusa database
cd apps/medusa && npx medusa db:migrate && cd ../..

# 4. Seed products (idempotent)
cd apps/medusa && npx medusa exec ./src/scripts/seed.ts && cd ../..

# 5. Start everything
./dev.sh
# → Storefront:  http://localhost:3000
# → Medusa API:  http://localhost:9000
# → Medusa Admin: http://localhost:9000/app
```

## Project Structure

```
ecommerce-template/
├── apps/
│   ├── storefront/    # Next.js 16 (public store + Owner Panel)
│   └── medusa/        # Medusa v2 (headless commerce API)
├── packages/shared/   # Shared types & constants
├── supabase/          # SQL migrations
├── docs/              # Architecture, flows, guides
└── scripts/           # Release gate, RLS checks
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start storefront dev server |
| `pnpm build` | Production build |
| `pnpm test:run` | Run all tests (vitest) |
| `pnpm lint` | ESLint check |
| `./dev.sh` | Start full stack (Redis + Medusa + Storefront) |
| `bash scripts/release-gate.sh` | Pre-deploy quality gate (7 checks) |

## Documentation

| Doc | Contents |
|-----|----------|
| [GEMINI.md](GEMINI.md) | **Master guide** — architecture, patterns, governance, dev setup |
| [DOCS_GUIDE.md](DOCS_GUIDE.md) | Documentation index |
| [CREDENTIALS.md](CREDENTIALS.md) | Dev credentials & env matrix |
| [docs/](docs/) | Architecture, flows, deployment, operations guides |

## License

Proprietary — BootandStrap. All rights reserved.
