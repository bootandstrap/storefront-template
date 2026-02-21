# E-Commerce Template v2 — Architecture Overview

> **Purpose**: Single source of truth for how the system works. Read `GEMINI.md` at the project root for the master guide.

## System Overview

E-Commerce Template v2 is a **SOTA SaaS-managed e-commerce template** combining:
- **Next.js 16** (App Router) as the storefront — SSR, Streaming, ISR
- **Medusa.js v2** as the headless e-commerce engine (catalog, cart, checkout, orders, inventory)
- **Supabase Cloud** as the auth, config, governance, storage, and analytics layer

Everything is remotely governed via **feature flags** and **plan limits** in Supabase.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│               Contabo VPS (Dokploy)                       │
│                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │  Next.js 16   │  │  Medusa v2    │  │    Redis     │ │
│  │  Storefront   │──│  API + Admin  │──│    :6379     │ │
│  │  :3000        │  │  :9000        │  └──────────────┘ │
│  └───────┬───────┘  └───────┬───────┘                   │
└──────────┼──────────────────┼───────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                   Supabase Cloud                          │
│                                                           │
│  ┌────────┐  ┌─────────────────────────────────────────┐ │
│  │  Auth  │  │         PostgreSQL                       │ │
│  └────────┘  │  public: config, feature_flags,          │ │
│  ┌────────┐  │    plan_limits, profiles, cms_pages,     │ │
│  │Storage │  │    whatsapp_templates, carousel_slides   │ │
│  │ + CDN  │  │  medusa: (managed by Medusa.js)          │ │
│  └────────┘  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
           │                  │
           ▼                  ▼
     ┌──────────┐       ┌──────────┐
     │  Stripe  │       │  Resend  │
     └──────────┘       └──────────┘
```

## Key Principles

1. **Single PostgreSQL** — All tables in Supabase `public` schema (Medusa + storefront coexist)
2. **Supabase Auth is King** — All user auth via Supabase. Medusa validates Supabase JWTs via custom provider
3. **Feature Flags Drive Everything** — Payment methods, auth providers, registration, CMS, analytics — all toggleable remotely
4. **Plan Limits Enforce SaaS Tiers** — `max_products`, `max_customers`, `max_orders_month`, etc.
5. **Dynamic Theming** — Colors from `config` → CSS vars → zero-redeploy brand changes
6. **Server-Side Truth** — Prices, discounts, orders validated server-side by Medusa
7. **Streaming-First** — Suspense boundaries for non-blocking page rendering
8. **Error Resilience** — Error boundaries at every route, graceful degradation when APIs are down
9. **i18n-Native** — Dictionary-based translations, `[lang]/` URL routing, localized slugs, multi-currency — all flag-driven

## Request Flow

```
Browser → proxy.ts (Next.js 16 — locale detection, slug rewriting, auth + role check)
       → /[lang]/ route segment (locale resolution + I18nProvider)
       → Server Component / Server Action
       → Medusa API (commerce) OR Supabase Client (config/CMS)
       → PostgreSQL (all tables in `public` schema)
       → Response (streamed via Suspense boundaries)
```

## Streaming Architecture (SOTA)

```
layout.tsx
  → getConfig() (blocks — theme vars required)
    └── page.tsx (streaming)
          ├── <Suspense>  HeroSection       — instant (from config)
          ├── <Suspense>  CategoryGrid      — async (Medusa API)
          ├── <Suspense>  FeaturedProducts  — async (Medusa API, ISR 60s)
          └── TrustSection                  — static, instant
```

Each section renders as its data arrives. Skeletons show during async fetches. Zero blank screen time.

## Caching Strategy

| Data | Method | TTL | Invalidation |
|------|--------|-----|-------------|
| Store config + flags + limits | **In-memory TTL cache** | 5 min | `revalidateConfig()` clears cache + `revalidatePath` |
| Products | `force-dynamic` | 0 | Rendered on-demand at runtime |
| Categories | `force-dynamic` | 0 | Rendered on-demand at runtime |
| Cart | No cache | 0 | Real-time |
| Homepage | `force-dynamic` | 0 | Streams via Suspense at runtime |

## Error Recovery

```
Medusa down  → Products show error boundary with retry / empty state
Supabase down → Hardcoded fallback config (store renders with defaults)
WhatsApp     → Always works (client-side wa.me redirect)
Network      → error.tsx captures + shows retry button
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| `GEMINI.md` (root) | Master guide — read first |
| `AUTH_FLOW.md` | Authentication architecture + flag-driven providers |
| `DOMAIN_SPLIT.md` | What lives where and why |
| `CHECKOUT_FLOWS.md` | Dynamic N-method payment system + WhatsApp templates |
| `MEDUSA_CUSTOMIZATIONS.md` | Custom modules, subscribers, workflows |
| `SUPABASE_SCHEMA.md` | Tables, RLS, triggers in `public` schema |
| `DEPLOYMENT.md` | Docker, Dokploy, Contabo VPS |
| `DEVELOPMENT.md` | Local setup, seeds, debugging |
| `STACK_REFERENCE.md` | Detailed tech patterns |
