# Architecture Overview — Storefront Template

> Last updated: 2026-04-14.

## System Overview

SaaS-managed e-commerce: **Next.js 16** + **Medusa v2** + **Supabase Cloud** + **Redis**. Governed via feature flags and plan limits.

```
┌─────────────── Contabo VPS (Dokploy per tenant) ───────────────┐
│  Next.js 16 (:3000) ── Medusa v2 (:9000) ── Redis 7 (:6379)  │
└────────────────────────┼──────────────┼───────────────────────┘
                         ▼              ▼
         Supabase Cloud (Auth · PostgreSQL · Storage)
              │                    │
         Stripe               Resend
```

## Key Principles

1. **Single PostgreSQL** — All tables in Supabase `public` schema
2. **Supabase Auth is King** — Medusa validates Supabase JWTs
3. **Feature Flags Drive Everything** — All features toggleable remotely
4. **Plan Limits Enforce Governance** — `max_products`, `max_orders_month`, etc.
5. **Dynamic Theming** — Colors from `config` → CSS vars → zero-redeploy
6. **Server-Side Truth** — Prices, discounts, orders validated by Medusa
7. **Streaming-First** — Suspense boundaries for non-blocking rendering

## Domain Split

| Domain | System |
|--------|--------|
| Products, Variants, Inventory, Pricing, Cart, Checkout, Orders | Medusa |
| Auth, Profiles, Config, Flags, Limits, CMS, Analytics, Storage | Supabase |
| i18n Dictionaries | Storefront filesystem |

## Request Flow

```
Browser → proxy.ts (locale + auth + role check) → /[lang]/ route → Server Component
  → Medusa API (commerce) OR Supabase Client (config/CMS) → Response (streamed)
```

## Caching

| Data | TTL | Invalidation |
|------|-----|-------------|
| Config + flags + limits | 5 min (in-memory) | `revalidateConfig()` |
| Products, Categories | `force-dynamic` | On-demand |
| Cart | No cache | Real-time |

## Stack-Specific Patterns

- **`proxy.ts`** (NOT `middleware.ts`) — Next.js 16 proxy for auth/locale/roles
- **In-memory config cache** — `unstable_cache` removed (conflicts with `cookies()` in Next.js 16)
- **Medusa Supabase Auth** — `apps/medusa/src/modules/supabase-auth/`: JWT validation bridge
- **Medusa Supabase Storage** — `apps/medusa/src/modules/supabase-storage/`: CDN uploads
- **Zod constraint** — Medusa requires `zod@3.x`, storefront `zod@4.x`. Both pinned. Never remove pin.

## Stack Versions

| Component | Version |
|-----------|---------|
| Next.js | 16.x (App Router, proxy.ts) |
| React | 19.x (Server Components, `useOptimistic`) |
| Medusa.js | 2.13.1 |
| Tailwind CSS | v4 (`@theme inline`) |
| Redis | 7 Alpine |
| TypeScript | 5.x (strict) |
| pnpm | 9.x |
