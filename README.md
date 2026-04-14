# BootandStrap E-Commerce Template

SaaS-managed e-commerce template: Next.js 16, Medusa v2, Supabase. White-labeled storefronts governed via feature flags, plan limits, and dynamic theming.

> Last updated: 2026-04-14

## Stack

| Component | Role |
|-----------|------|
| **Next.js 16** | Storefront (App Router, Server Components, Streaming) |
| **Medusa v2** | Headless commerce (catalog, cart, orders, payments) |
| **Supabase** | Auth, PostgreSQL, Storage CDN |
| **Stripe** | Payments |
| **Redis** | Event bus, rate limiting, cache |
| **Tailwind CSS v4** | Styling (`@theme inline`) |
| **Turborepo + pnpm** | Monorepo orchestration |

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

| Doc | Contents |
|-----|----------|
| [GEMINI.md](GEMINI.md) | **AI agent guide** — zone map 🟢🟡🔴⚫, invariants, playbook |
| [HANDOFF.md](HANDOFF.md) | **Human ops checklist** — new tenant onboarding, assets, go-live |
| [docs/](docs/) | Architecture, schema, flows, contracts, dev setup |

## Email System

3 tier-gated designs: `minimal` (free), `brand` (15 CHF/mo), `modern` (30 CHF/mo). Owner selects via `email_preferences.template_design`. 12 templates across 3 categories (essential/transactional/marketing). Pipeline: governance → flag check → design injection → rate limit → Resend → webhook tracking.

## Testing

| Command | Purpose |
|---------|---------|
| `pnpm test:run` | Unit tests |
| `npx playwright test` | E2E smoke (5 critical paths) |
| `sentrux check .` | Architecture boundaries |
| `bash scripts/release-gate.sh` | Full gate |

## Governance

81 feature flags, 31 plan limits, 13 modules. All fetched at runtime via `getConfig()` from central Supabase.

## License

Proprietary — BootandStrap. All rights reserved.
