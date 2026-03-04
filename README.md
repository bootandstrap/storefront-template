# BootandStrap E-Commerce Template

A **SaaS-managed e-commerce template** built with Next.js 16, Medusa v2, and Supabase. White-labeled storefronts governed remotely via feature flags, plan limits, and dynamic theming.

## Stack

| Component | Role |
|-----------|------|
| **Next.js 16** | Storefront (App Router, Server Components, Streaming) |
| **Medusa v2** | Headless commerce engine (catalog, cart, orders, payments) |
| **Supabase** | Auth, PostgreSQL, Storage CDN |
| **Stripe** | Payment processing |
| **Redis** | Medusa event bus, cache |
| **Tailwind CSS v4** | Styling (CSS-first config) |
| **Turborepo + pnpm** | Monorepo build orchestration |

## Documentation

| Doc | Contents |
|-----|----------|
| [GEMINI.md](GEMINI.md) | **Master guide** — zone map, invariants, customization playbook |
| [CUSTOMIZATION.md](CUSTOMIZATION.md) | Client-facing customization guide |
| [docs/](docs/) | Architecture, schema, flows, contracts, development setup |

## License

Proprietary — BootandStrap. All rights reserved.
