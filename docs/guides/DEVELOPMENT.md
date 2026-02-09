# Development Setup

> **Repository**: `git clone https://github.com/bootandstrap/bootandstrap-ecommerce.git`

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for Redis)
- Supabase account with project created

## Quick Start (Recommended)

```bash
# 1. Clone and install
git clone <repo> campifrut
cd campifrut
pnpm install

# 2. Set up environment
cp .env.example .env
# Fill in Supabase, Medusa, and Stripe keys

# 3. First-time DB setup (only once)
cd apps/medusa && npx medusa db:migrate && cd ../..

# 4. Seed products (idempotent — safe to re-run)
cd apps/medusa && npx medusa exec ./src/scripts/seed.ts && cd ../..

# 5. Start everything
./dev.sh
```

This starts:
- **Storefront**: http://localhost:3000
- **Medusa API**: http://localhost:9000
- **Medusa Admin**: http://localhost:9000/app
- **Redis**: localhost:6379

### What `dev.sh` does

1. Starts Redis in Docker (`campifrut-redis-dev`)
2. Symlinks root `.env` → `apps/storefront/.env.local`
3. Starts Medusa backend (`pnpm dev`) with IPv4 DNS resolution
4. Starts Storefront (`pnpm dev`)
5. Traps `Ctrl+C` to stop all services

## Project Structure

```
campifrut/
├── GEMINI.md                    # ← Master guide (read first)
├── dev.sh                       # ← One-command dev startup
├── apps/
│   ├── storefront/              # Next.js 16 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx     # Root redirect → /[lang]/
│   │   │   │   ├── layout.tsx   # Minimal: fonts, CSS vars, CartProvider, Toaster
│   │   │   │   ├── [lang]/      # ✅ Locale-based routing (en/es/de/fr/it)
│   │   │   │   │   ├── layout.tsx       # I18nProvider + locale validation
│   │   │   │   │   ├── (shop)/          # Storefront routes
│   │   │   │   │   │   ├── layout.tsx   # Header + Footer + CartDrawer
│   │   │   │   │   │   ├── productos/   # Product list + detail
│   │   │   │   │   │   ├── carrito/     # Cart page
│   │   │   │   │   │   ├── checkout/    # Checkout flow
│   │   │   │   │   │   ├── cuenta/      # Customer panel
│   │   │   │   │   │   └── pedido/      # Guest order lookup
│   │   │   │   │   ├── (auth)/          # Login + registro
│   │   │   │   │   └── (panel)/         # Owner panel (auth-guarded)
│   │   │   │   ├── api/webhooks/stripe/  # Stripe webhook handler
│   │   │   │   └── auth/                # OAuth callback
│   │   │   ├── components/
│   │   │   │   ├── layout/      # Header, Footer, LanguageSelector, CurrencySelector
│   │   │   │   ├── products/    # ProductCard, ProductGrid, AddToCartButton
│   │   │   │   ├── checkout/    # Multi-step modal, Stripe/Bank/COD/WhatsApp
│   │   │   │   ├── cart/        # CartDrawer, CartItem
│   │   │   │   └── ui/          # Toaster, Skeleton, ErrorBoundary
│   │   │   ├── contexts/        # CartContext (with drawer state)
│   │   │   └── lib/
│   │   │       ├── i18n/        # ✅ Dictionary-based i18n system
│   │   │       │   ├── index.ts     # getDictionary(), createTranslator()
│   │   │       │   ├── locale.ts    # Locale resolution chain
│   │   │       │   ├── currencies.ts# Multi-currency formatting
│   │   │       │   ├── actions.ts   # Server Actions (setCurrencyCookie)
│   │   │       │   └── provider.tsx # I18nProvider context
│   │   │       ├── dictionaries/ # ✅ en.json, es.json, de.json, fr.json, it.json
│   │   │       ├── supabase/    # Browser + Server clients
│   │   │       ├── medusa/      # Typed API fetcher (retry + fallback)
│   │   │       ├── config.ts    # getConfig() — in-memory TTL cache (5 min)
│   │   │       ├── features.ts  # isFeatureEnabled()
│   │   │       ├── limits.ts    # checkLimit()
│   │   │       └── payment-methods.ts  # Dynamic payment registry
│   │   └── proxy.ts             # Next.js 16 proxy (locale + auth + roles)
│   │
│   └── medusa/                  # Medusa.js v2
│       ├── src/
│       │   ├── modules/
│       │   │   ├── supabase-auth/     # ✅ Supabase JWT → AuthIdentity
│       │   │   └── supabase-storage/  # ✅ Supabase Storage file provider
│       │   ├── api/             # Custom API routes
│       │   ├── workflows/       # WhatsApp checkout workflow
│       │   ├── subscribers/     # Event handlers
│       │   └── scripts/seed.ts  # ✅ Campifrut seed (idempotent, 13 products)
│       └── medusa-config.ts     # ✅ Both providers configured
│
├── packages/shared/             # @campifrut/shared types + constants
├── docs/                        # Documentation
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Common Commands

| Command | Description |
|---------|-------------|
| `./dev.sh` | **Start all services** (recommended) |
| `pnpm build` | Build all apps |
| `cd apps/medusa && npx medusa db:migrate` | Run Medusa migrations |
| `cd apps/medusa && npx medusa exec ./src/scripts/seed.ts` | Seed product catalog (idempotent — safe to re-run) |
| `cd apps/medusa && npx medusa user -e admin@campifrut.com -p password` | Create admin user |

## Environment Variables

### Required in `.env`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | Supabase pooler connection string |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Medusa publishable API key (auto-generated on first run) |
| `REDIS_URL` | Redis connection (default: `redis://localhost:6379`) |

> **Important**: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is auto-generated when Medusa starts for the first time. Check the Medusa startup logs for the key value, or find it in the Medusa Admin panel under Settings.

## Debugging

### Medusa API
- Health: `http://localhost:9000/health`
- Admin panel: `http://localhost:9000/app`

### Supabase
- Dashboard: SQL queries, RLS testing, Auth users
- Feature flags: edit `feature_flags` row to toggle features
- Config: edit `config` row to change branding

### Next.js
- Add `logging: { fetches: { fullUrl: true } }` to `next.config.ts` for fetch debugging
- React DevTools for component debugging

## Troubleshooting

### `KnexTimeoutError` / `ECONNREFUSED`

1. **Check pooler hostname** — Verify `DATABASE_URL` in `.env` matches your Supabase project's pooler settings (Settings → Database → Connection string → URI mode)
2. **Check port** — Use port `5432` for session pooler (not `6543` for transaction pooler)
3. **No `databaseSchema`** — Do NOT set `databaseSchema: "medusa"` in `medusa-config.ts`. Medusa module migrations create tables in `public`, and this setting causes a schema mismatch

### Storefront shows 0 products

The database is empty. Run the seed script:
```bash
cd apps/medusa && npx medusa exec ./src/scripts/seed.ts
```
The seed script is **idempotent** — it checks for existing regions, categories, products, fulfillment sets, and stock locations before creating them. Safe to re-run at any time.

### Storefront returns 400 errors

Missing publishable API key. Check that `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is set in `.env`.

## Key Conventions

- **`dev.sh`** — Use this to start dev environment (handles Redis, env symlink, services)
- **proxy.ts** (NOT middleware.ts) — Next.js 16 uses proxy for auth + locale + role guards
- **`[lang]/` routes** — all pages live under `app/[lang]/`, root page redirects to preferred locale
- **`t()` for translations** — use `createTranslator(dictionary)` in server components, `useI18n().t()` in client
- **Feature flags** — always check flags before rendering optional features
- **Plan limits** — always check limits before creating resources
- **Suspense boundaries** — every async data fetch wrapped in `<Suspense>`
- **Error boundaries** — every route segment has `error.tsx` + `loading.tsx`
- **All tables in `public` schema** — no separate `medusa` schema
- **Toast feedback** — use `useToast().success()` for user actions (add to cart, auth, etc.)
