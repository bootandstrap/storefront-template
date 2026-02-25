# SOTA SaaS E-Commerce Template

> **Read this first.** Master guide for AI agents and developers. Updated 25 Feb 2026 (Module Restructure + Phase 6: Testing & UX).

## What This Is

A **reusable, SaaS-managed e-commerce template** built by BootandStrap. This is a **TEMPLATE first** — every feature, component, and design decision must work for **any small business**, not just one specific client. The storefront is white-labeled and remotely governed via a **3-tier governance model**:

| Tier | Access | Controls |
|------|--------|----------|
| **Admin Panel** (SaaS — BootandStrap internal) | Only BootandStrap | Feature flags, plan limits, color presets, theme mode |
| **Owner Panel** (Client — embedded in storefront) | Business owner | Catalog (products + categories + images via Medusa), orders (fulfill/cancel), customers (read-only), carousel, WhatsApp templates, CMS pages, store config, analytics |
| **Template Storefront** (Public — Next.js) | End users | Reads config + flags → renders conditionally |

**First client**: E-Commerce Template (fruit delivery) — but every design choice must be template-agnostic.

**Current state**: Production-hardened after SOTA Remediation Plan (v10) + SOTA UI Audit (13 Feb 2026) + Deep Dive Sprints A–D (15 Feb 2026) + Production Readiness Remediation (20 Feb 2026) + Feature Gate UX + Owner Panel Access Fix (21 Feb 2026) + Customer Project Tracker (22 Feb 2026) + Phase 6: Testing & UX (22 Feb 2026). See *Verified Quality Baseline* below.

### Verified Quality Baseline (22 Feb 2026 — post Phase 6: Testing & UX)

| Gate | Command | Result |
|------|---------|--------|
| **Unit Tests (storefront)** | `pnpm test:run` | ✅ 364 tests, 40 files (vitest) — includes 5 production contract suites + FreeShippingBanner + rate-limit-tenant |
| **Unit Tests (admin)** | `pnpm test:run` | ✅ 22 tests, 3 files (vitest) |
| **Release Gate** | `bash scripts/release-gate.sh` | ✅ 8/8 PASS (includes coverage threshold) |
| **Build** | `pnpm build` | ✅ Storefront builds cleanly |
| **Tenant isolation** | code audit | ✅ Server-only `TENANT_ID`, service-role config fetch, `sales_channel_id` scoped queries |
| **Webhook idempotency** | `stripe_webhook_events` table | ✅ Atomic `claimEvent` upsert — **fail-closed** on DB error (forces Stripe retry) |
| **Production contracts** | 5 test suites | ✅ Checkout multi-method, Chat anti-abuse, Owner Lite gating, Webhook idempotency, Revalidation governance |
| **SuperAdmin validation** | Zod schemas | ✅ All mutations validated + audit logged (including `createTenant`) |
| **Owner Panel validation** | Zod schemas | ✅ All 8 action modules validated (carrusel, mensajes, paginas, tienda, insignias, productos, categorias, pedidos) |
| **Rate limiting** | Redis + fallback | ✅ `rate-limit-redis.ts` (INCR+PEXPIRE pipeline) + `rate-limit-tenant.ts` (per-tenant + IP scoped, 5 tiers) |
| **Dep audit** | `pnpm audit` | ⚠️ 1 moderate (esbuild, Medusa transitive, dev-only) |
| **Lint** | `pnpm lint` | ⚠️ Pre-existing warnings (non-blocking) |
| **Type Check** | `pnpm type-check` | ⚠️ `@ecommerce-template/shared` needs `@types/node` |
| **Lighthouse Performance** | Lighthouse CLI | 🔵 70 (LCP 6.5s, TBT 190ms — optimize pending) |
| **Lighthouse Accessibility** | Lighthouse CLI | ✅ 93 → fixes applied (contrast, landmarks) |
| **Lighthouse Best Practices** | Lighthouse CLI | ✅ 92 |
| **Lighthouse SEO** | Lighthouse CLI | ✅ 91 → fixes applied (meta description, viewport) |

**Repositories**:
- **Template** (storefront + Medusa): [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce)
- **SuperAdmin** (SaaS control plane, integrated into corporate website): [BOOTANDSTRAP_WEB](../BOOTANDSTRAP_WEB)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│               Contabo VPS (Dokploy)                       │
│                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │  Next.js 16   │  │  Medusa v2    │  │    Redis     │ │
│  │  Storefront   │──│  API + Admin  │──│    :6379     │ │
│  │  :3000        │  │  :9000        │  └──────────────┘ │
│  └───────┬───────┘  └───────┬───────┘                   │
│          │                  │                            │
│  ┌───────────────┐          │                            │
│  │  SuperAdmin   │──────────┘  (separate repo/deploy)    │
│  │  :3100        │                                       │
│  └───────┬───────┘                                       │
└──────────┼──────────────────┼───────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                   Supabase Cloud                          │
│                                                           │
│  Auth │ PostgreSQL (public schema only)       │ Storage   │
│       │ config │ feature_flags │ plan_limits   │          │
│       │ plan_presets │ profiles │ whatsapp_templates │     │
│       │ audit_log │ stripe_webhook_events      │          │
│       │ tenant_errors │ module_flag_map          │          │
└──────────────────────────────────────────────────────────┘
           │                  │
           ▼                  ▼
       [ Stripe ]        [ Resend ]
```

### Key Principles

1. **Template-First** — Every UI component and feature must work for ANY business type, not just one client
2. **3-Tier Governance** — Admin Panel (SaaS) → Owner Panel (Medusa) → Template (Storefront)
3. **Single PostgreSQL** — All tables in Supabase `public` schema (Medusa + storefront coexist). `tenant_id` is a UUID column scoped to the `tenants` table for multi-tenant governance
4. **Supabase Auth is King** — All user auth via Supabase. Medusa validates Supabase JWTs
5. **Feature Flags Drive Everything** — Payment methods, auth providers, registration, carousels, CMS, analytics — all toggleable remotely. Flags can be auto-activated by module purchases via `module_flag_map`
6. **Plan Limits Enforce Module Governance** — `max_products`, `max_customers`, `max_orders_month`, etc.
7. **Dynamic Theming** — Color presets + theme mode from `config` → CSS vars → zero-redeploy brand changes
8. **Server-Side Truth** — Prices, discounts, orders validated server-side by Medusa
9. **Streaming-First** — Suspense boundaries for non-blocking page rendering
10. **Error Resilience** — Error boundaries at every route, graceful degradation when APIs are down
11. **i18n-Native** — Dictionary-based translations, `[lang]/` URL routing, localized slugs, multi-currency — all flag-driven
12. **Module Governance** — 8 active modules mapped to flags/limits via `module_flag_map`. Purchases auto-activate features; cancellations reconcile

---

## Stack

| Component | Version | Role |
|-----------|---------|------|
| **Medusa.js** | v2.13.1 | Headless commerce engine (catalog, cart, orders, payments) |
| **Next.js** | 16.1.6 | Storefront SSR, Server Components, Server Actions |
| **React** | 19.2.3 | UI rendering, `useOptimistic()`, `useActionState()`, Suspense |
| **Supabase** | Cloud | Auth, PostgreSQL, Storage CDN, Realtime |
| **Tailwind CSS** | v4 | CSS-first config (`@theme`), no JS config file |
| **Redis** | 7 Alpine | Medusa event bus, cache, background jobs |
| **Turborepo** | Latest | Monorepo build orchestration |
| **pnpm** | 9.x | Workspace package manager |
| **Dokploy** | On Contabo VPS | Docker deployment, SSL, domains |

---

## Project Structure

```
ecommerce-template/
├── apps/
│   ├── storefront/              # Next.js 16 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx             # Root redirect → /[lang]/
│   │   │   │   ├── layout.tsx           # Minimal: fonts, CSS vars, CartProvider, Toaster
│   │   │   │   ├── [lang]/              # ✅ Locale-based routing (en/es/de/fr/it)
│   │   │   │   │   ├── layout.tsx       # I18nProvider + locale validation
│   │   │   │   │   ├── (shop)/          # Storefront routes (public + customer)
│   │   │   │   │   │   ├── layout.tsx   # Header + Footer + CartDrawer + WhatsApp CTA
│   │   │   │   │   │   ├── page.tsx     # Homepage
│   │   │   │   │   │   ├── productos/   # Product list + detail
│   │   │   │   │   │   ├── carrito/     # Cart page
│   │   │   │   │   │   ├── checkout/    # Checkout flow
│   │   │   │   │   │   ├── cuenta/      # Customer panel (dashboard, orders, profile, addresses)
│   │   │   │   │   │   │   ├── page.tsx          # Dashboard (real stats + recent orders)
│   │   │   │   │   │   │   ├── pedidos/          # Order list (paginated) + detail
│   │   │   │   │   │   │   ├── direcciones/      # Address CRUD (modal + server actions)
│   │   │   │   │   │   │   ├── perfil/           # Profile editing + avatar upload
│   │   │   │   │   │   │   └── mi-proyecto/      # Customer project timeline (read-only)
│   │   │   │   │   │   ├── pedido/      # Guest order lookup
│   │   │   │   │   │   └── paginas/     # CMS pages
│   │   │   │   │   ├── (auth)/          # Auth routes
│   │   │   │   │   │   ├── login/       # Login (flag-driven providers)
│   │   │   │   │   │   └── registro/    # Registration (gated by flags + limits)
│   │   │   │   │   └── (panel)/         # Owner panel (auth-guarded: owner/super_admin)
│   │   │   │   │       └── panel/       # 5 fixed + 5 flag-gated modules:
│   │   │   │   │           ├── page.tsx          # Dashboard (stats + recent orders)
│   │   │   │   │           ├── loading.tsx       # ✅ Generic panel loading skeleton
│   │   │   │   │           ├── catalogo/         # ✅ Unified catalog (products + categories tabs)
│   │   │   │   │           ├── pedidos/          # ✅ Order management (list, fulfill, cancel)
│   │   │   │   │           ├── clientes/         # ✅ Customer overview (read-only)
│   │   │   │   │           ├── tienda/           # Store config
│   │   │   │   │           ├── productos/        # ✅ Product CRUD + image upload (Medusa Admin API)
│   │   │   │   │           ├── categorias/       # ✅ Category CRUD (Medusa Admin API)
│   │   │   │   │           ├── carrusel/         # Carousel management (flag-gated)
│   │   │   │   │           ├── mensajes/         # WhatsApp templates (flag-gated)
│   │   │   │   │           ├── insignias/        # Product badges (via catalogo redirect)
│   │   │   │   │           ├── paginas/          # CMS pages (flag-gated)
│   │   │   │   │           ├── analiticas/       # Analytics (flag-gated)
│   │   │   │   │           ├── chatbot/          # ChatbotPRO config (flag-gated)
│   │   │   │   │           └── devoluciones/     # Return requests (flag-gated)
│   │   │   │   ├── api/webhooks/stripe/  # ✅ Idempotent Stripe webhook (dedup via stripe_webhook_events)
│   │   │   │   ├── api/orders/lookup/    # ✅ Rate-limited guest order lookup
│   │   │   │   ├── api/health/           # ✅ Health check (Docker + monitoring)
│   │   │   │   ├── auth/                # OAuth callback handler
│   │   │   │   ├── sitemap.ts           # Dynamic sitemap from Medusa
│   │   │   │   └── robots.ts            # SEO robots
│   │   │   ├── components/
│   │   │   │   ├── layout/      # Header, Footer, LanguageSelector, CurrencySelector
│   │   │   │   ├── products/    # ProductCard, ProductGrid, AddToCartButton
│   │   │   │   ├── checkout/    # Multi-step CheckoutModal, Stripe/Bank/COD/WhatsApp flows, CheckoutShippingStep (delivery estimates)
│   │   │   │   ├── cart/        # CartDrawer, CartItem, FreeShippingBanner
│   │   │   │   ├── account/     # AddressCard, AddressModal, AvatarUpload, ReorderButton, ProjectTimeline
│   │   │   │   ├── ui/          # Toaster, Skeleton, ErrorBoundary, ScrollReveal, FeatureGate
│   │   │   │   └── home/        # HeroSection, CategoryGrid, FeaturedProducts, TrustSection, HeroCarousel
│   │   │   ├── contexts/        # CartContext (with drawer state)
│   │   │   └── lib/
│   │   │       ├── i18n/        # ✅ Dictionary-based i18n system
│   │   │       │   ├── index.ts     # getDictionary(), createTranslator(), slug helpers
│   │   │       │   ├── locale.ts    # Locale resolution (URL → cookie → Accept-Language → config)
│   │   │       │   ├── currencies.ts# Multi-currency: formatPrice(), resolution, cookie
│   │   │       │   ├── error-strings.ts # ✅ Lightweight i18n fallback for error pages (5 locales)
│   │   │       │   └── provider.tsx # I18nProvider context (t(), localizedHref())
│   │   │       ├── dictionaries/ # ✅ en.json, es.json, de.json, fr.json, it.json (625+ keys each)
│   │   │       ├── supabase/    # Browser + Server + Admin (service-role) clients
│   │   │       │   ├── server.ts     # SSR client (cookies-based)
│   │   │       │   ├── browser.ts    # Client-side client
│   │   │       │   └── admin.ts      # ✅ Service-role client (bypasses RLS for config)
│   │   │       ├── medusa/      # Typed API fetchers
│   │   │       │   ├── client.ts    # Store API fetcher + types (MedusaAddress, MedusaOrderItem, etc.)
│   │   │       │   ├── admin.ts     # ✅ Admin API fetcher (JWT auth, 23h cache, null-scope safe)
│   │   │       │   ├── tenant-scope.ts # ✅ getTenantMedusaScope() — returns null when table missing (graceful)
│   │   │       │   └── auth-medusa.ts # Authenticated fetcher (Supabase JWT → Medusa Store API)
│   │   │       ├── seo/         # JSON-LD builders (Product, Org, Breadcrumb)
│   │   │       ├── whatsapp/    # Template engine + message builder
│   │   │       ├── config.ts    # ✅ getConfig() — service-role admin client, in-memory TTL cache (5 min), _degraded flag, trialDaysRemaining
│   │   │       ├── features.ts  # isFeatureEnabled(flag)
│   │   │       ├── feature-gate-config.ts # ✅ Flag → module → BSWEB slug mapping (11 flags, 5 locales)
│   │   │       ├── limits.ts    # checkLimit(resource, count)
│   │   │       ├── analytics-server.ts # ✅ Server-side emitServerEvent() for checkout + webhook flows
│   │   │       ├── panel-auth.ts   # ✅ requirePanelAuth() — role + tenant scope guard
│   │   │       ├── payment-methods.ts  # Dynamic payment method registry
│   │   │       └── security/    # Rate limiting + abuse prevention
│   │   │           ├── rate-limit.ts          # In-memory rate limiter
│   │   │           ├── rate-limit-redis.ts    # Redis-backed distributed rate limiter
│   │   │           ├── rate-limit-factory.ts  # Auto-selects Redis or memory
│   │   │           └── rate-limit-tenant.ts   # ✅ Per-tenant+IP scoped (5 tiers: storefront/cart/checkout/auth/api)
│   │   └── proxy.ts             # Next.js 16 proxy (auth + locale slugs + role protection)
│   │
│   └── medusa/                  # Medusa.js v2
│       ├── src/
│       │   ├── modules/
│       │   │   ├── supabase-auth/     # ✅ JWT validation → AuthIdentity
│       │   │   └── supabase-storage/  # ✅ Supabase Storage file provider
│       │   ├── api/             # Custom API routes
│       │   ├── workflows/       # Custom workflows (WhatsApp checkout)
│       │   ├── subscribers/     # Event handlers (order.placed, etc.)
│       │   └── scripts/seed.ts  # ✅ E-Commerce Template seed (13 products, 5 categories)
│       └── medusa-config.ts     # ✅ Configured with both providers
│
├── packages/shared/             # @ecommerce-template/shared types + constants
├── supabase/migrations/         # ✅ SQL migrations (stripe_webhook_events, audit_log, tenant_errors)
├── docs/                        # Architecture, flows, guides, operations, plans
├── .github/workflows/ci.yml     # ✅ CI pipeline (lint, tests, coverage, build, E2E, Lighthouse)
├── scripts/                     # release-gate.sh (8 gates incl. coverage), check-rls.sh
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## SOTA Patterns

### Streaming & Suspense Architecture

Every page streams independent sections. Users never see a blank screen:

```
layout.tsx → getConfig() blocks (required for theme CSS vars)
  └── page.tsx
        ├── <HeroSection />         — instant (from cached config)
        ├── <ScrollReveal>
        │   <Suspense fallback={<CategoryGridSkeleton/>}>
        │     <CategoryGrid />      — async (Medusa categories)
        ├── <ScrollReveal delay={100}>
        │   <Suspense fallback={<ProductGridSkeleton/>}>
        │     <FeaturedProducts />   — async (Medusa products)
        └── <ScrollReveal delay={200}>
              <TrustSection />      — static, instant, card-lift hover
```

### Caching & Rendering Strategy

> **Important**: `unstable_cache` was removed from `config.ts` because it conflicts with `cookies()` in Next.js 16. Config now uses a **`globalThis`-based in-memory TTL cache** (5 min) shared across all module instances (API routes, layouts, pages). This avoids Turbopack's module isolation issue in dev mode. All pages that call Medusa/Supabase use `force-dynamic` to render on-demand at runtime.

| Data | Strategy | Details |
|------|----------|---------|
| Config + flags + limits | **globalThis in-memory TTL** | 5 min TTL, `revalidateConfig()` to bust, cross-module shared |
| Product list | `force-dynamic` | Rendered on-demand, no build-time prerender |
| Product detail | `force-dynamic` | Rendered on-demand, no build-time prerender |
| Categories | Fetched at request time | Via Medusa API |
| Cart | No cache (real-time) | Direct API calls |
| Homepage | `force-dynamic` | Streams via Suspense at runtime |

On-demand revalidation: `revalidateConfig()` clears `globalThis.__configCache` + calls `revalidatePath('/', 'layout')`. SuperAdmin triggers this remotely via POST `/api/revalidate` after tenant mutations.

### Error Resilience

```
Medusa API down    → Products show fallback empty state / error boundary with retry
Medusa scope miss  → Panel shows amber banner + zero stats (graceful degradation)
Supabase down      → App shows hardcoded fallback config + amber degraded banner
WhatsApp           → Always works (client-side wa.me redirect)
```

Every route segment has `error.tsx` + `loading.tsx`. Reusable `<ErrorBoundary>` component with retry and i18n `labels` prop. Error pages use `error-strings.ts` for lightweight 5-locale fallback (no context dependency). `logTenantError()` sends errors to `tenant_errors` table for SuperAdmin's Error Inbox.

**Degraded mode**: When Supabase is unreachable, `getConfig()` returns `FALLBACK_CONFIG` with `_degraded: true`. Layout shows an amber warning banner in production: *"Configuración en modo degradado"*.

**Medusa scope degradation**: `getTenantMedusaScope()` returns `null` (never throws) when the `tenant_medusa_scope` table is missing or has no mapping. All `admin.ts` functions accept `null` scope and return 0/empty. Panel dashboard shows amber Medusa disconnected banner.

**Trial enforcement**: When `tenantStatus === 'trial'`, `getConfig()` computes `trialDaysRemaining` from `plan_limits.plan_expires_at`. Layout shows a blue countdown banner. When trial expires, tenant is auto-paused.

### SEO Structured Data

- **JSON-LD**: `Product`, `Organization`, `BreadcrumbList` on relevant pages
- **Dynamic `sitemap.ts`**: products + categories from Medusa
- **`robots.ts`**: allow crawling, block `/api/`, `/auth/`, `/cuenta/`
- **Open Graph**: product images + prices for WhatsApp / social link previews

### Toast Notification System

Portal-based `<Toaster>` positioned **top-right** (z-index 70) with auto-dismiss, stacking, and slide animations. Moved from bottom-right to prevent overlap with cart footer buttons:
```tsx
const { success, error } = useToast()
success('Añadido al carrito')
```

---

## SaaS Governance System

### Feature Flags (`feature_flags` table)

Every UI feature checks a flag before rendering. To disable a feature for a client, set its flag to `false` in Supabase — no code change, no redeploy.

| Flag | Controls |
|------|----------|
| `enable_whatsapp_checkout` | WhatsApp order button in checkout |
| `enable_online_payments` | Stripe card payment button |
| `enable_cash_on_delivery` | Cash on delivery option |
| `enable_bank_transfer` | Bank transfer payment option |
| `enable_user_registration` | Registration page visibility |
| `enable_guest_checkout` | Checkout without account |
| `require_auth_to_order` | Force login before ordering |
| `enable_google_auth` | Google OAuth button |
| `enable_email_auth` | Email/password login form |
| `enable_reviews` | Product reviews |
| `enable_wishlist` | Wishlist functionality |
| `enable_carousel` | Homepage hero carousel |
| `enable_cms_pages` | Dynamic CMS pages |
| `enable_analytics` | Event tracking |
| `enable_promotions` | Discount codes |
| `enable_multi_language` | Multi-language support (language selector in header) |
| `enable_multi_currency` | Multi-currency support (currency selector in header) |
| `enable_admin_api` | External admin API access |
| `enable_newsletter` | Newsletter subscription |
| `enable_product_comparisons` | Product comparison page |
| `enable_chatbot` | ChatbotPRO AI assistant |
| `enable_self_service_returns` | Customer-initiated return requests |
| `enable_owner_panel` | **System flag** — Owner Panel always accessible by role (owner/super_admin). Not toggleable. |
| `enable_product_badges` | Badge display on product cards |
| `enable_cookie_consent` | Cookie consent banner |
| `owner_lite_enabled` | Simplified Owner Panel (hides advanced modules) |
| `owner_advanced_modules_enabled` | Advanced panel modules (carousel, WhatsApp, CMS, analytics, chatbot, returns) |
| `enable_crm_segmentation` | CRM customer segmentation (Pro tier) |
| `enable_crm_export` | CRM contact export to CSV (Pro tier) |
| `enable_crm_notes` | CRM contact notes and history (Pro tier) |

> **Module → Flag Auto-Activation**: Flags marked with `enable_*` can be automatically enabled/disabled when the corresponding module is purchased or cancelled. The mapping is defined in the `module_flag_map` table. See `BOOTANDSTRAP_WEB/MODULOS.md` for the full module catalog (8 active modules, tiered flag unlocking).
>
> Flag origins are tracked per-tenant: **module** (auto-activated by purchase), **preset** (applied via SuperAdmin quick-config tool), **admin** (manual toggle), **blocked** (requires module purchase), **system** (internal control).

#### Feature Gate UX (Blocked Module Upsell)

When a flag-gated panel page is disabled, instead of silently redirecting, the `<FeatureGate>` component renders a branded upsell screen:

- Shows module icon, i18n title/description, and CTA linking to `bootandstrap.com/{lang}/modulos/{slug}`
- **Owner-only**: includes reassuring note that customers never see this screen
- Config in `src/lib/feature-gate-config.ts` maps 11 flags → modules → BSWEB slugs (5 locales)
- Applied to 7 panel pages: analíticas, chatbot, carrusel, CMS, WhatsApp, devoluciones, insignias
- Coverage enforced by `src/lib/__tests__/feature-gate-config.test.ts` (9 tests)

### Plan Limits (`plan_limits` table)

Enforce module-based restrictions at the application level:

| Limit | Default | Enforced Where |
|-------|---------|----------------|
| `max_products` | 100 | `productos/actions.ts` — server-side product creation |
| `max_customers` | 100 | `registro/actions.ts` — registration endpoint |
| `max_orders_month` | 500 | `checkout/actions.ts` — `validateMaxOrdersMonth()`, fail-closed |
| `max_categories` | 20 | `categorias/actions.ts` — category creation |
| `max_images_per_product` | 10 | `productos/actions.ts` — image upload |
| `max_cms_pages` | 10 | `paginas/actions.ts` — CMS page creation |
| `max_carousel_slides` | 10 | `carrusel/actions.ts` — carousel slide creation |
| `max_whatsapp_templates` | 5 | `mensajes/actions.ts` — WhatsApp template creation |
| `max_badges` | 5 | `insignias/actions.ts` — toggleBadge/setBadges |
| `max_newsletter_subscribers` | 100 | `api/newsletter/route.ts` — fail-closed |
| `max_admin_users` | 3 | Supabase-managed (no action exists) |
| `max_languages` | 1 | Config-driven, not user-mutable |
| `max_currencies` | 1 | Config-driven, not user-mutable |
| `storage_limit_mb` | 500 | Deferred (requires Supabase Storage tracking) |
| `max_reviews_per_product` | 0 | Ecommerce module tier-gated |
| `max_wishlist_items` | 0 | Ecommerce module tier-gated |
| `max_promotions_active` | 0 | Ecommerce module tier-gated |
| `max_payment_methods` | 1 | Sales Channels module tier-gated |
| `max_crm_contacts` | 0 | CRM module tier-gated |

### Dynamic Payment Methods

Payment/order methods are **entirely feature-flag driven**. The `PaymentMethodSelector` component dynamically renders enabled methods:

- **1 method** → single full-width button
- **2 methods** → two side-by-side buttons
- **3+ methods** → default button + "Otras formas de pago" dropdown

Each method is registered in `src/lib/payment-methods.ts` with id, flag, label, icon, component, and priority.

### RBAC Model

Four roles govern access across the storefront and panels:

| Role | Access Path | Auth Check | Description |
|------|------------|------------|-------------|
| `super_admin` | `/app` (SuperAdmin panel) + `/panel` | `requireAdmin()` → validates `profiles.role` | SaaS operator — full tenant management, flag/limit control |
| `owner` | `/panel` (Owner Panel) | `requirePanelAuth()` → validates role + tenant scope | Business owner — catalog, orders, config for their tenant only |
| `customer` | `/cuenta` (Customer area) | `requireAuth()` → validates Supabase session | End user — orders, addresses, profile, wishlist |
| `anon` | Public storefront | — | Unauthenticated — browse, add to cart, guest checkout |

**Key enforcement rules:**
- Middleware (proxy.ts) is a **UX gate** only — never the final authorization check
- All sensitive mutations validate role **server-side** via `requireAdmin()`/`requirePanelAuth()`/`requireAuth()`
- Owner Panel actions are **double-scoped**: role check + `tenant_id` filter on every query
- `super_admin` can access Owner Panel (inherits `owner` privileges)

---

## How to Expand This Template

### Adding a New Feature Flag

1. **Supabase migration** — Add column to `feature_flags`:
   ```sql
   ALTER TABLE feature_flags ADD COLUMN enable_my_feature BOOLEAN NOT NULL DEFAULT true;
   ```

2. **Use in storefront** — Check the flag before rendering:
   ```tsx
   import { getConfig } from '@/lib/config'

   export default async function MyPage() {
     const { featureFlags } = await getConfig()
     if (!featureFlags.enable_my_feature) return null
     return <MyFeatureComponent />
   }
   ```

3. **Done** — The feature can now be toggled per-client from Supabase without any code change.

### Adding a New Payment Method

1. Add flag to `feature_flags` table: `enable_my_payment_method`
2. Create `src/components/checkout/MyPaymentFlow.tsx`
3. Register in `payment-methods.ts` with id, flag, label, icon, component, priority
4. **Done** — auto-appears in checkout when flag is enabled

### Adding a New Auth Provider

1. Add flag: `enable_github_auth` to `feature_flags`
2. Configure in Supabase Auth dashboard
3. Add button in login page gated by `featureFlags.enable_github_auth`
4. **Done** — callback route handles all OAuth providers automatically

---

## Key Patterns

### Config Fetching (globalThis TTL Cache, 5 min)
```ts
// lib/config.ts — fetches config + flags + limits from Supabase
// Uses globalThis-based TTL cache (shared across all module instances in Turbopack)
const { config, featureFlags, planLimits } = await getConfig()

// Invalidate cache on demand (called by /api/revalidate endpoint)
await revalidateConfig() // clears globalThis.__configCache + revalidatePath('/', 'layout')

// SuperAdmin triggers revalidation remotely:
// POST /api/revalidate { secret: REVALIDATION_SECRET }
```

### Dynamic Theming (Preset + Custom)
```tsx
// layout.tsx — resolves color preset, injects as CSS variables
// Admin Panel sets config.color_preset ('nature' | 'ocean' | 'sunset' | 'berry' | 'monochrome' | 'custom')
// Admin Panel sets config.theme_mode ('light' | 'dark' | 'auto')
const colors = preset !== 'custom' ? COLOR_PRESETS[preset] : config
<html
  className={themeMode === 'dark' ? 'dark' : ''}
  style={{
    '--config-primary': colors.primary,
    '--config-secondary': colors.secondary,
    '--config-surface': colors.surface,
  }}>
```

### WhatsApp Message Templates
Templates stored in `whatsapp_templates` table with `{{variable}}` syntax:
```
🛒 *Nuevo Pedido — {{store_name}}*
{{#each items}}
• {{name}} ({{variant}}) x{{qty}} — {{price}}
{{/each}}
💰 *Total: {{total}}*
```
Editable from Supabase without code changes.

### Medusa Custom Module Pattern
```
src/modules/<name>/
├── index.ts    # ModuleProvider(Modules.X, { services: [Service] })
└── service.ts  # Extends AbstractXProvider
```
See `supabase-auth/` and `supabase-storage/` as examples.

### Next.js 16 Proxy (Not Middleware)
```ts
// proxy.ts — replaces deprecated middleware.ts
// Handles: rate limiting, session refresh, locale-aware routing,
// localized slug rewriting (e.g. /en/account → /en/cuenta),
// role-based route protection (owner/super_admin for /panel/*)
```

### Medusa Admin API (JWT Auth)

The Owner Panel calls the Medusa Admin API for catalog, order, and customer management. Auth flow:

1. Server-side `getAdminToken()` calls `POST /auth/user/emailpass` with `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`
2. Returns a JWT valid for 24h — cached in-memory for 23h
3. All admin requests use `Authorization: Bearer <token>` header
4. Automatic retry on 401 (token refresh)

```ts
// lib/medusa/admin.ts — authenticated Admin API calls
const token = await getAdminToken()
const res = await fetch(`${MEDUSA_BACKEND_URL}/admin/products`, {
  headers: { 'Authorization': `Bearer ${token}` },
})
```

**Admin API surface** (all in `lib/medusa/admin.ts`):
- **Products**: `createAdminProduct`, `updateAdminProduct`, `deleteAdminProduct`, `getAdminProduct`
- **Categories**: `createAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`
- **Orders**: `getAdminOrders`, `getAdminOrderDetail`, `createOrderFulfillment`, `cancelAdminOrder`
- **Customers**: `getAdminCustomers`, `getCustomerCount`
- **Images**: `uploadFiles`, `updateProductImages`, `deleteProductImage`
- **Prices**: `updateVariantPrices`

Owner Panel server actions (8 `actions.ts` files) call `admin.ts` helpers → mutations trigger `revalidatePanel()` for instant UI refresh across panel + storefront.

### i18n System (Dictionary-Based)

Lean dictionary-based i18n — no heavy libraries. Each locale has a flat JSON file with all UI strings + route slugs:

```ts
// Server Component
const dictionary = await getDictionary(lang as Locale)
const t = createTranslator(dictionary)
return <h1>{t('home.hero.title')}</h1>

// Client Component
const { t, localizedHref } = useI18n()
return <Link href={localizedHref('products')}>{t('nav.products')}</Link>
```

Locale resolution priority: `[lang]` URL segment → `locale` cookie → `Accept-Language` header → `config.language` → `'en'`.

Route slugs are localized per dictionary (e.g., `routes.account = "cuenta"` in ES, `"konto"` in DE). Proxy rewrites canonical English slugs to localized paths.

### Multi-Currency
```ts
import { formatPrice, getCurrency } from '@/lib/i18n/currencies'

const currency = await getCurrency(config.default_currency) // cookie → config → 'usd'
formatPrice(1299, 'eur', 'de') // → "12,99 €"
```

Currency selector appears in header when `enable_multi_currency` flag is on and `active_currencies.length > 1`. Governed by `max_currencies` plan limit.

### Config Columns for i18n/Currency
```sql
-- config table
active_languages TEXT[] DEFAULT '{en}'   -- Admin Panel sets which locales are active
active_currencies TEXT[] DEFAULT '{usd}' -- Admin Panel sets which currencies are active
default_currency TEXT DEFAULT 'usd'      -- Fallback currency
```

---

## Design System

**Pillars**: Template-agnostic theming · Light-first · Glassmorphism · Scroll-reveal animations · Inter + Outfit fonts

| Element | Implementation |
|---------|---------------|
| **Color presets** | 5 built-in presets (nature/ocean/sunset/berry/monochrome) + custom — Admin Panel selects |
| **Theme mode** | `config.theme_mode` → `'light'`/`'dark'`/`'auto'` — `.dark` class on `<html>`, no OS override |
| **Dynamic colors** | Preset or custom → CSS vars `--config-primary`, `--config-secondary`, `--config-accent`, `--config-surface`, `--config-text` |
| **Glassmorphism** | `.glass` / `.glass-strong` utilities — frosted header, cards, modals |
| **Product cards** | `.product-card` — hover lift + shadow + border glow + badge support |
| **Image fallbacks** | Template-agnostic gradient + SVG icon when product has no image |
| **Buttons** | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-whatsapp`, `.btn-danger` |
| **Form inputs** | `.input` — consistent styling for text inputs, selects |
| **Skeletons** | Shimmer animation via CSS `@keyframes`, reusable `<Skeleton>` component |
| **Micro-animations** | Cart badge pulse, scroll-reveal stagger (`ScrollReveal` component), button ripple, `card-lift` hover, `count-bump` quantity change |
| **Section dividers** | `.section-divider` — gradient `<hr>` between homepage sections |
| **Touch targets** | `.touch-target` — WCAG 2.5.5 minimum 44px enforcer |
| **Safe area** | `.safe-area-bottom` — iOS notch/toolbar padding (CheckoutModal, WhatsApp CTA) |
| **Accessibility** | `prefers-reduced-motion` media query disables all animations |
| **Product badges** | `product.metadata.badges[]` — managed by Owner Panel, rendered by template |

### Z-Index Layering System

The storefront uses a well-defined z-index hierarchy to prevent overlay conflicts:

| Layer | z-index | Element | Notes |
|-------|---------|---------|-------|
| **WhatsApp Float** | 40 | `.whatsapp-float` | Hidden via `body.drawer-open` class |
| **Cart Drawer** | 50 | `CartDrawer` | Adds `drawer-open` to `<body>` on open |
| **Checkout Modal** | 60 | `CheckoutModal` | Adds `drawer-open` to `<body>` on open |
| **Toast** | 70 | `Toaster` | Always visible, top-right position |

The `body.drawer-open` CSS class is managed by `CartDrawer`, `CheckoutModal`, and `Header` (mobile menu). When active, it hides the WhatsApp float CTA to prevent overlap.

```css
/* globals.css */
body.drawer-open .whatsapp-float { display: none; }
```

---

## Development

### Quick Start (recommended)

```bash
# 1. Install dependencies
pnpm install

# 2. First-time DB setup (only once)
cd apps/medusa && npx medusa db:migrate && cd ../..

# 3. Seed products (idempotent — safe to re-run)
cd apps/medusa && npx medusa exec ./src/scripts/seed.ts && cd ../..

# 4. Start everything with dev.sh
./dev.sh
# → Storefront:   http://localhost:3000
# → Medusa API:   http://localhost:9000
# → Medusa Admin: http://localhost:9000/app
# → SuperAdmin:   http://localhost:3100
# → Redis:        localhost:6379
```

`dev.sh` handles: Redis in Docker → symlinks `.env` → starts Medusa, Storefront & SuperAdmin in parallel.

> **Note**: The SuperAdmin panel is now integrated into the corporate website (`BOOTANDSTRAP_WEB`). Start it separately with `cd ../BOOTANDSTRAP_WEB && pnpm dev`.

### Development Credentials

| # | Panel | URL | Email | Password | Role |
|---|-------|-----|-------|----------|------|
| 1 | **Medusa Admin** | `localhost:9000/app` | `admin@medusajs.com` | `supersecret` | Medusa admin (product/order mgmt) |
| 2 | **SuperAdmin + Storefront** | `localhost:3100` / `localhost:3000` | `admin@example.com` | `Admin1234!` | `super_admin` (SaaS control plane + Owner Panel) |
| 3 | **Storefront** | `localhost:3000` | `test@example.com` | `Admin1234!` | `customer` (test buyer) |

> **Note**: User #1 is a Medusa-native user (created by `medusa db seed`). Users #2 and #3 are Supabase Auth users managed from the [Supabase Dashboard](https://supabase.com/dashboard/project/fopjqjoxwelmrrfowbmv/auth/users). After login, `super_admin`/`owner` roles redirect to `/panel` (Owner Panel), `customer` role redirects to `/cuenta` (Customer Dashboard).

### Manual Start (alternative)

```bash
docker compose up redis -d
cd apps/medusa && pnpm dev &
cd apps/storefront && pnpm dev &
cd ../BOOTANDSTRAP_WEB && pnpm dev &  # SuperAdmin (integrated in corporate site)
```

### Build

```bash
# Build storefront only (Medusa not required to be running)
pnpm turbo build --filter=storefront

# All pages render as force-dynamic — no prerendering issues
# Build warnings about fallback config are expected when Supabase is offline
```

## Deployment (GHCR + Dokploy on Contabo VPS)

### Architecture

- **Shared Medusa image**: `ghcr.io/bootandstrap/medusa:latest` — ONE image, all tenants share it.
- **Per-tenant storefront**: `ghcr.io/bootandstrap/store-{slug}:latest` — each tenant has its own repo (`bootandstrap/store-{slug}`).
- **Dokploy** orchestrates containers using Docker provider (not Git).
- **GH Actions** builds images on push to `main` and pushes to GHCR.

### Developer workflow

```bash
git push origin main
# → GH Actions builds Docker image (~3-4 min)
# → Pushes to ghcr.io/bootandstrap/store-{slug}:latest
# → GH Actions calls Dokploy redeploy API
# → Dokploy pulls new image and restarts container
```

### CI/CD Pipelines

| Pipeline | Repo | Trigger | Image |
|----------|------|---------|-------|
| `docker-publish.yml` | `bootandstrap-ecommerce` | Push to `main` (medusa changes) | `ghcr.io/bootandstrap/medusa:latest` |
| `deploy.yml` | `store-{slug}` (per tenant) | Push to `main` | `ghcr.io/bootandstrap/store-{slug}:latest` |

### Domains (per tenant)

- `{slug}.bootandstrap.com` → storefront:3000 (HTTPS, Let's Encrypt)
- `medusa-{slug}.bootandstrap.com` → medusa:9000 (HTTPS, Let's Encrypt)

> **Important**: All GHCR packages must be set to **PUBLIC** for Dokploy to pull without authentication.

---

## Implementation Progress

> Updated 13 Feb 2026 after completing SOTA UI Audit (i18n completeness, micro-interactions, accessibility polish).

| Phase | Status | What |
|-------|--------|------|
| 1. Backend Foundation | ✅ | Schema, DB, Auth module, Storage module, Seed (idempotent) |
| 2. Storefront MVP | ✅ | Lib layer, SOTA design, products, cart, auth, WhatsApp checkout |
| 3. Payments & Orders | ✅ | Stripe (idempotent webhooks), account dashboard, order tracking |
| 4. Polish & Hardening | ✅ | CMS, analytics, error boundaries, toast system |
| 5. Production Deploy | ✅ | Docker, Dokploy, Redis, CI with tests, release gate |
| 6. i18n + Route Restructuring | ✅ | `[lang]/` routing, 5 dictionaries (485+ keys), i18n system, proxy |
| 7. Customer Panel Polish | ✅ | Dashboard, orders, addresses CRUD, avatar upload |
| 8A. Multi-Tenant Foundation | ✅ | Server-only `TENANT_ID`, service-role config fetch |
| 8B. Governance Enforcement | ✅ | Zod-validated SuperAdmin mutations + audit trail |
| 8C. Owner Panel | ✅ | `tenants` table created, all actions Zod-validated + tenant-scoped + plan-limited |
| 8D. SuperAdmin Panel | ✅ | Tenant CRUD, flag toggles, config presets — **separated to own repo** |
| 9. Production Hardening (v5) | ✅ | 181 storefront + 14 admin tests, Redis rate limiter, atomic webhook dedup, RLS audit |
| **10. Customer Project Tracker** | ✅ | `project_phases` table, auto-create trigger, SuperAdmin phase management, customer timeline at `/cuenta/mi-proyecto`, i18n (5 locales) |

### SOTA Remediation Plan v5 (Completed)

All 13 tasks executed and verified. Builds on v4. Key outcomes:

| Area | Improvement |
|------|-------------|
| **Guest order lookup** | `display_id` search + compound `ip:email` rate-limit key |
| **Stripe webhooks** | Atomic `claimEvent` upsert — eliminates race conditions |
| **Readiness probe** | Uses service-role key instead of RLS-sensitive client |
| **Rate limiting** | Redis-backed limiter (`INCR+PEXPIRE` pipeline) with in-memory fallback |
| **CI hardening** | Lighthouse blocking, migration consistency check in build |
| **SuperAdmin** | `createTenant` now Zod-validated; `updateTenantStatus`, `deleteTenant` audit-logged |
| **Zod version pinning** | `zod@3.25.76` pinned in Medusa to prevent v4 hoisting conflict |
| **Dep audit** | 1 moderate (esbuild, Medusa transitive, dev-only — cannot override) |
| **Config security** | Service-role admin client for tenant-scoped config fetch |
| **Tenant ID** | Server-only contract, no `NEXT_PUBLIC_TENANT_ID` fallback |
| **RLS docs** | [rls-access-control.md](docs/rls-access-control.md) — complete access matrix |
| **DB migrations** | `stripe_webhook_events` + `audit_log` tables applied |

See [remediation plan v10](docs/plans/2026-02-10-sota-production-remediation-plan-v10-dual-repo.md) for full details.

### Production Readiness Remediation (20 Feb 2026)

Addressed all findings from the integral production readiness report:

| Finding | Fix | Contract Test |
|---------|-----|---------------|
| **C1**: `max_orders_month` not tenant-scoped | Added `sales_channel_id` filter via `getTenantMedusaScope()` | `production-contract-checkout.test.ts` |
| **C2**: Chat API lacks server-side rate-limit | 10 req/min rate-limit + visitor quota server-side + fail-closed | `production-contract-chat.test.ts` |
| **C3**: Duplicate migration file | Deleted `apps/storefront/src/supabase/migrations/` (canonical is `supabase/migrations/`) | `production-contract-revalidation.test.ts` |
| **C4**: Analytics funnel hardcoded to 0 | Real data from `analytics_events` + `order_placed` emitted in all 4 checkout paths | `production-contract-checkout.test.ts` |
| **H1**: `devoluciones` not using central guard | Now uses `shouldAllowPanelRoute('devoluciones')` | `production-contract-owner-lite.test.ts` |
| **H2**: Webhook idempotency fail-open | `claimEvent` returns `false` on failure → Stripe retries | `production-contract-webhook.test.ts` |
| **H3**: Schema ownership cutoff too permissive | Cutoff moved from `20260215` to `20260208` | `production-contract-revalidation.test.ts` |

New files: `src/lib/analytics-server.ts` (server-side event emitter), 5 production contract test suites (78 tests).

### Production Remediation (12 Feb 2026)

| Area | Improvement |
|------|-----------|
| **RLS hardening** | Tenant-scoped policies replacing `USING (true)` on all governance tables |
| **Webhook hardening** | Status tracking (claimed/processed_ok/processed_failed), proper HTTP codes, retry tests |
| **Registration hardening** | `max_customers` fail-closed enforcement with admin client + tenant-scoped count |
| **Credential cleanup** | Removed `'supersecret'` fallback, mandatory env validation, CREDENTIALS.md |
| **Error Inbox** | `tenant_errors` table + `logTenantError()`. SuperAdmin: global dashboard + per-tenant tab |
| **Release gate** | `release-gate.sh` 7/7 PASSED (RLS, audit, lint, tests, type-check, build) |
| **RLS assessment** | Supabase security advisors audit — 80+ Medusa tables no RLS (expected), governance tables secured |

### SOTA Remediation v10 — Refactoring & Docs (Completed)

| Area | Improvement |
|------|-----------|
| **SuperAdmin responsive** | Sidebar refactored: 30+ inline styles → CSS classes, mobile drawer at ≤768px |
| **Lighthouse a11y** | Color contrast fixed (WCAG AA), preconnect hints, viewport meta |
| **Lighthouse SEO** | Homepage `generateMetadata()` with meta description fallback |
| **Documentation** | Both repos GEMINI.md bumped to v10, quality gates updated |

### v11 — Owner Panel Completion (11 Feb 2026)

| Area | Improvement |
|------|-----------|
| **Phase 0: UX Redesign** | WhatsApp template UX (live preview, variable bar, presets), old route redirects (`productos/categorias/insignias → catalogo`), `revalidatePanel()` helper |
| **Phase 1: Orders** | `getAdminOrders`, `getAdminOrderDetail`, `createOrderFulfillment`, `cancelAdminOrder` in `admin.ts`. Orders page with inline detail expansion, fulfill/cancel actions |
| **Phase 2: Customers** | `getAdminCustomers`, `getCustomerCount` in `admin.ts`. Read-only customer overview page |
| **Phase 3: Image upload** | `uploadFiles`, `updateProductImages`, `deleteProductImage` in `admin.ts`. Image dropzone in CatalogClient with type/size validation (5MB, JPEG/PNG/WebP/GIF) |
| **Phase 4: Stability** | `retry.ts` (exponential backoff + jitter), `loading.tsx` (panel skeleton), toast feedback on all 9 panel clients (~30 mutation handlers) |
| **Medusa Admin API auth** | Rewrote `admin.ts`: JWT via `/auth/user/emailpass`, 23h cache, auto-retry on 401 |
| **Sidebar** | 5 fixed items (Dashboard, Catálogo, Pedidos, Clientes, Mi Tienda) + 4 flag-gated modules (Carousel, WhatsApp, CMS, Analytics) |
| **i18n** | All 5 dictionaries updated with `panel.orders.*` (23 keys) + `panel.customers.*` (8 keys) |
| **Documentation** | All 3 GEMINI.md + DOCS_GUIDE + API_REFERENCE updated to reflect actual project state |

### v12 — SOTA UI Audit (13 Feb 2026)

| Area | Improvement |
|------|-----------|
| **Design System** | Added `.input`, `.btn-danger`, `.card-lift`, `.animate-count-bump`, `.section-divider`, `.touch-target`, `.safe-area-bottom`, `prefers-reduced-motion` to `globals.css` |
| **Component Fixes** | CartItem: Package icon (template-agnostic), 36px touch targets, count-bump animation. CategoryGrid: localized links. Header: nav.menu aria-label. CheckoutModal: safe-area-bottom. Product detail: localized breadcrumbs |
| **i18n Completeness** | Error pages rewritten with `error-strings.ts` (5-locale fallback). ErrorBoundary: i18n `labels` prop. HeroCarousel: i18n aria-labels. 8 new keys × 5 locales (490+ total keys per locale) |
| **Micro-interactions** | New `ScrollReveal` component (IntersectionObserver, respects `prefers-reduced-motion`). Homepage sections wrapped with staggered entrance animations. TrustSection card-lift hover. CartItem quantity bump |
| **Responsive Polish** | HeroSection Image `sizes="100vw"`. CheckoutModal safe-area. CartItem 36px WCAG touch targets |
| **Locale Fixes** | `formatPrice` in CartItem, carrito page, CheckoutModal — all fixed from hardcoded locale to i18n context |
| **Build** | ✅ Clean build verified (exit code 0, 155 pages, 39 feature flags) |

---

## Build Notes (Feb 2026)

Key findings during build verification:

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `cookies()` inside `unstable_cache()` | Next.js 16 prohibits dynamic functions inside `unstable_cache` | Replaced with in-memory TTL cache (5 min) |
| Medusa `ECONNREFUSED` during build | Pages tried to prerender but Medusa wasn't running | Added `export const dynamic = 'force-dynamic'` to all API-dependent pages |
| `revalidateTag` undefined | Next.js 16 removed `revalidateTag` export | Switched to `revalidatePath('/', 'layout')` |
| `KnexTimeoutError` on DB connect | Wrong Supabase pooler hostname (`aws-0` vs `aws-1`) | Fixed hostname in `.env` and `apps/medusa/.env` |
| `medusa.table does not exist` | `databaseSchema: "medusa"` caused ORM↔module schema mismatch | Removed `databaseSchema` — all tables in `public` |
| Storefront 400 on `/store/*` | Missing `x-publishable-api-key` header | Added `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` to `.env` |
| Seed script fails on re-run | Region/fulfillment/categories already exist | Made seed fully idempotent with existence checks + try-catch |
| Cart action imports break after route move | Pages moved from `(shop)/` to `[lang]/(shop)/` | Updated all import paths to `@/app/[lang]/(shop)/cart/actions` |
| `createServerClient` undefined | Supabase SSR export renamed | Use `createClient` from `@/lib/supabase/server` |
| TypeScript cast error in i18n | `StoreConfig` not indexable | Cast to `Record<string, unknown>` for dynamic access |
| `X-Powered-By` header exposed | Default Next.js behavior | Added `poweredByHeader: false` to both storefront + admin `next.config.ts` |
| Docker dev medusa networking | `network_mode: host` incompatible with Docker Desktop Mac | Switched to standard port mapping + `depends_on: redis` |
| Admin Docker healthcheck fails | Healthcheck hit root `/` which requires auth | Created `/api/health` endpoint, updated `docker-compose.yml` URL |
| **Medusa crash: `reading 'def'`** | **Zod 4 hoisted from storefront conflicts with Medusa's Zod 3 `._def` API** | **Pinned `zod@3.25.76` in `apps/medusa/package.json` + `pnpm.overrides` at root** |

---

## Related Docs

| Doc | Contents |
|-----|----------|
| [DOCS_GUIDE.md](DOCS_GUIDE.md) | **Documentation index** — map of all docs, admin panel, scripts |
| [ROADMAP.md](ROADMAP.md) | Detailed progress tracker + future phases (7–10 SOTA vision) |
| [TEMPLATE_USAGE.md](docs/guides/TEMPLATE_USAGE.md) | How to deploy this template for a new client (superadmin/dev guide) |
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | System diagram, request flow, streaming architecture |
| [AUTH_FLOW.md](docs/flows/AUTH_FLOW.md) | Supabase Auth + Medusa integration, flag-driven providers |
| [CHECKOUT_FLOWS.md](docs/flows/CHECKOUT_FLOWS.md) | Dynamic N-method payment system, WhatsApp templates |
| [DOMAIN_SPLIT.md](docs/architecture/DOMAIN_SPLIT.md) | What lives in Medusa vs Supabase |
| [SUPABASE_SCHEMA.md](docs/architecture/SUPABASE_SCHEMA.md) | All tables, RLS policies, triggers |
| [MEDUSA_CUSTOMIZATIONS.md](docs/flows/MEDUSA_CUSTOMIZATIONS.md) | Custom modules, workflows, API routes |
| [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) | Docker, Dokploy, Contabo VPS setup |
| [DEVELOPMENT.md](docs/guides/DEVELOPMENT.md) | Local setup, commands, debugging |
| [STACK_REFERENCE.md](docs/architecture/STACK_REFERENCE.md) | Detailed patterns for each technology |
| [CLIENT_HANDOFF.md](docs/operations/CLIENT_HANDOFF.md) | Pre-delivery checklist, owner training, support tiers |
| [API_REFERENCE.md](docs/operations/API_REFERENCE.md) | Custom routes, Server Actions, Medusa endpoints |
| [rls-access-control.md](docs/rls-access-control.md) | RLS access control matrix (all tables) |
| [production-contracts.md](docs/production-contracts.md) | Production contracts per module + checkout flows |
| [flag-limit-enforcement-catalog.md](docs/flag-limit-enforcement-catalog.md) | Feature flag + plan limit enforcement audit |
| [Remediation Plan v10](docs/plans/2026-02-10-sota-production-remediation-plan-v10-dual-repo.md) | Final production hardening plan (v10, completed) |

