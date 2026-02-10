# SOTA SaaS E-Commerce Template

> **Read this first.** Master guide for AI agents and developers. Updated 10 Feb 2026 (post-remediation v5).

## What This Is

A **reusable, SaaS-managed e-commerce template** built by BootandStrap. This is a **TEMPLATE first** — every feature, component, and design decision must work for **any small business**, not just one specific client. The storefront is white-labeled and remotely governed via a **3-tier governance model**:

| Tier | Access | Controls |
|------|--------|----------|
| **Admin Panel** (SaaS — BootandStrap internal) | Only BootandStrap | Feature flags, plan limits, color presets, theme mode |
| **Owner Panel** (Client — Medusa Admin customized) | Business owner | Products, orders, carousel, product badges, WhatsApp templates |
| **Template Storefront** (Public — Next.js) | End users | Reads config + flags → renders conditionally |

**First client**: Campifrut (fruit delivery) — but every design choice must be template-agnostic.

**Current state**: Production-hardened after 13-task SOTA Remediation Plan (v5). See *Verified Quality Baseline* below.

### Verified Quality Baseline (10 Feb 2026 — post-remediation v5)

| Gate | Command | Result |
|------|---------|--------|
| **Unit Tests (storefront)** | `pnpm test:run` | ✅ 181 tests, 19 files (vitest) |
| **Unit Tests (admin)** | `pnpm test:run` | ✅ 14 tests, 2 files (vitest) |
| **Build** | `pnpm build` | ✅ Storefront builds cleanly |
| **Tenant isolation** | code audit | ✅ Server-only `TENANT_ID`, service-role config fetch |
| **Webhook idempotency** | `stripe_webhook_events` table | ✅ Atomic `claimEvent` upsert (no race conditions) |
| **SuperAdmin validation** | Zod schemas | ✅ All mutations validated + audit logged (including `createTenant`) |
| **Owner Panel validation** | Zod schemas | ✅ All 5 action modules validated (carrusel, mensajes, paginas, tienda, insignias) |
| **Rate limiting** | Redis + fallback | ✅ `rate-limit-redis.ts` with INCR+PEXPIRE pipeline |
| **Dep audit** | `pnpm audit` | ⚠️ 1 moderate (esbuild, Medusa transitive, dev-only) |
| **Lint** | `pnpm lint` | ⚠️ Pre-existing warnings (non-blocking) |
| **Type Check** | `pnpm type-check` | ⚠️ `@campifrut/shared` needs `@types/node` |

**Repositories**:
- **Template** (storefront + Medusa): [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce)
- **SuperAdmin** (SaaS control plane): [bootandstrap/bootandstrap-admin](https://github.com/bootandstrap/bootandstrap-admin)

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
│       │ config │ feature_flags │ plan_limits   │ CDN      │
│       │ profiles │ whatsapp_templates          │          │
│       │ audit_log │ stripe_webhook_events      │          │
└──────────────────────────────────────────────────────────┘
           │                  │
           ▼                  ▼
       [ Stripe ]        [ Resend ]
```

### Key Principles

1. **Template-First** — Every UI component and feature must work for ANY business type, not just one client
2. **3-Tier Governance** — Admin Panel (SaaS) → Owner Panel (Medusa) → Template (Storefront)
3. **Single PostgreSQL** — All tables in Supabase `public` schema (Medusa + storefront coexist). `tenant_id` is a plain UUID column (no FK to a `tenants` table) for multi-tenant scoping
4. **Supabase Auth is King** — All user auth via Supabase. Medusa validates Supabase JWTs
5. **Feature Flags Drive Everything** — Payment methods, auth providers, registration, carousels, CMS, analytics — all toggleable remotely
6. **Plan Limits Enforce SaaS Tiers** — `max_products`, `max_customers`, `max_orders_month`, etc.
7. **Dynamic Theming** — Color presets + theme mode from `config` → CSS vars → zero-redeploy brand changes
8. **Server-Side Truth** — Prices, discounts, orders validated server-side by Medusa
9. **Streaming-First** — Suspense boundaries for non-blocking page rendering
10. **Error Resilience** — Error boundaries at every route, graceful degradation when APIs are down
11. **i18n-Native** — Dictionary-based translations, `[lang]/` URL routing, localized slugs, multi-currency — all flag-driven

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
campifrut/
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
│   │   │   │   │   │   │   └── perfil/           # Profile editing + avatar upload
│   │   │   │   │   │   ├── pedido/      # Guest order lookup
│   │   │   │   │   │   └── paginas/     # CMS pages
│   │   │   │   │   ├── (auth)/          # Auth routes
│   │   │   │   │   │   ├── login/       # Login (flag-driven providers)
│   │   │   │   │   │   └── registro/    # Registration (gated by flags + limits)
│   │   │   │   │   └── (panel)/         # Owner panel (auth-guarded: owner/super_admin)
│   │   │   │   │       └── panel/       # Dashboard, config, carousel, messages, badges
│   │   │   │   ├── api/webhooks/stripe/  # ✅ Idempotent Stripe webhook (dedup via stripe_webhook_events)
│   │   │   │   ├── api/orders/lookup/    # ✅ Rate-limited guest order lookup
│   │   │   │   ├── api/health/           # ✅ Health check (Docker + monitoring)
│   │   │   │   ├── auth/                # OAuth callback handler
│   │   │   │   ├── sitemap.ts           # Dynamic sitemap from Medusa
│   │   │   │   └── robots.ts            # SEO robots
│   │   │   ├── components/
│   │   │   │   ├── layout/      # Header, Footer, LanguageSelector, CurrencySelector
│   │   │   │   ├── products/    # ProductCard, ProductGrid, AddToCartButton
│   │   │   │   ├── checkout/    # Multi-step CheckoutModal, Stripe/Bank/COD/WhatsApp flows
│   │   │   │   ├── cart/        # CartDrawer, CartItem
│   │   │   │   ├── account/     # AddressCard, AddressModal, AvatarUpload, ReorderButton
│   │   │   │   ├── ui/          # Toaster, Skeleton, ErrorBoundary
│   │   │   │   └── home/        # HeroSection, CategoryGrid, FeaturedProducts, TrustSection
│   │   │   ├── contexts/        # CartContext (with drawer state)
│   │   │   └── lib/
│   │   │       ├── i18n/        # ✅ Dictionary-based i18n system
│   │   │       │   ├── index.ts     # getDictionary(), createTranslator(), slug helpers
│   │   │       │   ├── locale.ts    # Locale resolution (URL → cookie → Accept-Language → config)
│   │   │       │   ├── currencies.ts# Multi-currency: formatPrice(), resolution, cookie
│   │   │       │   └── provider.tsx # I18nProvider context (t(), localizedHref())
│   │   │       ├── dictionaries/ # ✅ en.json, es.json, de.json, fr.json, it.json (340+ keys each)
│   │   │       ├── supabase/    # Browser + Server + Admin (service-role) clients
│   │   │       │   ├── server.ts     # SSR client (cookies-based)
│   │   │       │   ├── browser.ts    # Client-side client
│   │   │       │   └── admin.ts      # ✅ Service-role client (bypasses RLS for config)
│   │   │       ├── medusa/      # Typed API fetcher (retry + graceful degradation)
│   │   │       │   ├── client.ts    # Base fetcher + types (MedusaAddress, MedusaOrderItem, etc.)
│   │   │       │   └── auth-medusa.ts # Authenticated fetcher (Supabase JWT → Medusa Store API)
│   │   │       ├── seo/         # JSON-LD builders (Product, Org, Breadcrumb)
│   │   │       ├── whatsapp/    # Template engine + message builder
│   │   │       ├── config.ts    # ✅ getConfig() — service-role admin client, in-memory TTL cache (5 min)
│   │   │       ├── features.ts  # isFeatureEnabled(flag)
│   │   │       ├── limits.ts    # checkLimit(resource, count)
│   │   │       └── payment-methods.ts  # Dynamic payment method registry
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
│       │   └── scripts/seed.ts  # ✅ Campifrut seed (13 products, 5 categories)
│       └── medusa-config.ts     # ✅ Configured with both providers
│
├── packages/shared/             # @campifrut/shared types + constants
├── supabase/migrations/         # ✅ SQL migrations (stripe_webhook_events, audit_log)
├── docs/                        # Architecture, flows, guides, operations, plans
├── scripts/                     # release-gate.sh, check-rls.sh
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
        ├── <Suspense fallback={<CategoryGridSkeleton/>}>
        │     <CategoryGrid />      — async (Medusa categories)
        ├── <Suspense fallback={<ProductGridSkeleton/>}>
        │     <FeaturedProducts />   — async (Medusa products)
        └── <TrustSection />         — static, instant
```

### Caching & Rendering Strategy

> **Important**: `unstable_cache` was removed from `config.ts` because it conflicts with `cookies()` in Next.js 16. Config now uses an **in-memory TTL cache** (5 min). All pages that call Medusa/Supabase use `force-dynamic` to render on-demand at runtime.

| Data | Strategy | Details |
|------|----------|---------|
| Config + flags + limits | **In-memory TTL cache** | 5 min TTL, `revalidateConfig()` to bust |
| Product list | `force-dynamic` | Rendered on-demand, no build-time prerender |
| Product detail | `force-dynamic` | Rendered on-demand, no build-time prerender |
| Categories | Fetched at request time | Via Medusa API |
| Cart | No cache (real-time) | Direct API calls |
| Homepage | `force-dynamic` | Streams via Suspense at runtime |

On-demand revalidation: `revalidateConfig()` Server Action clears in-memory cache + calls `revalidatePath('/', 'layout')`.

### Error Resilience

```
Medusa API down → Products show fallback empty state / error boundary with retry
Supabase down   → App shows hardcoded fallback config
WhatsApp        → Always works (client-side wa.me redirect)
```

Every route segment has `error.tsx` + `loading.tsx`. Reusable `<ErrorBoundary>` component with retry.

### SEO Structured Data

- **JSON-LD**: `Product`, `Organization`, `BreadcrumbList` on relevant pages
- **Dynamic `sitemap.ts`**: products + categories from Medusa
- **`robots.ts`**: allow crawling, block `/api/`, `/auth/`, `/cuenta/`
- **Open Graph**: product images + prices for WhatsApp / social link previews

### Toast Notification System

Portal-based `<Toaster>` with auto-dismiss, stacking, and slide animations:
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

### Plan Limits (`plan_limits` table)

Enforce SaaS tier restrictions at the application level:

| Limit | Default | Enforced Where |
|-------|---------|----------------|
| `max_products` | 100 | Medusa admin product creation |
| `max_customers` | 100 | Registration endpoint |
| `max_orders_month` | 500 | Checkout flow |
| `max_categories` | 20 | Category creation |
| `max_images_per_product` | 10 | Image upload |
| `max_cms_pages` | 10 | CMS page creation |
| `max_carousel_slides` | 10 | Carousel management |
| `max_admin_users` | 3 | Admin user creation |
| `max_languages` | 1 | Language selector options |
| `max_currencies` | 1 | Currency selector options |
| `storage_limit_mb` | 500 | Storage upload |

### Dynamic Payment Methods

Payment/order methods are **entirely feature-flag driven**. The `PaymentMethodSelector` component dynamically renders enabled methods:

- **1 method** → single full-width button
- **2 methods** → two side-by-side buttons
- **3+ methods** → default button + "Otras formas de pago" dropdown

Each method is registered in `src/lib/payment-methods.ts` with id, flag, label, icon, component, and priority.

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

### Config Fetching (In-Memory TTL Cache, 5 min)
```ts
// lib/config.ts — fetches config + flags + limits from Supabase
// Uses in-memory TTL cache to avoid unstable_cache + cookies() conflict
const { config, featureFlags, planLimits } = await getConfig()

// Invalidate cache on demand
await revalidateConfig() // clears memory cache + revalidatePath('/', 'layout')
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
| **Buttons** | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-whatsapp` |
| **Skeletons** | Shimmer animation via CSS `@keyframes`, reusable `<Skeleton>` component |
| **Micro-animations** | Cart badge pulse, scroll-reveal stagger, button ripple |
| **Product badges** | `product.metadata.badges[]` — managed by Owner Panel, rendered by template |

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
# → Redis:        localhost:6379
```

`dev.sh` handles: Redis in Docker → symlinks `.env` → starts Medusa & Storefront in parallel.

### Manual Start (alternative)

```bash
docker compose up redis -d
cd apps/medusa && pnpm dev &
cd apps/storefront && pnpm dev &
```

### Build

```bash
# Build storefront only (Medusa not required to be running)
pnpm turbo build --filter=storefront

# All pages render as force-dynamic — no prerendering issues
# Build warnings about fallback config are expected when Supabase is offline
```

## Deployment (Dokploy on Contabo VPS)

```bash
git push main → Dokploy webhook → Docker Compose build → Health checks → Rolling update
```

Domains via Dokploy:
- `campifrut.com` → storefront:3000
- `api.campifrut.com` → medusa-server:9000

---

## Implementation Progress

> Updated 10 Feb 2026 after completing the 13-task SOTA Production Remediation Plan v5.

| Phase | Status | What |
|-------|--------|------|
| 1. Backend Foundation | ✅ | Schema, DB, Auth module, Storage module, Seed (idempotent) |
| 2. Storefront MVP | ✅ | Lib layer, SOTA design, products, cart, auth, WhatsApp checkout |
| 3. Payments & Orders | ✅ | Stripe (idempotent webhooks), account dashboard, order tracking |
| 4. Polish & Hardening | ✅ | CMS, analytics, error boundaries, toast system |
| 5. Production Deploy | ✅ | Docker, Dokploy, Redis, CI with tests, release gate |
| 6. i18n + Route Restructuring | ✅ | `[lang]/` routing, 5 dictionaries (340+ keys), i18n system, proxy |
| 7. Customer Panel Polish | ✅ | Dashboard, orders, addresses CRUD, avatar upload |
| 8A. Multi-Tenant Foundation | ✅ | Server-only `TENANT_ID`, service-role config fetch |
| 8B. Governance Enforcement | ✅ | Zod-validated SuperAdmin mutations + audit trail |
| 8C. Owner Panel | ✅ | `tenants` table created, all actions Zod-validated + tenant-scoped + plan-limited |
| 8D. SuperAdmin Panel | ✅ | Tenant CRUD, flag toggles, plan presets — **separated to own repo** |
| 9. Production Hardening (v5) | ✅ | 181 storefront + 14 admin tests, Redis rate limiter, atomic webhook dedup, RLS audit |

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

See [remediation plan v5](docs/plans/2026-02-10-sota-production-remediation-plan-v5.md) for full details.

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
| [Remediation Plan v4](docs/plans/2026-02-10-sota-production-remediation-plan-v4.md) | 12-task production hardening (completed) |
| [Remediation Plan v5](docs/plans/2026-02-10-sota-production-remediation-plan-v5.md) | 13-task production hardening (completed) |
| [Remediation Plan v6](docs/plans/2026-02-10-sota-production-remediation-plan-v6.md) | 11-task next-wave hardening (planned) |

