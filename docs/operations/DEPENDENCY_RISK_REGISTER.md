# Dependency Risk Register

This document tracks known vulnerabilities accepted as operational risk with formal justification and expiry dates.

## Active Acceptances

### GHSA-67mh-4wv8-2f99 — esbuild (dev-only, Medusa transitive)

| Field | Value |
|-------|-------|
| **Advisory** | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| **Severity** | Moderate |
| **Package** | `esbuild` (transitive via `@medusajs/admin-bundler`) |
| **Environment** | `devDependencies` only — not shipped in production bundle |
| **Exploitability** | Low — requires attacker-controlled build input |
| **Impact** | Build-time only — no runtime risk to storefront or API |
| **Mitigation** | Upgrade when Medusa publishes a release with updated bundler |
| **Acceptance Date** | 2026-02-10 |
| **Review By** | 2026-04-10 (60 days) |
| **Upgrade Trigger** | Medusa core upgrade that bumps `esbuild` ≥ patched version |
| **Accepted By** | BootandStrap Engineering |

## Expired / Resolved

_None._

---

## Policy

- All `pnpm audit` moderate+ findings must either be patched or documented here
- Each acceptance expires after 60 days and must be re-reviewed
- Production-reachable vulnerabilities are **never** accepted — patch immediately
