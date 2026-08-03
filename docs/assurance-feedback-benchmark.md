# Assurance Feedback Benchmark

## Task 9 closure run

- Date: 2026-08-03 (Europe/Paris)
- Revision: `9ca4f46c58cca343269cf25abf79c2f99fe74d55`
- Profile: `full --no-cache`
- Claim boundary: `functional_system_without_commercial_activation`
- Result: 15 passed, 0 failed, 0 blocked, 0 deferred
- Receipt window: 85.298 s from the first task start to the final summary
- Cache context: assurance receipt reuse disabled; local shared Turborepo cache retained
- Machine: Apple M4 Pro, arm64, 14 logical CPUs
- OS: macOS 26.5.1
- Node.js: v25.2.1
- pnpm: 9.15.4

The fresh storefront assurance passed 240 files and 2,086 tests. Coverage was
41.96% lines, 42.25% functions, and 34.41% branches. The risk-domain runner
executed one Playwright command, reused eight Vitest-backed commands from the
exact storefront receipt, and reported 13 visual checks passed with 17
explicitly skipped because their local runtime prerequisites were unavailable.
Those skipped checks were not reported as passed.

The first full attempt at revision `098d2992fd7df2d96181693017be49c707d4bfc0`
failed closed in `storefront-assurance`: the hermetic suite found one obsolete
static contract for the runtime-evidence environment fallback. The contract was
updated to verify both the placeholder default and environment-over-default
precedence, committed separately as `9ca4f46c58cca343269cf25abf79c2f99fe74d55`,
and the complete no-cache profile was rerun successfully.

The read-only structural check at the closure revision reported quality
6289 → 6416, coupling 0.03 → 0.03, zero cycles, zero god files, and no complex
function regression. The Sentrux baseline was not modified.

Receipt hashes for the closure run:

- assurance summary: `2922acc7dcc898a3eef7a54ce2186878362fd58ca740d3c2051119a7706fdebd`
- storefront tests: `5ec5113666fc738571d69a3c59f68f13d034f89c77e494f8b4032eae609d6726`
- storefront coverage: `9e2a6e6d9654188253cc1ce07ddb114649983260e66b5c0a4f05e9d3ada2a5bc`
- risk-domain summary: `822e46e4fd16918b0f5791561480cabc1c43c108b12afe8f4b45a97a33e5be4f`

This is local assurance evidence only. It does not claim commercial or
production readiness, deployment readiness, live payment behavior, or physical
POS behavior.

## Review remediation before propagation

The Task 9 code review found three cache/selection gaps and one unsafe POS
adapter assumption. They were corrected in separate template commits before
tenant propagation:

- `7b461ba1` binds cache identity to allowlisted environment values and binds
  receipts and downstream consumers to the current output bytes.
- `a8e582c4` maps every assurance wrapper and its contract tests to
  `assurance-contracts` plus the full-profile dry-run.
- `65976ff0` prevents the offline adapter from treating a normal sale response
  as an authoritative sync acknowledgement. Without a durable server boundary,
  it now fails before creating a draft order.
- `e1612c19` rejects uncorrelated outcomes, negative/stale server sequences, and
  regressive client sequences in future authoritative acknowledgements.

The durable PostgreSQL/Medusa offline commit boundary remains a Task 10
integration prerequisite. Until that proof exists, offline queue commit is
explicitly unavailable and cannot be counted as passed commercial or physical
POS behavior.

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
