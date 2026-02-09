# BootandStrap E-Commerce Template — Roadmap

> **Last updated**: 9 Feb 2026
> **Repo**: [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce) (private)

---

## Progress Overview

```
Phase 1  ████████████████████ 100%  Backend Foundation
Phase 2  ████████████████████ 100%  Storefront MVP
Phase 3  ████████████████████ 100%  Payments & Orders
Phase 4  ████████████████████ 100%  Polish & Hardening
Phase 5  ████████████████████ 100%  Production Deploy
Phase 6  ██████████████████░░  90%  i18n + Route Restructuring
Phase 7  ░░░░░░░░░░░░░░░░░░░░   0%  Customer Panel Polish
Phase 8  ░░░░░░░░░░░░░░░░░░░░   0%  Owner Panel
Phase 9  ░░░░░░░░░░░░░░░░░░░░   0%  Admin Panel (SaaS)
Phase 10 ░░░░░░░░░░░░░░░░░░░░   0%  Production Hardening & Multi-Client
```

---

## Phase 1: Backend Foundation ✅

**Completed**: Jan 2026

| Step | Deliverable | Status |
|------|-------------|--------|
| 1 | Supabase Schema (config, feature_flags, plan_limits, cms_pages, profiles, carousel_slides, analytics_events) | ✅ |
| 2 | Medusa ↔ Supabase DB connection verified | ✅ |
| 3 | Supabase Auth Provider (Medusa custom module) | ✅ |
| 4 | Supabase Storage Provider (Medusa custom module) | ✅ |
| 5 | Campifrut Seed Script (13 products, 5 categories) | ✅ |
| 1b | Feature flags migration (4 new columns) + `whatsapp_templates` table | ✅ |

**Key deliverables**: 2 custom Medusa modules, 9 Supabase migrations, seed script with 13 products.

---

## Phase 2: Storefront MVP ✅

**Completed**: 8 Feb 2026

| Step | Deliverable | Status |
|------|-------------|--------|
| 6 | Lib Layer + Caching Strategy | ✅ |
| 7 | SOTA Design System & Layout | ✅ |
| 8 | Product & Cart Pages | ✅ |
| 9 | Auth Pages (Login, Register, OAuth) | ✅ |
| 10 | WhatsApp Checkout & Order Flow | ✅ |

### What was built

- **Lib layer**: Supabase clients (browser + server), Medusa typed API fetcher with retry, in-memory TTL config cache, feature flag helpers, plan limit checker, payment method registry, Next.js 16 proxy
- **Design system**: SOTA CSS with dynamic theming, glassmorphism, micro-animations, Inter + Outfit fonts, dark mode tokens, skeleton components, toast system, error boundaries
- **Products & Cart**: Product grid with filtering/search, product detail with JSON-LD, cart context with localStorage persistence, cart drawer slide-over, sitemap/robots
- **Auth**: Flag-driven login (Google OAuth + email), registration gated by plan limits, OAuth callback handler
- **Checkout**: WhatsApp message builder from Supabase templates, checkout modal with customer info + address + order summary, dynamic payment method selector

---

## Phase 3: Payments & Orders ✅

**Completed**: 9 Feb 2026

### Step 11: Stripe Payment Integration ✅

| Deliverable | Details | Status |
|-------------|---------|--------|
| Stripe provider in Medusa | `medusa-config.ts` with PLACEHOLDER detection | ✅ |
| `StripeCheckoutFlow.tsx` | Stripe Elements, card input, 3D Secure, Appearance API | ✅ |
| Payment Server Actions | 6 actions: init session, client secret, complete cart, bank transfer, COD, payment status | ✅ |
| Webhook handler | `payment_intent.succeeded/failed`, `charge.refunded`, signature validation | ✅ |
| `BankTransferFlow.tsx` | Bank details display + clipboard buttons + confirmation | ✅ |
| `WhatsAppCheckoutFlow.tsx` | Extracted from original modal into standalone component | ✅ |
| `CashOnDeliveryFlow.tsx` | Address recap + delivery notes + confirmation | ✅ |
| Multi-step `CheckoutModal` | 5-step flow (info → address → method → payment → confirmation) | ✅ |

### Step 12: Account & Orders Dashboard ✅

| Deliverable | Details | Status |
|-------------|---------|--------|
| `/cuenta` layout | Glassmorphism sidebar nav, user avatar, auth guard, logout | ✅ |
| Dashboard overview | Welcome card, order stats, quick actions | ✅ |
| Order history | Status badges, order cards, empty state | ✅ |
| Order detail | Vertical timeline, product list, payment info, shipping, reorder | ✅ |
| Profile edit | Name, phone editing, avatar, Server Action form | ✅ |
| Guest order lookup | `/pedido` public page, email + order number form | ✅ |

---

## Phase 4: Polish & Hardening ✅

**Completed**: 9 Feb 2026

- Lighthouse audit ≥ 90 on all 4 categories
- `next/image` Supabase loader, WebP, lazy loading
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- CMS page renderer from `cms_pages`
- Hero carousel from `carousel_slides`
- Event tracking → `analytics_events`
- Supabase Edge Function for transactional emails via Resend
- On-demand ISR revalidation API route

---

## Phase 5: Production Deploy ✅

**Completed**: 9 Feb 2026

- Docker Compose production config (storefront + medusa-server + medusa-worker + redis)
- Dokploy on Contabo VPS
- SSL certificates (Let's Encrypt)
- Rate limiting, CSP headers, health endpoint
- GitHub repository: [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce)
- CI: GitHub Actions (build + type-check on PRs to `main`)

---

## Phase 6: i18n + Route Restructuring 🔄 (90%)

**Started**: Feb 2026

### Foundation ✅

| Deliverable | Status |
|-------------|--------|
| Dictionary system — 5 JSON dictionaries (EN/ES/DE/FR/IT) with 240+ UI strings + route slugs | ✅ |
| `lib/i18n/index.ts` — `getDictionary()`, `createTranslator()`, slug helpers, locale validation | ✅ |
| `lib/i18n/locale.ts` — Resolution: URL → cookie → Accept-Language → config → `'en'` | ✅ |
| `lib/i18n/currencies.ts` — `formatPrice()`, currency resolution, `setCurrencyCookie()` | ✅ |
| `lib/i18n/provider.tsx` — `I18nProvider` context: `t()`, `localizedHref()` for client components | ✅ |
| Route restructuring — All pages moved under `app/[lang]/` | ✅ |
| Root redirect — `/` → `/{preferred locale}/` | ✅ |
| `proxy.ts` — Slug rewriting + locale routing + role protection | ✅ |
| Supabase migration — `active_languages[]`, `active_currencies[]`, `default_currency`, `max_languages`, `max_currencies` | ✅ |
| Header `LanguageSelector` — Flag-driven dropdown | ✅ |
| Header `CurrencySelector` — Flag-driven dropdown | ✅ |

### Page Wiring ✅

All 14 storefront pages + 8 components fully wired to `t()`:

| Component/Page | Type | Status |
|---------------|------|--------|
| Homepage | Server | ✅ |
| HeroSection, TrustSection, CategoryGrid, FeaturedProducts | Server | ✅ |
| Product List (`productos/`) | Server | ✅ |
| Product Detail (`productos/[handle]`) | Server | ✅ |
| Login, Register | Server | ✅ |
| Account Layout, Dashboard, Orders, Order Detail, Profile | Server | ✅ |
| Checkout (metadata) | Server | ✅ |
| CMS Pages (metadata) | Server | ✅ |
| Footer | Server | ✅ |
| ProductGrid, ProductCard, AddToCartButton | Client (`useI18n`) | ✅ |
| Cart Page (`carrito/`) | Client (`useI18n`) | ✅ |
| Guest Order Lookup (`pedido/`) | Client (`useI18n`) | ✅ |
| CheckoutPageClient | Client (`useI18n`) | ✅ |
| Build verification — 21 routes compile | ✅ | ✅ |

### Remaining (~10%)

| Deliverable | Status |
|-------------|--------|
| Owner Panel pages — audit for hardcoded strings | 🔜 |
| CartDrawer, CartItem — verify `t()` coverage | 🔜 |
| CheckoutModal subcomponents — verify `t()` coverage | 🔜 |

---

## Phase 7: Customer Panel Polish 🔜

**Target**: Feb–Mar 2026

Upgrade the existing customer panel (`/[lang]/cuenta/*`) to use **real Medusa API data** instead of placeholder UI.

### Medusa Client Extensions ✅ (Pre-completed)

| Deliverable | Status |
|-------------|--------|
| Order types + fetchers (`getCustomerOrders()`, `getOrder()`) | ✅ |
| Address types + CRUD (`getCustomerAddresses()`, `createAddress()`, `updateAddress()`, `deleteAddress()`) | ✅ |

### Customer Panel Pages

| Deliverable | Details | Status |
|-------------|---------|--------|
| Dashboard | Real order stats from Medusa, recent orders list, quick action links | 🔜 |
| Orders list | Paginated table with status badges, date/price formatting via i18n | 🔜 |
| Order detail | Real line items, timeline from Medusa fulfillments, address, payment info | 🔜 |
| Profile | Avatar upload to Supabase Storage, phone verification | 🔜 |
| Addresses | CRUD cards with default marking, glass card grid, address autocomplete | 🔜 |
| Reorder flow | Quick re-add items from past order to cart | 🔜 |

---

## Phase 8: Owner Panel 🔜

**Target**: Mar 2026

Build the **client-facing management dashboard** at `/[lang]/panel/*`. The owner should never need to touch code, Supabase, or Medusa Admin directly.

### Panel Infrastructure

| Deliverable | Details | Status |
|-------------|---------|--------|
| Panel layout | Glass sidebar nav, mobile hamburger, user info, breadcrumbs | 🔜 |
| Dashboard | Live stats from Medusa Admin API (orders today, revenue, top products) | 🔜 |
| Auth guard | Role-based: `owner` or `super_admin` only | ✅ (in proxy.ts) |

### Store Management

| Deliverable | Details | Status |
|-------------|---------|--------|
| Store config editor | Business name, hero content, logo, footer, meta — writes to `config` table | 🔜 |
| Carousel manager | CRUD `carousel_slides`, drag-to-reorder, plan limit enforcement | 🔜 |
| WhatsApp template editor | Edit templates with `{{variable}}` highlighting + live preview | 🔜 |
| Product badge manager | Add/remove badges from `product.metadata.badges[]` via Medusa Admin API | 🔜 |
| CMS page editor | Rich text/markdown editor for `cms_pages`, publish/unpublish toggle | 🔜 |

### Communication & Analytics

| Deliverable | Details | Status |
|-------------|---------|--------|
| Order notifications | View recent orders, WhatsApp quick-reply links | 🔜 |
| Analytics dashboard | Charts from `analytics_events` — page views, conversion funnel, top products | 🔜 |

---

## Phase 9: Admin Panel (SaaS) 🔜

**Target**: Apr 2026

The **BootandStrap internal panel** — the SaaS control plane that governs all client instances. This is a separate application with dark theme, accessible only to `super_admin` users.

### Infrastructure

| Deliverable | Details | Status |
|-------------|---------|--------|
| Standalone Next.js app | `apps/admin-panel/`, dark SaaS theme, `super_admin` guard | 🔜 |
| Multi-client selector | Dropdown to switch between client Supabase projects | 🔜 |
| Auth | Supabase Auth with `super_admin` role check | 🔜 |

### Governance Controls

| Deliverable | Details | Status |
|-------------|---------|--------|
| Feature flag toggles | Toggle any flag for any client — direct Supabase writes | 🔜 |
| Plan limits editor | Edit all `plan_limits` columns per client | 🔜 |
| Config editor | Edit `active_languages[]`, `active_currencies[]`, `default_currency`, all config columns | 🔜 |
| Theme control | Color preset picker + custom colors + live preview | 🔜 |
| Plan management | Create/edit/assign SaaS plans (starter/growth/pro) | 🔜 |

### Monitoring

| Deliverable | Details | Status |
|-------------|---------|--------|
| Client health dashboard | Service status, uptime, error rates per client | 🔜 |
| Usage metrics | Products, customers, orders vs plan limits | 🔜 |
| Billing/revenue | Stripe subscription status per client | 🔜 |

---

## Phase 10: Production Hardening & Multi-Client 🔜

**Target**: May 2026

Prepare the template for **reliable multi-client production deployment**.

### Testing & Quality

| Deliverable | Details | Status |
|-------------|---------|--------|
| E2E tests | Playwright — checkout flow, auth, cart, i18n switching | 🔜 |
| Component tests | Vitest — ProductCard, CartDrawer, PaymentMethodSelector | 🔜 |
| CI pipeline | E2E + unit tests on PR, build verification | 🔜 |
| Lighthouse CI | Automated performance regression testing | 🔜 |

### Multi-Client Operations

| Deliverable | Details | Status |
|-------------|---------|--------|
| Client provisioning script | Automate: create Supabase project → run migrations → seed → set config | 🔜 |
| `.env` template generator | CLI tool that generates client-specific `.env` from questionnaire | 🔜 |
| Docker stack per client | Separate compose file + Dokploy project per client on same VPS | 🔜 |
| Backup strategy | Automated Supabase DB backups, Docker volume snapshots | 🔜 |
| Monitoring & alerts | Uptime checks, error rate alerts, storage usage warnings | 🔜 |

### Documentation

| Deliverable | Details | Status |
|-------------|---------|--------|
| Template usage guide | Step-by-step: clone → configure → deploy for new client | ✅ |
| Client handoff checklist | What to deliver + train owner on | 🔜 |
| API documentation | OpenAPI spec for Medusa custom routes | 🔜 |

---

## Future Ideas (Post-Phase 10)

| Feature | Priority | Notes |
|---------|----------|-------|
| Product reviews | Medium | Flag `enable_reviews` exists, needs UI + Medusa module |
| Wishlist | Low | Flag `enable_wishlist` exists, needs UI + localStorage/DB |
| Promotions / discount codes | High | Flag `enable_promotions` exists, Medusa has native support |
| Push notifications | Low | Order status updates via web push |
| Inventory alerts | Medium | Low stock notifications for owner |
| AI product recommendations | Low | "Customers also bought" based on order history |
| Multi-store support | High | Single admin managing multiple storefronts |
| Marketplace mode | Low | Multiple vendors per storefront |
| Subscription products | Medium | Recurring orders (e.g., weekly fruit box) |
| Loyalty program | Low | Points system per purchase |

---

## Phase Metrics

| Phase | New Files | Modified | Migrations | Edge Functions | Status |
|-------|-----------|----------|------------|----------------|--------|
| 1 | — | — | 9 | 0 | ✅ |
| 2 | ~40 | ~5 | 0 | 0 | ✅ |
| 3 | 13 | 3 | 0 | 0 | ✅ |
| 4 | 10 | 5 | 1 | 1 | ✅ |
| 5 | 8 | 3 | 0 | 0 | ✅ |
| 6 | ~12 | ~30 | 1 | 0 | 🔄 90% |
| 7 | ~8 | ~6 | 0 | 0 | 🔜 |
| 8 | ~15 | ~5 | 0 | 0 | 🔜 |
| 9 | ~20 | ~3 | 0 | 0 | 🔜 |
| 10 | ~10 | ~5 | 0 | 0 | 🔜 |
| **Total** | **~136** | **~65** | **11** | **1** | |
