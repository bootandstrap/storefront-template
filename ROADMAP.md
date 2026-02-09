# Campifrut — Roadmap

> **Last updated**: 9 Feb 2026

---

## Progress Overview

```
Phase 1 ████████████████████ 100%  Backend Foundation
Phase 2 ████████████████████ 100%  Storefront MVP
Phase 3 ████████████████████ 100%  Payments & Orders
Phase 4 ████████████████████ 100%  Polish & Hardening
Phase 5 ████████████████████ 100%  Production Deploy
Phase 6 ███████████████░░░░░  75%  i18n + Route Restructuring
Phase 7 ███░░░░░░░░░░░░░░░░  15%  Panels + Multi-Currency
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

**Key deliverables**: 2 custom Medusa modules, 9 Supabase migrations, seed script with 13 Colombian fruit products.

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

- **Lib layer** (Step 6): Supabase clients (browser + server), Medusa typed API fetcher with retry, in-memory TTL config cache, feature flag helpers, plan limit checker, payment method registry, Next.js 16 proxy
- **Design system** (Step 7): SOTA CSS with dynamic theming, glassmorphism, micro-animations, Inter + Outfit fonts, dark mode tokens, skeleton components, toast system, error boundaries
- **Products & Cart** (Step 8): Product grid with filtering/search, product detail with JSON-LD, cart context with localStorage persistence, cart drawer slide-over, sitemap/robots
- **Auth** (Step 9): Flag-driven login (Google OAuth + email), registration gated by plan limits, OAuth callback handler
- **Checkout** (Step 10): WhatsApp message builder from Supabase templates, checkout modal with customer info + address + order summary, dynamic payment method selector

### Build verification findings (Feb 2026)

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| `cookies()` inside `unstable_cache()` | Next.js 16 prohibits dynamic functions in `unstable_cache` | In-memory TTL cache (5 min) |
| Medusa `ECONNREFUSED` during build | Prerendering without Medusa running | `export const dynamic = 'force-dynamic'` on all API pages |
| `revalidateTag` undefined | Next.js 16 removed the export | Switched to `revalidatePath('/', 'layout')` |
| TypeScript strict errors | Implicit `any`, unused vars/imports | Explicit types + cleanup |

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

### Phase 3 Build Notes
- All Server Actions in `'use server'` files must be `async` (Next.js 16 requirement)
- Stripe SDK version managed by npm package default (no hardcoded `apiVersion`)
- Internal sync helpers (`isStripeConfiguredSync`) kept private, async wrappers exported
- PLACEHOLDER-safe: Stripe features gracefully disabled when keys aren't real

---

## Phase 4: Polish & Hardening ✅

**Target**: Apr 2026

### Step 13: Performance & Accessibility

- Lighthouse audit ≥ 90 on all 4 categories
- `next/image` Supabase loader, WebP, lazy loading
- `next/font` preload for Inter + Outfit
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Step 14: CMS, Carousel & Analytics

- CMS page renderer from `cms_pages`
- Hero carousel from `carousel_slides`
- Event tracking → `analytics_events`

### Step 14b: Transactional Emails

- Supabase Edge Function for email via Resend
- HTML email templates (order confirmation, welcome, etc.)

### Step 14c: Admin Storefront Controls

- API route for on-demand ISR revalidation
- Admin controls for cache management

---

## Phase 5: Production Deploy ✅

**Target**: May 2026

### Step 15: Infrastructure

- Docker Compose production config
- Dokploy on Contabo VPS
- Domain setup + SSL certificates
- Redis production configuration

### Step 15b: Security & Resilience

- Rate limiting
- CSP headers
- Health endpoint
- Redis session management

### Step 15c: Pre-Launch Checklist

- [ ] All feature flags tested in isolation
- [ ] WhatsApp flow end-to-end
- [ ] Mobile responsiveness verified
- [ ] SEO meta tags + JSON-LD
- [ ] Lighthouse ≥ 90
- [ ] Security headers
- [ ] Error logging
- [ ] Backup strategy
- [ ] Monitoring alerts

---

## Phase 6: i18n + Route Restructuring 🔄

**Started**: Feb 2026

### Foundation (Complete) ✅

| Deliverable | Details | Status |
|-------------|---------|--------|
| Dictionary system | 5 JSON dictionaries (EN/ES/DE/FR/IT) with UI strings + route slugs | ✅ |
| `lib/i18n/index.ts` | `getDictionary()`, `createTranslator()`, slug helpers, locale validation | ✅ |
| `lib/i18n/locale.ts` | Resolution: URL → cookie → Accept-Language → config → 'en' | ✅ |
| `lib/i18n/currencies.ts` | `formatPrice()`, currency resolution, `setCurrencyCookie()` | ✅ |
| `lib/i18n/provider.tsx` | `I18nProvider` context: `t()`, `localizedHref()` for client components | ✅ |
| Route restructuring | All 14 pages moved under `app/[lang]/` | ✅ |
| Root layout | Minimal: fonts, CSS vars, `CartProvider`, `ToastProvider` | ✅ |
| `[lang]/layout.tsx` | I18nProvider + locale validation + redirect | ✅ |
| `(shop)/layout.tsx` | Header + Footer + CartDrawer + WhatsApp CTA | ✅ |
| `(panel)/layout.tsx` | Auth guard: owner/super_admin roles | ✅ |
| Root redirect | `/` → `/{preferred locale}/` | ✅ |
| `proxy.ts` | Slug rewriting + locale routing + role protection | ✅ |
| Build verification | 21 routes compile successfully | ✅ |

### Remaining

| Deliverable | Details | Status |
|-------------|---------|--------|
| Supabase migration | `enable_multi_currency`, `active_languages[]`, `active_currencies[]`, `default_currency`, `max_languages`, `max_currencies` | ✅ |
| Header `LanguageSelector` | Flag-driven dropdown: flag + code for active languages + `actions.ts` Server Action | ✅ |
| Header `CurrencySelector` | Flag-driven dropdown: flag + code for active currencies + cookie-based switching | ✅ |
| Wire 14 pages to `t()` | Replace all hardcoded strings with dictionary lookups | 🔜 |
| Localize `cuenta/layout.tsx` nav | `t()` labels + locale-aware `href` values | 🔜 |

### Phase 6 Build Notes
- Cart action imports broke after route move → updated to `@/app/[lang]/(shop)/cart/actions`
- `createServerClient` renamed to `createClient` in Supabase SSR
- `StoreConfig` not indexable for i18n slugs → cast to `Record<string, unknown>`

---

## Phase 7: Panels + Multi-Currency 🔜

**Target**: Feb–Mar 2026

### Medusa Client Extensions

| Deliverable | Details | Status |
|-------------|---------|--------|
| Order types + fetchers | `MedusaOrder`, `MedusaOrderItem`, `MedusaFulfillment`, `MedusaPayment`, `getCustomerOrders()`, `getOrder()` | ✅ |
| Address types + CRUD | `MedusaAddress`, `getCustomerAddresses()`, `createAddress()`, `updateAddress()`, `deleteAddress()` | ✅ |

### Customer Panel (`/[lang]/cuenta/*`)

| Deliverable | Details | Status |
|-------------|---------|--------|
| Dashboard | Real order stats, recent orders, quick links | 🔜 |
| Orders list | Paginated table with status badges | 🔜 |
| Order detail | Line items, progress bar, address, payment info | 🔜 |
| Profile | Avatar upload to Supabase Storage | 🔜 |
| Addresses | CRUD with default marking, glass card grid | 🔜 |

### Owner Panel (`/[lang]/panel/*`)

| Deliverable | Details | Status |
|-------------|---------|--------|
| Panel sidebar + layout | Glass nav, mobile hamburger, user info | 🔜 |
| Dashboard | Live stats from Medusa Admin API | 🔜 |
| Store config editor | Business name, hero, logo, footer, meta — content only | 🔜 |
| Carousel manager | CRUD `carousel_slides`, drag-to-reorder, plan limit | 🔜 |
| WhatsApp template editor | Edit templates with `{{variable}}` highlighting + preview | 🔜 |
| Product badge manager | Add/remove badges from `product.metadata.badges[]` | 🔜 |

### Admin Panel (`apps/admin-panel/`)

| Deliverable | Details | Status |
|-------------|---------|--------|
| Scaffold + auth | Standalone Next.js app, dark SaaS theme, super_admin guard | 🔜 |
| Feature flag toggles | Direct Supabase writes to `feature_flags` | 🔜 |
| Config editor | `active_languages`, `active_currencies`, `default_currency` + all config | 🔜 |
| Plan limits editor | All `plan_limits` columns incl `max_languages`, `max_currencies` | 🔜 |
| Theme control | Color preset picker + custom colors + live preview | 🔜 |

---

## Future Ideas (Post-Phase 7)

| Feature | Priority | Notes |
|---------|----------|-------|
| Product reviews | Low | Flag `enable_reviews` exists |
| Wishlist | Low | Flag `enable_wishlist` exists |
| Promotions / discount codes | Medium | Flag `enable_promotions` exists |
| Admin API for external integrations | Low | Flag `enable_admin_api` exists |
| Push notifications | Low | For order status updates |
| Inventory alerts | Medium | Low stock notifications |
| Multi-store support | High | White-label expansion for more clients |

---

## Metrics

| Phase | New Files | Modified | Migrations | Edge Functions | Status |
|-------|-----------|----------|------------|----------------|--------|
| 1 | — | — | 9 | 0 | ✅ |
| 2 | ~40 | ~5 | 0 | 0 | ✅ |
| 3 | 13 | 3 | 0 | 0 | ✅ |
| 4 | 10 | 5 | 1 | 1 | ✅ |
| 5 | 8 | 3 | 0 | 0 | ✅ |
| 6 | ~12 | ~18 | 1 | 0 | 🔄 |
| 7 | ~25 | ~10 | 0 | 0 | 🔜 |
| **Total** | **~108** | **~44** | **11** | **1** | |
