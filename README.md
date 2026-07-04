# BootandStrap E-Commerce Template

SaaS-managed e-commerce template: Next.js 16, Medusa v2, Supabase. White-labeled storefronts governed via feature flags, plan limits, and dynamic theming.

> Last updated: 2026-06-25

Role: canonical tenant runtime template. In the shared workspace, start with
[`../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md`](../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md);
reusable runtime changes originate here before tenant propagation.

## Stack

| Component            | Role                                                  |
| -------------------- | ----------------------------------------------------- |
| **Next.js 16**       | Storefront (App Router, Server Components, Streaming) |
| **Medusa v2**        | Headless commerce (catalog, cart, orders, payments)   |
| **Supabase**         | Auth, PostgreSQL, Storage CDN                         |
| **Stripe**           | Payments                                              |
| **Redis**            | Event bus, rate limiting, cache                       |
| **Tailwind CSS v4**  | Styling (`@theme inline`)                             |
| **Turborepo + pnpm** | Monorepo orchestration                                |

## Architecture

```
ecommerce-template/
├── apps/
│   ├── storefront/         # Next.js 16 (shop + panel + POS)
│   │   ├── src/app/        # [lang]/(shop)/, (panel)/, (auth)/, api/
│   │   ├── src/components/ # panel/ (69), home/, products/, ui/
│   │   ├── src/lib/        # security/, analytics/, medusa/, supabase/, i18n/, backup/
│   │   ├── src/emails/     # 12 templates + 3 tier-gated layouts
│   │   └── e2e/            # Playwright tests
│   └── medusa/             # Medusa v2 backend (shared Docker image)
├── packages/shared/        # Shared types, governance schemas
└── docs/                   # Architecture, guides, contracts
```

## Documentation

| Doc                                                                                      | Contents                                                                                            |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Workspace harness](../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md)                  | **Cross-repo authority** — ownership, template-first propagation and runtime proof                  |
| [GEMINI.md](GEMINI.md)                                                                   | **AI agent guide** — zone map 🟢🟡🔴⚫, invariants, playbook                                        |
| [AGENTS.md](AGENTS.md)                                                                   | **Repo-local Ponytail guardrails** — execution ladder, anti-overengineering, no semantic downgrades |
| [HANDOFF.md](HANDOFF.md)                                                                 | **Human ops checklist** — new tenant onboarding, assets, go-live                                    |
| [docs/README.md](docs/README.md)                                                         | **Docs index** — architecture, schema, flows, contracts, dev setup, Ponytail adoption               |
| [docs/plans/2026-06-19-ponytail-adoption.md](docs/plans/2026-06-19-ponytail-adoption.md) | Repo-local Ponytail adoption, limits, and hierarchy under the workspace harness                     |

## Email System

3 tier-gated designs: `minimal` (free), `brand` (15 CHF/mo), `modern` (30 CHF/mo). Owner selects via `email_preferences.template_design`. 12 templates across 3 categories (essential/transactional/marketing). Pipeline: governance → flag check → design injection → rate limit → Resend → webhook tracking.

## Testing

| Command                        | Purpose                      |
| ------------------------------ | ---------------------------- |
| `pnpm test:run`                | Unit tests                   |
| `npx playwright test`          | E2E smoke (5 critical paths) |
| `sentrux check .`              | Architecture boundaries      |
| `bash scripts/release-gate.sh` | Full gate                    |

## Governance

Current runtime SSOT: `apps/storefront/src/lib/governance-contract.json` with `83` feature flags, `31` plan limits, and `13` modules. Control-plane ownership remains in `BOOTANDSTRAP_WEB`.

## License

Proprietary — BootandStrap. All rights reserved.
