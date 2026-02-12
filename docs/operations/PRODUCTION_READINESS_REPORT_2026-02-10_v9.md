# Production Readiness Report — Dual-Repo Baseline v9

**Date**: 2026-02-10  
**Repos**: `CAMPIFRUT` (template + Medusa) · `bootandstrap-admin` (SuperAdmin)

---

## CAMPIFRUT Quality Gates

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| Lint | `pnpm turbo lint --filter=storefront` | ⚠️ PASS (4 warnings) | `auth.spec.ts` unused vars, `route.test.ts` unused eslint-disable, `rate-limit.test.ts` unused import |
| Type Check | `pnpm turbo type-check` | ✅ PASS | 3 packages (shared, storefront, medusa) |
| Unit Tests | `pnpm --filter=storefront test:run` | ✅ PASS | 206 tests, 20 files (601ms) |
| Coverage | `test:run --coverage` | ❌ FAIL | Missing `@vitest/coverage-v8` dependency |
| Build | `pnpm turbo build --filter=storefront` | ❌ FAIL | `/_not-found` prerender hard-fails: `TENANT_ID` not set in production |
| Migration Check | `bash scripts/check-migration-order.sh` | ⚠️ PASS | 30 policies without `DROP IF EXISTS`, 2 tenant seed files |
| Dep Audit | `pnpm audit --audit-level=moderate` | ⚠️ 1 moderate | esbuild via Medusa transitive (dev-only, GHSA-67mh-4wv8-2f99) |

## bootandstrap-admin Quality Gates

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| Lint | `pnpm lint` | ✅ PASS | 0 errors, 0 warnings |
| Type Check | `pnpm type-check` | ✅ PASS | |
| Unit Tests | `pnpm test:run` | ✅ PASS | 22 tests, 3 files (150ms) |
| Build | `pnpm build` | ✅ PASS | (see turbopack.root warning below) |

## Known Issues / Active Debt

1. **Build-blocking**: `getConfig()` hard-fails during `/_not-found` prerender (no `TENANT_ID` in build env) → **Task 3**
2. **Coverage gate broken**: `@vitest/coverage-v8` not in storefront devDeps → **Task 4**
3. **4 lint warnings**: unused vars in test files → **Task 9**
4. **30 non-idempotent RLS policies**: `CREATE POLICY` without `DROP IF EXISTS` → **Task 10**
5. **Client hardcodes**: `campifrut.com` fallback in `jsonld.ts`, `sitemap.ts`, `robots.ts` → **Task 11**
6. **Audit log swallows errors**: `auditLog()` doesn't check `.insert()` result `{ error }` → **Task 7**
7. **turbopack.root warning**: admin `next.config.ts` missing `turbopack.root` → **Task 8**
8. **Release gate EACCES risk**: `set -e` + gate function can produce confusing errors → **Task 2**
