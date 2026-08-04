# ADR: Assurance tooling boundaries

- Date: 2026-08-03
- Status: accepted
- Claim boundary: `functional_system_without_commercial_activation`
- Owner: ecommerce-template assurance

## Context

BootAndStrap needs stronger local evidence without creating another control
plane, granting unreviewed host privileges, or making a third-party service a
runtime prerequisite. BSWEB remains the only control plane. Evidence absence,
staleness, malformed output, or revision mismatch fails closed.

## Decisions

| Tool or pattern | Decision | Permitted scope | Explicit boundary |
| --- | --- | --- | --- |
| compose-lint 0.14.1 | Adopted | Pinned, read-only scan of the three approved Compose files | No auto-remediation, environment dump, unreviewed suppression, or floating version |
| Syncular doctrine | Adopted | Spec-first protocol, golden vectors, conformance, mutation canaries, and deterministic fault barriers | No Syncular runtime dependency; see the separate spike ADR |
| Sentry | Retained | Existing error capture plus normalized allowlisted evidence | A Sentry or evidence-sink failure cannot change a business result |
| OpenObserve | Deferred candidate | Possible local OTLP-compatible sink after prerequisites below | Not required by tests or runtime; not installed by this ADR |
| CrawlSEO | Deferred evaluation | Full/nightly local crawl evidence only | Never a fast-profile pass substitute and never a production crawl from this plan |
| Dockhand | Rejected as architecture | Deployment UX patterns may inform later designs | No second orchestrator or Docker-socket owner |
| Openship | Rejected as architecture | Integration-pattern notes may inform later designs | No control-plane, tenant-runtime, or order-ownership transfer |

## License and supply-chain gate

No candidate may be added from a name or repository description alone. Before
any installation or vendoring, a later ADR must record the exact upstream
revision, SPDX license and dependency licenses, redistribution constraints,
maintainer/release activity, signed or checksummed artifact source, SBOM and
advisory review, and the pinned rollback procedure. An absent, ambiguous, or
incompatible license blocks adoption. This session did not download or install
the deferred/rejected candidates.

## Privileged-surface gate

Any candidate that asks for a Docker socket, privileged container, host PID or
network namespace, broad bind mount, root user, write access to source, cloud
credential, or unrestricted outbound network is rejected by default. An
exception requires a separate threat model, least-privilege Compose profile,
read-only inputs, ephemeral named outputs, secret redaction proof, cleanup
proof, and explicit approval. Generated evidence may be written only below the
governed artifact location and must be revision-bound.

## OpenObserve prerequisites

OpenObserve may be evaluated only as an optional local sink behind the
`EvidenceSink`/OTLP-compatible boundary. The evaluation must pin images and
digests; bind only loopback ports; use synthetic credentials outside source;
disable external telemetry/egress where supported; cap CPU, memory, retention,
and disk; use an ephemeral volume with verified cleanup; prove tenant/trace
allowlisting and secret rejection; and demonstrate that sink loss leaves the
observed operation unchanged. Until all checks pass, the in-memory sink and
existing Sentry path remain authoritative for tests.

## CrawlSEO prerequisites

A later full/nightly experiment must target only an explicitly started local
storefront, cap routes, depth, concurrency, and duration, and exclude admin,
mutation, checkout submission, payment, refund, webhook, and logout endpoints.
It must use no cookies or secrets and emit a revision-bound receipt. Missing or
stale crawl output is `deferred` in fast and fail-closed when full/nightly makes
it required; it is never converted into `passed` without execution.

## Consequences

The reusable template owns gates and contracts, tenants consume exact reusable
commits, and BSWEB later consumes receipts. No decision here authorizes deploy,
live Stripe activity, physical POS, production-readiness claims, or a Sentrux
baseline change.
