# Development Setup

> Last updated: 2026-04-14.

## Prerequisites

Node.js 22+, pnpm 9+, Docker (for Redis), BootandStrap governance Supabase credentials.

## Quick Start

```bash
pnpm install
cp .env.example .env        # Fill in ALL required variables (see §Env Vars)
cd apps/medusa && npx medusa db:migrate && cd ../..  # First time only
npx tsx scripts/seed-demo.ts  # Auto-provisions dev tenant + seeds data
./dev.sh                      # Start Redis + Medusa + Storefront
```

URLs: Storefront `http://localhost:3000`, Medusa API `http://localhost:9000`, Admin `http://localhost:9000/app`.

`dev.sh`: starts Redis → symlinks `.env` → starts Medusa + Storefront → traps Ctrl+C.

## Dev Tenant

Storefront requires a valid tenant in governance Supabase. Without it → maintenance mode.

**Automated** (recommended): `npx tsx scripts/seed-demo.ts` auto-provisions tenant, enables all flags, sets max limits, seeds demo data (18 products, 6 categories, 5 customers, 8 orders).

Requirements: `GOVERNANCE_SUPABASE_URL` + `GOVERNANCE_SUPABASE_SERVICE_ROLE_KEY` in `.env`. After seeding, restart storefront.

## Required Env Vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Tenant Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tenant service role |
| `DATABASE_URL` | Supabase pooler (port `5432`) |
| `TENANT_ID` | UUID from governance `tenants` table |
| `GOVERNANCE_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_KEY` | Governance Supabase |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Auto-generated on first Medusa boot |
| `REDIS_URL` | Default: `redis://localhost:6379` |
| `MEDUSA_BACKEND_URL` | Default: `http://localhost:9000` |

> **Critical**: `GOVERNANCE_SUPABASE_ANON_KEY` must be for the **governance** project, not the tenant's. Wrong key → "Invalid API key" → maintenance mode.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "En mantenimiento" | Check `GOVERNANCE_SUPABASE_ANON_KEY`, `TENANT_ID` exists, `enable_maintenance_mode` is false |
| 0 products | Run `npx tsx scripts/seed-demo.ts` |
| 400 errors | Missing `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` |
| `KnexTimeoutError` | `DATABASE_URL` port must be `5432`, no `databaseSchema: "medusa"` |
| Zod crash | `zod@3.25.76` pinned in `apps/medusa/package.json` — don't remove |

## Feature Flag Architecture

```
Module purchase (Stripe) → webhook → module-flag-bridge
  → resolves module_flag_map → activates feature_flags + plan_limits
  → Entitlement Engine (7-layer PDP) → storefront reads via getConfig()
```

### Adding a New Flag-Gated Feature

1. `config.ts` — add `enable_<name>: boolean` to FeatureFlags interface
2. `governance-contract.json` — add to expected flags
3. `feature-gate-config.ts` — add `FEATURE_GATE_MAP` entry
4. Component — use `isFeatureEnabled(flags, 'enable_<name>')`
5. Dictionaries (5 locales) — add label keys

Run: `pnpm --filter=storefront vitest run src/lib/__tests__/feature-gate-config.test.ts`

## Common Commands

| Command | Description |
|---------|-------------|
| `./dev.sh` | Start all services |
| `npx tsx scripts/seed-demo.ts` | Seed demo data |
| `pnpm test:run` | Run tests |
| `pnpm build` | Build all apps |

## Key Conventions

- `dev.sh` for dev environment. `proxy.ts` (not middleware.ts). `[lang]/` routes. `t()` for translations.
- Always check flags before optional features. Always check limits before creating resources.
- All tables in `public` schema. Zod version constraint: Medusa=3.x, storefront=4.x.
