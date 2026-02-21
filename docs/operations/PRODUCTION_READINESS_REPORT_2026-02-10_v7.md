# ecommerce-template Production Readiness Report — v7→v8 Baseline

**Date:** 2026-02-10 21:06 CET  
**SHA:** `31011b58` (main, clean)  
**Branch:** `main`

## Quality Gate Results

| Gate | Command | Result |
|------|---------|--------|
| Type Check (all 3 packages) | `pnpm turbo type-check` | ✅ PASS (shared + storefront + medusa, FULL TURBO cache) |
| Unit Tests (storefront) | `pnpm --filter=storefront test:run` | ✅ 206 tests, 20 files |
| Medusa Unit Tests | `pnpm -C apps/medusa test:unit` | ✅ 2 tests, 1 suite (smoke only) |
| Storefront Build | `pnpm turbo build --filter=storefront` | ✅ PASS |
| npm Audit | `pnpm audit --audit-level=moderate` | ❌ FAIL — GHSA-67mh-4wv8-2f99 (esbuild ≤0.24.2, Medusa transitive, dev-only) |
| RLS Static Check | `bash scripts/check-rls.sh` | ✅ PASS |
| Playwright Runner | `npx playwright test --list` | ❌ FAIL — `@playwright/test` not in devDependencies |

## Known Issues (to be resolved by v8 Tasks)

1. **Audit false-green** — `release-gate.sh` uses `--audit-level=high` as non-blocking `gate_warn`; moderate advisory passes silently
2. **No audit waiver policy** — no formal mechanism to accept known CVEs with expiration
3. **Medusa unit tests minimal** — only 1 smoke suite (2 tests), no real module coverage
4. **E2E dependencies missing** — `@playwright/test` not installed, `test:e2e` script absent
5. **E2E assertions permissive** — specs may use soft asserts / try-catch that mask failures
6. **CMS sanitization gap** — `sanitizeHtml()` applied on render but not on write path in `paginas/actions.ts`
7. **`getConfig()` silent fallback** — in production, if Supabase is down, returns fallback config instead of failing
8. **No effective RLS check** — only static regex analysis, no `pg_policies` verification
9. **`dual-repo-release-gate.sh`** — suppresses all command output (`> /dev/null 2>&1`)
10. **Admin CI Node drift** — CI uses Node 22, `.nvmrc` specifies Node 20
11. **Admin `turbopack.root`** — not set, build warning about inferred root
