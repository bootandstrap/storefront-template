# CAMPIFRUT Production Readiness Report — v7 Baseline

**Date:** 2026-02-10  
**SHA:** `01af65af48f3dc8d0b534402e54d558c24d3ac48`  
**Branch:** `main` (dirty — uncommitted remediation work in progress)

## Quality Gate Results

| Gate | Command | Result |
|------|---------|--------|
| `tsc --noEmit` (storefront) | `pnpm -C apps/storefront exec tsc --noEmit` | ❌ FAILED — TS2322 in `proxy.ts` (rate-limiter contract), TS2540 in `url.test.ts` (readonly `NODE_ENV`) |
| Unit Tests (storefront) | `pnpm --filter=storefront test:run` | ✅ 181 tests, 19 files |
| Storefront Build | `pnpm turbo build --filter=storefront` | ❌ FAILED (blocked by TS errors) |
| Medusa Unit Tests | `pnpm -C apps/medusa test:unit` | ❌ FAILED — no tests found (empty `*.unit.spec.[jt]s` glob) |
| Turbo type-check | `pnpm turbo type-check` | ⚠️ FALSE-GREEN — only runs `@campifrut/shared` (storefront/medusa lack script) |
| RLS check | `bash scripts/check-rls.sh` | ⚠️ Uses `grep -P` (non-portable on macOS) |
| npm Audit | `pnpm audit --audit-level=moderate` | ⚠️ GHSA-67mh-4wv8-2f99 (esbuild, dev-only transitive) |

## Known Issues (to be resolved by Tasks 2–14)

1. **TS2322 build blocker** — `proxy.ts` rate-limiter contract mismatch (Task 2)
2. **False-green type-check** — storefront/medusa missing `type-check` script (Task 3)
3. **CMS XSS** — `dangerouslySetInnerHTML` without sanitization (Task 5)
4. **Non-portable RLS gate** — `grep -P` fails on macOS (Task 7)
5. **CI drift** — `start-medusa-stack.sh` references wrong service name (Task 8)
6. **Empty Medusa test suite** — no `*.unit.spec.ts` files exist (Task 10)
