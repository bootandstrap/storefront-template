---
description: Run the ecommerce template locally for development (full stack)
---

# Local Development Workflow

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for Redis)
- Access to BootandStrap governance Supabase credentials

## First-Time Setup

// turbo-all

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Fill in the required variables. See `docs/guides/DEVELOPMENT.md` for the full env var reference.

> **Critical**: You need BOTH the tenant Supabase credentials AND the governance Supabase credentials. The governance keys (`GOVERNANCE_SUPABASE_URL`, `GOVERNANCE_SUPABASE_ANON_KEY`, `GOVERNANCE_SUPABASE_SERVICE_KEY`) control feature flags, plan limits, and maintenance mode.

3. Run Medusa DB migrations (only first time):
```bash
cd apps/medusa && npx medusa db:migrate && cd ../..
```

4. Create a dev tenant in governance Supabase (only first time):

If your `TENANT_ID` does not exist in the governance Supabase, the storefront will show maintenance mode. You have two options:

**Option A** — Use the BootandStrap admin wizard (if available)

**Option B** — Call the `provision_tenant` RPC directly:
```bash
curl -s -X POST "$GOVERNANCE_SUPABASE_URL/rest/v1/rpc/provision_tenant" \
  -H "apikey: $GOVERNANCE_SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $GOVERNANCE_SUPABASE_SERVICE_KEY" \
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

Then update `.env` with the returned `tenant_id`, and enable all feature flags + set enterprise limits (see `docs/guides/DEVELOPMENT.md` §Dev Tenant section).

5. Seed demo products:
```bash
npx tsx scripts/seed-demo.ts
```

## Start Development

// turbo-all

1. Start the full local stack (Redis + Medusa + Storefront):
```bash
./dev.sh
```

2. Open in browser: `http://localhost:3000`

Endpoints:
- **Storefront**: http://localhost:3000
- **Medusa API**: http://localhost:9000
- **Medusa Admin**: http://localhost:9000/app

## Re-seeding Data

// turbo-all

The seed script is idempotent — safe to re-run:
```bash
npx tsx scripts/seed-demo.ts
```

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

## Troubleshooting

### Storefront shows "En mantenimiento"

The storefront defaults to maintenance mode when it can't fetch tenant config. Check:

1. **`TENANT_ID`** in `.env` exists in the governance Supabase `tenants` table
2. **`GOVERNANCE_SUPABASE_ANON_KEY`** is the anon key for the **governance** Supabase (not the tenant one)
3. **`enable_maintenance_mode`** is `false` in `feature_flags` for your tenant
4. Restart the storefront after `.env` changes (Next.js caches env at startup)

### Medusa won't start

Check `DATABASE_URL` points to a valid Supabase pooler. Port must be `5432`.

## Deploying to Production

Just push to main. GitHub Actions handles everything:
```bash
git push origin main
```

Build → GHCR → Dokploy auto-redeploy (~4 min).
