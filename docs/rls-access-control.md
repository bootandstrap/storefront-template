# RLS Access Control Matrix

> Aligned with effective Supabase policies as of 2026-02-15.

## Access Model

| Table | RLS | Public Read | Public Write | Service-Role | Notes |
|-------|-----|------------|-------------|-------------|-------|
| `tenants` | ✅ | ❌ | ❌ | ✅ | SuperAdmin only |
| `config` | ✅ | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `feature_flags` | ✅ | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `plan_limits` | ✅ | ✅ (own tenant) | ❌ | ✅ | Storefront uses admin client |
| `plan_presets` | ✅ | ❌ | ❌ | ✅ | SuperAdmin only (tier definitions) |
| `profiles` | ✅ | ✅ (own row) | ✅ (own row) | ✅ | User self-management |
| `whatsapp_templates` | ✅ | ✅ (own tenant) | ❌ | ✅ | Read by storefront |
| `carousel_slides` | ✅ | ✅ (own tenant) | ❌ | ✅ | Read by storefront |
| `cms_pages` | ✅ | ✅ (published, own tenant) | ❌ | ✅ | Published-only filter |
| `product_badges` | ✅ | ✅ (own tenant) | ❌ | ✅ | Read by storefront |
| `stripe_webhook_events` | ✅ | ❌ | ❌ | ✅ | Idempotency store |
| `audit_log` | ✅ | ❌ | ❌ | ✅ | Admin audit trail |
| `analytics_events` | ✅ | ❌ | ❌ | ✅ | Server-side only |
| `tenant_errors` | ✅ | ❌ | ❌ | ✅ | Error Inbox (service-role only) |

## Key Design Decisions

1. **Storefront config fetching uses admin client** (service-role) to bypass RLS — config/flags/limits must always be readable regardless of auth state
2. **TENANT_ID is server-only** — `NEXT_PUBLIC_TENANT_ID` is never used for data scoping
3. **New tables** (stripe_webhook_events, audit_log) have RLS enabled with NO policies = service-role only access
4. **Validation** at `check-rls.sh` script confirms all public-schema tables have RLS enabled

## Verification

```bash
# Run RLS check (part of release-gate.sh)
bash scripts/check-rls.sh
```
