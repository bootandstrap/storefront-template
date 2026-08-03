# Assurance Feedback Benchmark

## Validated run

- Date: 2026-08-03 (Europe/Paris)
- Revision: `6289284bbfd632c79667bf03a586dd97e4a1e402`
- Profile: `full`
- Claim boundary: `functional_system_without_commercial_activation`
- Command: `/usr/bin/time -p pnpm assurance:full`
- Assurance workers: 4 (default; `BNS_ASSURANCE_WORKERS` unset)
- Machine: Apple M4 Pro, arm64, 14 logical CPUs
- OS: macOS 26.5.1
- Node.js: v25.2.1
- pnpm: 9.15.4
- Cache context: clean Git worktree with revision-bound assurance receipts invalidated by the new revision; local shared Turborepo cache was warm.

| Run | Receipt result | real | user | sys |
| --- | --- | ---: | ---: | ---: |
| First | 13 passed, 0 cached | 57.56 s | 56.75 s | 13.63 s |
| Second | 0 passed, 13 cached | 0.79 s | 0.52 s | 0.36 s |

The first run executed one storefront Vitest process with V8 coverage, one storefront build task, and Playwright as a separate executable command. Vitest passed 235 files and 2,056 tests. Coverage was 41.30% lines, 41.66% functions, and 33.54% branches. Runtime visual evidence reported 13 passed and 17 explicitly skipped. The risk-domain runner executed one Playwright command and reused eight Vitest-backed commands from the exact storefront assurance receipt.

The second run used the same clean revision and working-tree identity. Every required task was `cached`; no test suite, Playwright command, audit, or build task was re-executed. This reduced measured wall time by approximately 72.9x for identical inputs.

The compatibility coverage consumer accepted the exact task identity, and `scripts/release-gate.sh --dry-run` selected the same 13-task `full` DAG with no deferred evidence.

This benchmark establishes local feedback-loop behavior only. It does not claim commercial or production readiness, deployment readiness, live payment behavior, or physical POS behavior.

## POS-only fast-loop budget

- Date: 2026-08-03 (Europe/Paris)
- Revision: `58e7bba082e6715ff69683cd8cce6836e5867ced`
- Profile and base: `fast --base HEAD`
- Changed scope: one temporary untracked TypeScript probe under `apps/storefront/src/lib/pos/`, removed immediately after the run
- Command: `/usr/bin/time -p pnpm assurance:fast -- --base HEAD`
- Result: 8 passed, 0 cached; `real 15.23 s`, `user 30.43 s`, `sys 3.62 s`

The selector chose policy, audit, Compose security, RLS, schema ownership, POS behavioral tests, storefront lint, and storefront type-check. POS evidence passed 17 files and 187 tests. Full storefront assurance, full risk-domain evidence, Medusa unit, storefront build, and POS conformance remained explicitly `deferred`; none was reported as passed. The measured wall time is below the 90-second local budget. No probe file was retained or committed.
