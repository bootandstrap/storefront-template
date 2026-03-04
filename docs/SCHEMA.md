# Database Schema & Access Control

> Consolidated from: SUPABASE_SCHEMA.md, rls-access-control.md, SCHEMA_OWNERSHIP.md.
> Last updated: 2026-03-03.

## Shared Supabase Instance

Both repos (`ecommerce-template` + `BOOTANDSTRAP_WEB`) share one Supabase PostgreSQL instance, `public` schema. Medusa also uses `public` — do NOT set `databaseSchema` in medusa-config.

## Table Ownership

### Governance Tables (owned by BOOTANDSTRAP_WEB)

Created via `BOOTANDSTRAP_WEB/supabase/migrations/`. Schema changes originate there.

| Table | Writer | Reader | Key Columns |
|-------|--------|--------|-------------|
| `tenants` | SuperAdmin | SuperAdmin | `id` UUID PK, `slug` UNIQUE, `name`, `domain`, `status`, `deployment_status`, `github_repo_url` |
| `config` | SuperAdmin, Owner Panel | Storefront | `tenant_id` UNIQUE FK, branding, hero, contact, i18n, SEO (~40 columns) |
| `feature_flags` | SuperAdmin | Storefront, Panel | `tenant_id` UNIQUE FK, 44 boolean toggles (8 groups) |
| `plan_limits` | SuperAdmin | Storefront, Panel | `tenant_id` UNIQUE FK, 25 numeric limits |
| `profiles` | Auth trigger, SuperAdmin | All | `id` FK→auth.users, `tenant_id`, `role`, `medusa_customer_id` |
| `audit_log` | SuperAdmin | SuperAdmin | `action`, `tenant_id`, `admin_user_id`, `details` JSONB |
| `tenant_errors` | Storefront (via RPC) | SuperAdmin | `source`, `severity`, `message`, `details`, `resolved` |
| `async_jobs` | Control Plane | Cron processor | `type`, `tenant_id`, `status`, `payload`, `attempts`, `max_attempts` |
| `project_phases` | Trigger (auto) | SuperAdmin, Owner | `tenant_id`, `current_phase` (1 row per tenant, 6 phases) |
| `module_orders` | Webhook | SuperAdmin | `tenant_id`, `stripe_subscription_id`, items, payments |
| `system_defaults` | SuperAdmin | Provisioning | Centralized Web Base default limits |
| `plan_presets` | SuperAdmin | SuperAdmin | Internal quick-config tool (NOT a product) |
| `module_flag_map` | Migration | Provisioning | Module+tier → flags + limits mapping |

### Storefront Tables (owned by ecommerce-template)

| Table | Writer | Reader | Key Columns |
|-------|--------|--------|-------------|
| `cms_pages` | Owner Panel | Storefront | `tenant_id`, `slug` (UNIQUE per tenant), `title`, `body`, `published` |
| `carousel_slides` | Owner Panel | Storefront | `tenant_id`, `type`, `image`, `sort_order`, `active` |
| `whatsapp_templates` | Owner Panel | Storefront | `tenant_id`, `template`, `is_default` (partial unique) |
| `analytics_events` | Storefront | Owner Panel | `tenant_id`, `event_type`, `user_id`, `metadata` JSONB |
| `stripe_webhook_events` | Storefront | — | `event_id` UNIQUE (dedup key), `event_type` |

### Medusa Tables (owned by Medusa)

Managed via `npx medusa db:migrate`. **Never modify directly.** Tables: `product`, `cart`, `order`, inventory, pricing, etc.

## RLS Access Model

| Table | Public Read | Public Write | Service-Role | Notes |
|-------|------------|-------------|-------------|-------|
| `tenants` | ❌ | ❌ | ✅ | SuperAdmin only |
| `config` | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `feature_flags` | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `plan_limits` | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `profiles` | ✅ (own row) | ✅ (own row) | ✅ | User self-management |
| `whatsapp_templates` | ✅ (own tenant) | ❌ | ✅ | |
| `cms_pages` | ✅ (published only) | ❌ | ✅ | Published-only filter |
| `carousel_slides` | ✅ (own tenant) | ❌ | ✅ | |
| `analytics_events` | ❌ | ❌ | ✅ | Server-side only |
| `stripe_webhook_events` | ❌ | ❌ | ✅ | |
| `audit_log` | ❌ | ❌ | ✅ | |
| `tenant_errors` | ❌ | ❌ | ✅ | |

**Key**: RLS enabled + no policies = service-role only. Verify: `bash scripts/check-rls.sh`.

## Governance RPCs (SECURITY DEFINER)

| RPC | Purpose | Access |
|-----|---------|--------|
| `get_tenant_governance(p_tenant_id)` | Returns config + flags + limits + status in 1 call | anon key |
| `log_tenant_error(p_tenant_id, ...)` | Inserts into tenant_errors | anon key |

These allow storefronts to use **anon key** instead of service_role for governance reads/error logging.

## Feature Flags — Two Models

| Model | Table | Scope | Used By |
|-------|-------|-------|---------| 
| **Per-tenant** (canonical) | `feature_flags` | `tenant_id` column, 44 booleans | Storefront, Owner Panel |
| **Global** (HQ only) | `site_feature_flags` | Key-value, no tenant | BOOTANDSTRAP_WEB corporate site |

> ⚠️ Do NOT confuse these. Per-tenant = boolean columns. Global = key-value rows.

## Migration Pipeline

| For | Process |
|-----|---------|
| Governance tables | Add SQL to `BOOTANDSTRAP_WEB/supabase/migrations/` → apply via SQL Editor |
| Storefront tables | Provisioned during tenant creation; schema changes need backfill |
| Medusa tables | `npx medusa db:migrate` — never modify directly |
