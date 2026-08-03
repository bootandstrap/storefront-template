# Airtight Local Assurance Design

## Objective and claim boundary

BootAndStrap needs a local, fail-closed assurance system that can answer four
different questions without conflating them:

1. Is every executable production source file classified and owned?
2. Did tests execute the important branches, rather than merely mention the
   source in a string contract?
3. Would the tests detect a wrong authorization, money, idempotency, cleanup or
   tenant-isolation decision?
4. Did the integrated runtime persist and clean up real local state?

The design targets functional confidence before commercial activation. It does
not authorize Stripe live mutations, real payments/refunds, Stripe Tax, physical
POS or production deployment.

## Rejected approaches

### Blanket 100% line coverage

This rewards trivial lines and can still miss a wrong branch in a critical
guard. It also encourages exclusions, implementation-coupled tests and dead
assertions. It is useful as a long-term property for small pure modules, not as
the system-wide definition of airtight.

### Risk-domain tests without execution coverage

The current matrix proves that named test files exist and pass. It does not
prove they execute the operational source. The POS offline test, for example,
can validate exports and types while almost all IndexedDB behavior remains
unexecuted. This is a valid contract test but insufficient evidence.

## Selected hybrid model

The reusable template owns an `assurance-policy` that classifies the full source
universe. Each rule declares an owner, risk tier and assurance modes. Critical
domains also enumerate operational source files and minimum line/function/branch
coverage. Any unclassified file, missing critical source file, stale report or
expired exclusion fails closed.

Coverage has three simultaneous gates:

- a truthful global ratchet, initially pinned to fresh measured HEAD and allowed
  to move only upward;
- high per-domain floors for critical runtime code;
- changed-code coverage so new work cannot consume existing debt.

Mutation canaries complement coverage on decision-heavy pure logic. A line is
not considered protected merely because it executed: representative wrong
decisions must make the suite fail. Database and browser journeys remain
separate integration evidence because unit coverage cannot prove persistence,
RLS, deployment or visible runtime behavior.

## Responsibility boundaries

`ecommerce-template` owns the policy, runners, critical runtime tests and CI
contract. Its normal unit suite must be hermetic and must not read a BSWEB
checkout. Cross-repo compatibility belongs to explicit certification runners.

`store-tenant-1-0-test` receives the exact reusable files and proves propagation
plus local runtime/database execution. It does not redefine thresholds.

`BOOTANDSTRAP_WEB` consumes normalized evidence, verifies policy/report freshness
and orchestrates the three-repo claim. It does not use a tenant as the source of
reusable fixes and does not replace the frozen Sentrux baseline.

## Evidence and failure behavior

Every normalized receipt records the policy version, repository revision,
source-universe count, classified count, exclusion ledger, global totals,
critical-domain totals and command outcomes. Missing or malformed evidence is a
failure, not a warning. The existing 70% storefront target becomes a ratchet
milestone; the release gate must stop presenting current low coverage as a
non-blocking production-quality success.

Permitted exclusions are narrow generated/type-only/environment adapters with a
reason and owner. Critical business logic cannot be excluded. Existing coverage
debt may be carried only outside critical domains and only behind a non-regression
ratchet; it is visible in the receipt until eliminated.
