# Development Setup

> **Repository**: `git clone https://github.com/bootandstrap/bootandstrap-ecommerce.git`
> Last updated: 2026-03-07.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for Redis in local dev)
- Supabase account with project created (tenant data plane)
- Access to BootandStrap governance Supabase credentials (control plane)

## Quick Start

```bash
# 1. Clone and install
git clone <repo> ecommerce-template
cd ecommerce-template
pnpm install

# 2. Set up environment
cp .env.example .env
# Fill in ALL required variables (see §Environment Variables below)

# 3. First-time DB setup (only once)
cd apps/medusa && npx medusa db:migrate && cd ../..

# 4. Create dev tenant in governance Supabase (only once — see §Dev Tenant below)

# 5. Seed demo products (idempotent — safe to re-run)
npx tsx scripts/seed-demo.ts

# 6. Start everything
./dev.sh
```

This starts:
- **Storefront**: http://localhost:3000
- **Medusa API**: http://localhost:9000
- **Medusa Admin**: http://localhost:9000/app
- **Redis**: localhost:6379

### What `dev.sh` does

1. Starts Redis (existing local, Docker container, or local `redis-server`)
2. Symlinks root `.env` → `apps/storefront/.env.local`
3. Starts Medusa backend (`pnpm dev`) with IPv4 DNS resolution
4. Starts Storefront (`pnpm dev`) on port 3000
5. Traps `Ctrl+C` to gracefully stop all services

---

## Dev Tenant Setup (Governance)

The storefront requires a valid tenant in the **governance Supabase** (BootandStrap control plane). Without it, the storefront defaults to **maintenance mode** as a security measure.

### Why This Is Needed

The storefront's `getConfig()` function fetches config, feature flags, and plan limits from the central governance Supabase using the `get_tenant_governance` RPC. If the `TENANT_ID` from `.env` doesn't match any tenant in governance, the storefront activates a restrictive fallback: all features disabled, maintenance mode ON.

### How To Create a Dev Tenant

**Step 1** — Provision the tenant via RPC:

```bash
# Use the governance service key (from .env GOVERNANCE_SUPABASE_SERVICE_KEY)
curl -s -X POST "https://odvzsqossriyyscduzfg.supabase.co/rest/v1/rpc/provision_tenant" \
  -H "apikey: <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_name": "Dev Local Store",
    "p_slug": "dev-local",
    "p_plan_tier": "enterprise",
    "p_domain": "localhost:3000",
    "p_color_preset": "emerald",
    "p_owner_email": "dev@bootandstrap.com",
    "p_admin_user_id": "00000000-0000-0000-0000-000000000000",
    "p_country": "ES",
    "p_region_preset": "eu-south",
    "p_locale": "es",
    "p_currency": "EUR"
  }'
```

Response returns the new `tenant_id`. Save it.

**Step 2** — Update `.env`:

```env
TENANT_ID=<returned-tenant-id>
```

**Step 3** — Enable all feature flags (the RPC sets basic/starter defaults):

```bash
TID="<returned-tenant-id>"
curl -s -X PATCH "https://odvzsqossriyyscduzfg.supabase.co/rest/v1/feature_flags?tenant_id=eq.$TID" \
  -H "apikey: <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{
    "enable_ecommerce": true, "enable_chatbot": true, "enable_crm": true,
    "enable_newsletter": true, "enable_product_badges": true,
    "enable_related_products": true, "enable_product_comparisons": true,
    "enable_stock_notifications": true, "enable_cookie_consent": true,
    "enable_live_chat": true, "enable_multi_currency": true,
    "enable_self_service_returns": true, "enable_crm_segmentation": true,
    "enable_crm_export": true, "enable_email_notifications": true,
    "enable_abandoned_cart_emails": true, "enable_email_campaigns": true,
    "enable_email_templates": true, "owner_lite_enabled": true,
    "owner_advanced_modules_enabled": true,
    "enable_maintenance_mode": false
  }'
```

**Step 4** — Set enterprise plan limits:

```bash
curl -s -X PATCH "https://odvzsqossriyyscduzfg.supabase.co/rest/v1/plan_limits?tenant_id=eq.$TID" \
  -H "apikey: <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{
    "plan_name": "enterprise", "plan_tier": "enterprise",
    "max_products": 10000, "max_customers": 100000,
    "max_orders_month": 50000, "max_categories": 200,
    "max_images_per_product": 20, "max_cms_pages": 100,
    "max_carousel_slides": 20, "max_admin_users": 20,
    "max_languages": 5, "max_currencies": 5,
    "max_badges": 100, "max_newsletter_subscribers": 100000,
    "max_promotions_active": 50, "max_payment_methods": 5,
    "max_crm_contacts": 100000, "storage_limit_mb": 50000
  }'
```

**Step 5** — Set tenant status to active:

```bash
curl -s -X PATCH "https://odvzsqossriyyscduzfg.supabase.co/rest/v1/tenants?id=eq.$TID" \
  -H "apikey: <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <GOVERNANCE_SUPABASE_SERVICE_KEY>" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"status": "active", "deployment_status": "active"}'
```

**Step 6** — Restart the storefront (`.env` changes require restart):

```bash
# Kill existing and restart
kill $(lsof -i :3000 -t) 2>/dev/null
cd apps/storefront && npx next dev --turbopack --port 3000
```

---

## Seed Script (`scripts/seed-demo.ts`)

Populates the local Medusa instance with realistic demo data:

| What | Count |
|------|-------|
| Regions | 1 (Europe — EUR, 4 countries) |
| Sales Channels | 1 (linked to publishable API key) |
| Stock Locations | 1 (with fulfillment set + shipping option) |
| Product Categories | 4 |
| Products | 12 (with variants and prices) |

### Usage

```bash
# Default: connects to http://localhost:9000
npx tsx scripts/seed-demo.ts

# Custom Medusa URL
MEDUSA_URL=http://other-host:9000 npx tsx scripts/seed-demo.ts
```

The script is **idempotent** — checks for existing data before creating. Safe to re-run.

### Credentials

The script reads from `.env` (manual parse, no `dotenv` dependency):

| Variable | Default |
|----------|---------|
| `MEDUSA_URL` or `MEDUSA_BACKEND_URL` | `http://localhost:9000` |
| `MEDUSA_ADMIN_EMAIL` | `admin@medusa-test.com` |
| `MEDUSA_ADMIN_PASSWORD` | `supersecret` |

---

## Project Structure

```
ecommerce-template/
├── GEMINI.md                    # ← Master guide (read first)
├── dev.sh                       # ← One-command dev startup
├── scripts/
│   └── seed-demo.ts             # ← Demo data seeder
├── apps/
│   ├── storefront/              # Next.js 16 (App Router)
│   │   ├── src/
│   │   │   ├── app/             # Pages (locale-based routing)
│   │   │   ├── components/      # UI components
│   │   │   └── lib/
│   │   │       ├── config.ts    # Governance config fetch (TTL cache)
│   │   │       ├── features.ts  # Feature flag checker
│   │   │       ├── limits.ts    # Plan limits checker
│   │   │       └── supabase/
│   │   │           └── governance.ts  # Governance Supabase client
│   │   └── proxy.ts             # Next.js 16 proxy (locale + auth)
│   └── medusa/                  # Medusa.js v2 backend
│       ├── medusa-config.ts     # Backend config
│       └── src/modules/         # Custom Supabase auth + storage
├── docs/                        # Documentation
└── .agent/workflows/            # Agent workflows
```

## Common Commands

| Command | Description |
|---------|-------------|
| `./dev.sh` | **Start all services** (Redis + Medusa + Storefront) |
| `npx tsx scripts/seed-demo.ts` | **Seed demo products** (idempotent) |
| `pnpm build` | Build all apps |
| `pnpm test:run` | Run tests |
| `cd apps/medusa && npx medusa db:migrate` | Run Medusa DB migrations |

## Environment Variables

### Required in `.env`

| Variable | Purpose | Source |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Tenant Supabase project URL | Tenant Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tenant Supabase anon key | Tenant Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tenant Supabase service role key | Tenant Supabase |
| `DATABASE_URL` | Supabase pooler connection string | Tenant Supabase |
| `TENANT_ID` | UUID from governance `tenants` table | Governance Supabase |
| `GOVERNANCE_SUPABASE_URL` | Governance Supabase URL | BootandStrap hub |
| `GOVERNANCE_SUPABASE_ANON_KEY` | Governance Supabase anon key | BootandStrap hub |
| `GOVERNANCE_SUPABASE_SERVICE_KEY` | Governance Supabase service role key | BootandStrap hub |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Medusa publishable API key | Auto-generated |
| `REDIS_URL` | Redis connection | Default: `redis://localhost:6379` |
| `MEDUSA_BACKEND_URL` | Medusa API URL | Default: `http://localhost:9000` |

> **Critical**: `GOVERNANCE_SUPABASE_ANON_KEY` must be the anon key for the **governance** Supabase project (`odvzsqossriyyscduzfg`), NOT the tenant Supabase. If this key is wrong, the governance RPC returns "Invalid API key" and the storefront falls back to maintenance mode.

> **Dev mode note**: In local development, all `NEXT_PUBLIC_SUPABASE_*` and `GOVERNANCE_SUPABASE_*` vars point to the **same** central Supabase project. The separation exists for production, where each tenant may have its own Supabase project for auth/data while governance stays centralized.

> **Important**: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is auto-generated when Medusa starts for the first time. Check the Medusa startup logs or the Admin panel (Settings → API Keys).

## Debugging

### Medusa API
- Health: `http://localhost:9000/health`
- Admin panel: `http://localhost:9000/app`

### Supabase
- Dashboard: SQL queries, RLS testing, Auth users
- Feature flags: `feature_flags` table in governance Supabase
- Config: `config` table in governance Supabase

### Next.js
- Add `logging: { fetches: { fullUrl: true } }` to `next.config.ts` for fetch debugging
- React DevTools for component debugging

## Troubleshooting

### Storefront shows "En mantenimiento" (Maintenance Mode)

**Most common cause**: governance config fetch failing.

1. Check `.env` has `GOVERNANCE_SUPABASE_ANON_KEY` (not just the service key)
2. Verify `GOVERNANCE_SUPABASE_ANON_KEY` is for the **governance** project (check JWT `ref` field)
3. Verify `TENANT_ID` exists in governance `tenants` table
4. Verify `enable_maintenance_mode` is `false` in `feature_flags`
5. Restart storefront after `.env` changes

**Debug**: Check server logs for `[config] get_tenant_governance RPC error: Invalid API key`

### Storefront shows 0 products

Run the seed script:
```bash
npx tsx scripts/seed-demo.ts
```

### Storefront returns 400 errors

Missing publishable API key. Check `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `.env`.

### `KnexTimeoutError` / `ECONNREFUSED`

1. Check `DATABASE_URL` matches Supabase pooler settings (port `5432`, not `6543`)
2. Do NOT set `databaseSchema: "medusa"` in `medusa-config.ts`

### Medusa crashes with Zod error

`zod@3.25.76` is pinned in `apps/medusa/package.json`. Don't remove the pin. Run `pnpm install` after dependency changes.

## Module & Feature Flag Architecture

The storefront's features are **governed remotely** by the BootandStrap control plane (BSWEB). Understanding this pipeline is critical for any non-trivial storefront work.

### How Features Get Enabled

```
Tenant purchases module (Stripe) → BSWEB webhook → module-flag-bridge.ts
  → resolves module_flag_map (DB) → activates feature_flags + plan_limits
    → Entitlement Engine resolves 7-layer pipeline → storefront reads via getConfig()
      → isFeatureEnabled() / isWithinPlanLimit() gate UI
```

### Key Files (🔴 LOCKED — Do Not Modify)

| File | Purpose |
|------|---------|
| `lib/config.ts` | Fetches governance data (config + flags + limits) via RPC, TTL cached |
| `lib/features.ts` | `isFeatureEnabled(flags, 'enable_xxx')` — boolean flag check |
| `lib/limits.ts` | `isWithinPlanLimit(limits, 'max_xxx', currentCount)` — numeric limit check |
| `lib/feature-gate-config.ts` | Maps flags → BSWEB module pages for upsell UI |
| `lib/payment-methods.ts` | Payment method registry, flag-gated, priority-sorted |
| `lib/governance-contract.json` | Expected flags/limits schema (verified by tests) |

### Payment Method System

Payment methods live in `lib/payment-methods.ts` and are:
1. **Flag-gated**: each method requires a specific `enable_*` flag to be `true`
2. **Priority-sorted**: methods render in `priority` order (lower = first)
3. **Limit-enforced**: `max_payment_methods` (plan_limits) caps visible methods

Current payment flags (all in `sales_channels` module):

| Flag | Method | Tier Required |
|------|--------|---------------|
| `enable_whatsapp_checkout` | WhatsApp Checkout | Basic (15 CHF/mo) |
| `enable_online_payments` | Card (Stripe) + Apple Pay + Google Pay | Pro (30 CHF/mo) |
| `enable_cash_on_delivery` | Cash on Delivery | Pro |
| `enable_bank_transfer` | Bank Transfer | Enterprise (50 CHF/mo) |

### Adding a New Flag-Gated Feature (Storefront Side)

When BSWEB adds a new feature flag, the storefront needs:

1. **`config.ts`** — Add `enable_<name>: boolean` to the `FeatureFlags` interface
2. **`governance-contract.json`** — Add to the expected flags array
3. **`feature-gate-config.ts`** — Add `FEATURE_GATE_MAP` entry (moduleKey, icon, bswSlug per locale)
4. **Component** — Use `isFeatureEnabled(flags, 'enable_<name>')` to gate UI
5. **Dictionaries (5 locales)** — Add label keys + `featureGate.modules.<name>` for upsell

Run after changes:
```bash
pnpm --filter=storefront vitest run src/lib/__tests__/feature-gate-config.test.ts
pnpm --filter=storefront vitest run src/lib/__tests__/config-schema.test.ts
```

### Upsell Pattern (FeatureGate Component)

When a feature is disabled, the storefront shows an upsell card instead of the feature. The card links to the BSWEB module info page using `getModuleInfoUrl(flagKey, locale)`.

```tsx
// Example: gating a panel page
if (!isFeatureEnabled(flags, 'enable_crm')) {
    return <FeatureGate flagKey="enable_crm" locale={lang} />
}
```

The `<FeatureGate>` component reads from `FEATURE_GATE_MAP` to show the module name, icon, and purchase link.

---

## Key Conventions

- **`dev.sh`** — Use this to start dev environment (handles Redis, env symlink, services)
- **`proxy.ts`** (NOT middleware.ts) — Next.js 16 uses proxy for auth + locale + role guards
- **`[lang]/` routes** — All pages live under `app/[lang]/`, root page redirects to preferred locale
- **`t()` for translations** — `createTranslator(dictionary)` in server, `useI18n().t()` in client
- **Feature flags** — Always check flags before rendering optional features
- **Plan limits** — Always check limits before creating resources
- **Suspense boundaries** — Every async data fetch wrapped in `<Suspense>`
- **All tables in `public` schema** — No separate `medusa` schema
- **Zod version constraint** — Medusa requires `zod@3.x`, storefront uses `zod@4.x`
