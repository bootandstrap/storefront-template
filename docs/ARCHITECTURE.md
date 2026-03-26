# Architecture Overview — Storefront Template

> Consolidated from: ARCHITECTURE.md, DOMAIN_SPLIT.md, STACK_REFERENCE.md.
> Last updated: 2026-03-25.

## System Overview

SaaS-managed e-commerce template: **Next.js 16** (storefront) + **Medusa v2** (headless commerce) + **Supabase Cloud** (auth/config/governance) + **Redis** (events/cache). Everything remotely governed via **feature flags** and **plan limits**.

```
┌──────────────────────────────────────────────────────┐
│            Contabo VPS (Dokploy per tenant)           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Next.js 16  │  │ Medusa v2   │  │   Redis 7    │ │
│  │ :3000       │──│ :9000       │──│   :6379      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┘ │
└─────────┼────────────────┼───────────────────────────┘
          ▼                ▼
┌──────────────────────────────────────────────────────┐
│                  Supabase Cloud                       │
│  Auth · PostgreSQL (public schema) · Storage CDN      │
└──────────────────────────────────────────────────────┘
          │                │
     ┌────┘                └────┐
     ▼                          ▼
  Stripe                     Resend
```

## Key Principles

1. **Single PostgreSQL** — All tables in Supabase `public` schema (Medusa + storefront coexist)
2. **Supabase Auth is King** — Medusa validates Supabase JWTs via custom provider
3. **Feature Flags Drive Everything** — All features toggleable remotely per tenant
4. **Plan Limits Enforce Governance** — `max_products`, `max_customers`, `max_orders_month`, etc.
5. **Dynamic Theming** — Colors from `config` → CSS vars → zero-redeploy brand changes
6. **Server-Side Truth** — Prices, discounts, orders validated server-side by Medusa
7. **Streaming-First** — Suspense boundaries for non-blocking page rendering
8. **Error Resilience** — Error boundaries at every route, graceful degradation

## Domain Split

> **Medusa** = commercial transaction (catalog → cart → checkout → order → fulfillment)
> **Supabase** = everything around the transaction (auth, governance, config, CMS, analytics, storage)

| Domain | System |
|--------|--------|
| Products, Variants, Inventory, Pricing | Medusa |
| Cart, Checkout, Orders, Fulfillment | Medusa |
| Promotions, Shipping, Returns | Medusa |
| Authentication, User Profiles | Supabase |
| Store Config, Feature Flags, Plan Limits | Supabase |
| WhatsApp Templates, CMS Pages, Carousel | Supabase |
| Analytics Events, Audit Log | Supabase |
| Media / Images | Supabase Storage |
| i18n Dictionaries | Storefront filesystem |

## Request Flow

```
Browser → proxy.ts (locale detection, slug rewriting, auth + role check)
       → /[lang]/ route segment (locale resolution + I18nProvider)
       → Server Component / Server Action
       → Medusa API (commerce) OR Supabase Client (config/CMS)
       → Response (streamed via Suspense boundaries)
```

## Caching Strategy

| Data | Method | TTL | Invalidation |
|------|--------|-----|-------------|
| Config + flags + limits | In-memory TTL cache | 5 min | `revalidateConfig()` clears cache |
| Products, Categories | `force-dynamic` | 0 | On-demand |
| Cart | No cache | 0 | Real-time |

---

## Owner Panel Architecture

The owner panel (`/[lang]/panel/`) is a full-featured store management dashboard governed by SaaS flags and plan limits.

### Panel Chrome

| Component | Purpose |
|-----------|---------|
| `PanelShell` | Layout: sidebar + topbar + content area + command palette |
| `PanelTopbar` | Greeting, breadcrumbs, contextual setup nudge, logout |
| `PanelSidebar` | 3-group navigation (Operations · Content · Settings) |
| `CommandPalette` | `⌘K` / `Ctrl+K` keyboard navigation |
| `PanelToaster` | Global toast notification system |

### Sidebar Navigation Groups

```
Operations    Content       Settings
─────────     ─────────     ─────────
Dashboard     Carousel      Store Config
Catalog       WhatsApp      Shipping
Orders        CMS Pages     My Project
Customers     Analytics     Modules
Utilities     Chatbot       Subscription
POS           Reviews
              CRM
              Badges
```

### Dashboard Engines

| Engine | File | Purpose |
|--------|------|---------|
| **Store Readiness** | `lib/store-readiness.ts` | Calculates health score (0-100), generates categorized checklist |
| **Smart Tips** | `lib/smart-tips.ts` | Contextual suggestions based on store state |
| **Achievements** | `lib/achievements.ts` | Gamified milestones (product count, order volume, etc.) |
| **Panel Policy** | `lib/panel-policy.ts` | Route gating, navigation generation, role enforcement |

### Dashboard Components

| Component | Purpose |
|-----------|---------|
| `StoreHealthCard` | Readiness score ring + expandable checklist + replay tour/language |
| `SetupProgress` | Persistent collapsible setup widget (replaces one-shot checklist) |
| `SmartTip` | Contextual suggestion cards |
| `UsageMeter` | Plan limit usage visualization |
| `AchievementProvider` | Client-side toast for newly unlocked achievements |
| `AnimatedStatValue` | Animated number display for dashboard KPIs |

### Onboarding Flow

```
First visit → PanelOnboarding (3 phases: Welcome → Language → Tour)
           → Marks onboarding_completed in Supabase
           → SetupProgress widget stays visible until 100%
           → Topbar nudge shows "X steps left" when score < 60
           → StoreHealthCard offers "Replay Tour" and "Language" re-access
```

### POS System

Components: `POSClient`, `POSProductGrid`, `POSVariantPicker`, `POSCart`, `POSPaymentOverlay`, `POSReceipt`, `POSOfflineBanner`, `POSDashboard`.

Features: barcode scanning, variant selection, thermal printing (ESC/POS via Web Serial), offline detection, cart management.

### Utilities Page (`/panel/utilidades`)

Centralized tabbed UI with feature-flag gating:

| Tab | Flag | Features |
|-----|------|----------|
| WiFi QR | `enable_ecommerce` | QR code generation, `navigator.connection` detection, saved config |
| Loyalty Engine | `enable_crm` | Stamp cards, redemption, customer history |
| Price Labels | `enable_ecommerce` | Barcode generator, price label sheets for printing |

---

## Project-Specific Stack Patterns

### proxy.ts (Next.js 16 — NOT middleware.ts)

`proxy.ts` replaces deprecated `middleware.ts`. Uses `supabase.auth.getClaims()` for server-side JWT validation.

### In-Memory Config Cache (avoids unstable_cache + cookies conflict)

`getConfig()` uses an in-memory TTL cache (5 min). `unstable_cache` was removed because it conflicts with `cookies()` in Next.js 16.

### Medusa Custom Auth Provider

`apps/medusa/src/modules/supabase-auth/`: `authenticate()` extracts JWT → `supabase.auth.getUser(token)` → creates/retrieves AuthIdentity.

### Medusa Supabase Storage Provider

`apps/medusa/src/modules/supabase-storage/`: Uploads to `product-images` bucket, returns CDN URLs.

### Zod Version Constraint

Medusa requires `zod@3.x`, storefront uses `zod@4.x`. Both coexist via pinning in `apps/medusa/package.json`. **Never remove the pin** — Medusa crashes with `Cannot read properties of undefined (reading 'def')`.

## Stack Versions

| Component | Version |
|-----------|---------|
| Next.js | 16.x (App Router, proxy.ts) |
| React | 19.x (Server Components, `useOptimistic`) |
| Medusa.js | 2.13.1 |
| Tailwind CSS | v4 (CSS-first config, `@theme`) |
| Redis | 7 Alpine |
| TypeScript | 5.x (strict mode) |
| pnpm | 9.x |

## Test Coverage

| Metric | Count |
|--------|-------|
| Test files | 83 |
| Total tests | 1030 |
| Panel components | 36 |
| Panel pages | 26 |
