# Schema Ownership & Migration Strategy

> **Purpose**: Defines which repo owns each database table and the unified migration pipeline.
> **Last updated**: 14 Feb 2026
> **Finding**: INFORMEREMEDIO.md F-014

---

## Shared Supabase Instance

Both repos (`ecommerce-template` and `BOOTANDSTRAP_WEB`) connect to the **same Supabase PostgreSQL instance**, `public` schema.

---

## Table Ownership Matrix

### Governance Tables (owned by BOOTANDSTRAP_WEB)

These tables are created and managed via the SuperAdmin panel. Schema changes originate from `BOOTANDSTRAP_WEB/supabase/migrations/`.

| Table | Primary Writer | Primary Reader | Notes |
|-------|---------------|----------------|-------|
| `tenants` | SuperAdmin | SuperAdmin | Tenant registry. Source of truth for `status`. |
| `config` | SuperAdmin, Owner Panel | Storefront | Per-tenant store config. `default_currency` (not `currency`). |
| `feature_flags` (per-tenant) | SuperAdmin | Storefront, Owner Panel | 34+ boolean columns scoped by `tenant_id`. |
| `plan_limits` | SuperAdmin | Storefront, Owner Panel | 21 limit fields per tenant, module-driven. |
| `profiles` | Supabase Auth, SuperAdmin | SuperAdmin, Storefront | `tenant_id` + `role` (`customer`, `owner`, `super_admin`). |
| `audit_log` | SuperAdmin | SuperAdmin | Write-only mutation trail. |
| `tenant_errors` | Storefront | SuperAdmin | Error Inbox. |

### Storefront Tables (owned by ecommerce-template)

These tables are created during tenant setup and managed via the Owner Panel. Schema changes should be added to the storefront's migration set.

| Table | Primary Writer | Primary Reader | Notes |
|-------|---------------|----------------|-------|
| `cms_pages` | Owner Panel | Storefront | Dynamic content pages. |
| `carousel_slides` | Owner Panel | Storefront | Homepage hero carousel. |
| `whatsapp_templates` | Owner Panel | Storefront | Editable message templates. |
| `analytics_events` | Storefront | Owner Panel | Page views, conversion tracking. |
| `stripe_webhook_events` | Storefront | — | Idempotent webhook deduplication. |

### Medusa Tables (owned by Medusa)

Medusa manages its own tables (`product`, `cart`, `order`, etc.) in the same `public` schema. These are created via `npx medusa db:migrate`.

---

## Feature Flags — Two Models

| Model | Table | Scope | Used By |
|-------|-------|-------|---------|
| **Per-tenant** (canonical) | `feature_flags` | `tenant_id` | Storefront, Owner Panel |
| **Global** (corporate site) | `feature_flags` (BOOTANDSTRAP_WEB) | Key-value, no tenant | BOOTANDSTRAP_WEB site features |

> ⚠️ **Do not confuse these.** The per-tenant model uses boolean columns scoped by `tenant_id`. The global model is a key-value table for BOOTANDSTRAP_WEB's own features (chatbot, wishlist, reviews, analytics).

---

## Migration Pipeline

### For Governance Tables

1. Add SQL migration to `BOOTANDSTRAP_WEB/supabase/migrations/`
2. Apply via Supabase MCP or SQL editor
3. Update `plan-presets.ts` (internal config tool) if new columns affect defaults

### For Storefront Tables

1. Storefront tables are provisioned during tenant creation via `createTenant()` in `governance/tenants.ts`
2. Schema changes that add columns should include backfill for existing tenants
3. Document new columns in storefront's `GEMINI.md`

### For Medusa Tables

1. Schema changes are handled by `npx medusa db:migrate` in `apps/medusa/`
2. Never modify Medusa tables directly — use Medusa's migration system

---

## Pre-Release Checklist

Before releasing schema changes:

- [ ] New columns have default values (safe for existing tenants)
- [ ] `plan-presets.ts` updated if new flags/limits added (internal config tool)
- [ ] `validation.ts` schemas updated if new config fields
- [ ] `config.ts` types updated in `StoreConfig` / `FeatureFlags` / `PlanLimits`
- [ ] Backfill migration for existing tenants if needed
- [ ] Both repos (`tsc --noEmit`) compile cleanly
