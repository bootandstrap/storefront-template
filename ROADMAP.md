# BootandStrap E-Commerce Template — Roadmap

> **Last updated**: 12 Feb 2026 (Production Remediation complete — RLS hardening, Error Inbox, release gate 7/7 PASS)
> **Repos**: [bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce) (template) · [bootandstrap-admin](https://github.com/bootandstrap/bootandstrap-admin) (superadmin)

---

## Progress Overview

```
Phase 1  ████████████████████ 100%  Backend Foundation
Phase 2  ████████████████████ 100%  Storefront MVP
Phase 3  ████████████████████ 100%  Payments & Orders
Phase 4  ████████████████████ 100%  Polish & Hardening
Phase 5  ████████████████████ 100%  Production Deploy
Phase 6  ████████████████████ 100%  i18n + Route Restructuring
Phase 7  ████████████████████ 100%  Customer Panel Polish
Phase 8  ████████████████████ 100%  SaaS Governance + Owner Panel Completion
Phase 9  ██████████████████░░  90%  Production Hardening & Multi-Client
```

> **Quality gate status (12 Feb 2026)**: release-gate.sh **7/7 PASSED** ✅ — tests ✅ (208 tests, 20 files storefront + 22 tests, 3 files admin), build ✅ (37+ routes). See `GEMINI.md` for full baseline.

**Repo separation completed**: SuperAdmin Panel now lives in its own repo (`bootandstrap-admin`). Template repo contains storefront + Medusa only.

**Phase 8F completed**: Owner Panel expanded with orders management, customer overview, image upload, and stability hardening (retry wrapper, loading skeleton, toast feedback).

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

## Phase 6: i18n + Route Restructuring ✅

**Completed**: 9 Feb 2026

### Foundation ✅

| Deliverable | Status |
|-------------|--------|
| Dictionary system — 5 JSON dictionaries (EN/ES/DE/FR/IT) with 485+ UI strings + route slugs | ✅ |
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

### Page & Component Wiring ✅

All 14 storefront pages + 16 components fully wired to `t()`. Build verification: 26 routes compile, 0 errors.

---

## Phase 7: Customer Panel Polish ✅

**Completed**: 9 Feb 2026

- Authenticated Medusa fetcher (`auth-medusa.ts`) — Supabase JWT → Bearer token
- Dashboard with real order stats, 3 recent orders, Suspense streaming
- Orders list with server-side pagination and status badges
- Order detail with real line items, visual status timeline, cost breakdown
- Addresses CRUD with glass card grid, modal, optimistic updates, server actions
- AvatarUpload to Supabase Storage `avatars` bucket
- ~30 new i18n keys per locale × 5 dictionaries

---

## Phase 8: SaaS Governance + Owner & SuperAdmin Panels ✅

**Completed**: 9 Feb 2026

This phase was restructured into 4 sub-phases:

### Phase 8A: Multi-Tenant Foundation ✅

| Deliverable | Status |
|-------------|--------|
| `tenants` table + backfill existing client as first tenant | ✅ |
| `tenant_id` column on `config`, `feature_flags`, `plan_limits`, `carousel_slides`, `whatsapp_templates`, `cms_pages`, `analytics_events`, `profiles` | ✅ |
| RLS policies for tenant isolation | ✅ |
| New config columns: `store_email`, `social_*`, `bank_*`, `announcement_bar_*`, `min_order_amount`, `business_hours` | ✅ |
| 8 new feature flags: `enable_maintenance_mode`, `enable_order_notes`, `enable_product_search`, etc. | ✅ |
| New plan limits: `max_whatsapp_templates`, `max_file_upload_mb` | ✅ |
| `getConfig()` filters by `TENANT_ID` env var | ✅ |

### Phase 8B: Governance Enforcement ✅

| Deliverable | Status |
|-------------|--------|
| `require_auth_to_order` enforcement in checkout | ✅ |
| `enable_guest_checkout` gate in checkout | ✅ |
| `max_orders_month` enforcement in checkout actions | ✅ |
| `max_customers` enforcement in registration | ✅ |
| `plan_expires_at` check + expiration banner | ✅ |
| `enable_maintenance_mode` full-page maintenance view | ✅ |
| Announcement bar in shop layout | ✅ |

### Phase 8C: Owner Panel ✅

| Deliverable | Details | Status |
|-------------|---------|--------|
| Panel infrastructure | Glass sidebar, stat cards, usage meters | ✅ |
| Dashboard | Stats + usage meters + recent orders via Medusa Admin API | ✅ |
| Store Config | Server action save + tabbed config form (identity, contact, payments, social, theme) | ✅ |
| Carousel Manager | Server action CRUD + reorder + plan limit enforcement + client component | ✅ |
| WhatsApp Templates | Server action CRUD + template editor + variable auto-extraction + default toggle | ✅ |
| Product Badges | Badge toggle per product via Medusa Admin API metadata | ✅ |
| CMS Editor | Server action CRUD + auto-slug + publish/unpublish + plan limits | ✅ |
| Analytics | Conversion funnel + event charts + top products | ✅ |

### Phase 8D: SuperAdmin Panel ✅ → **Separated to [bootandstrap-admin](https://github.com/bootandstrap/bootandstrap-admin)**

| Deliverable | Details | Status |
|-------------|---------|--------|
| Standalone Next.js 16 app | Dark theme, Tailwind v4, port 3100 | ✅ |
| Auth | Email/password + `super_admin` role gate | ✅ |
| Global Dashboard | 4 stat cards + recent tenants table | ✅ |
| Tenant List | TenantCard grid + status filter bar | ✅ |
| Tenant Detail | 3-tab editor (flags / limits / usage) + status control | ✅ |
| Create Tenant | Form with auto-slug + plan selector | ✅ |
| Feature Flag Visualization | 27 flags, 6 categories, dependency/conflict graph | ✅ |
| Plan presets | Starter / Pro / Enterprise defaults | ✅ |
| Dockerfile | Standalone multi-stage build | ✅ |

**Repo separation**: SuperAdmin moved from `apps/superadmin/` into its own repo (`bootandstrap-admin`). Governance types inlined locally. Zero workspace dependencies.

### Phase 8E: Remediation & Server-Side Enforcement ✅

| Deliverable | Details | Status |
|-------------|---------|--------|
| Server-side `max_orders_month` | Enforced in checkout actions (init payment, bank transfer, COD) | ✅ |
| Server-side `max_customers` | Enforced in registration server action | ✅ |
| Owner Panel Store Config | Server action replaces broken fetch call | ✅ |
| Owner Panel Carousel CRUD | Create/edit/delete slides + plan limits | ✅ |
| Owner Panel Messages CRUD | Create/edit/delete WhatsApp templates + default toggle | ✅ |
| Owner Panel CMS Pages CRUD | Create/edit/delete pages + auto-slug + publish toggle | ✅ |
| WhatsApp template engine | `renderTemplate()` with `{{var}}` + `{{#each}}` syntax | ✅ |
| WhatsApp checkout integration | Fetches default template from DB, fallback to hardcoded | ✅ |
| Environment vars fix | `STRIPE_API_KEY` → `STRIPE_SECRET_KEY`, added missing vars | ✅ |
| Schema docs rewrite | `SUPABASE_SCHEMA.md` updated for multi-tenant architecture | ✅ |
| Duplicate repo cleanup | Removed duplicate `bootandstrap-admin` from CLIENTES dir | ✅ |

### Phase 8F: Owner Panel Completion ✅

**Completed**: 11 Feb 2026

| Deliverable | Details | Status |
|-------------|---------|--------|
| **Phase 0: UX Redesign** | WhatsApp template UX (live preview, variable bar, presets), old route redirects (productos/categorias/insignias → catalogo), `revalidatePanel()` helper | ✅ |
| **Phase 1: Orders management** | `getAdminOrders`, `getAdminOrderDetail`, `createOrderFulfillment`, `cancelAdminOrder` in `admin.ts`. Orders page with inline detail, fulfill/cancel server actions | ✅ |
| **Phase 2: Customer overview** | `getAdminCustomers`, `getCustomerCount` in `admin.ts`. Read-only customer list (name, email, order count) | ✅ |
| **Phase 3: Image upload** | `uploadFiles`, `updateProductImages`, `deleteProductImage` in `admin.ts`. Image dropzone with 5MB limit, JPEG/PNG/WebP/GIF validation | ✅ |
| **Phase 4: Stability hardening** | `retry.ts` (exponential backoff + jitter), `loading.tsx` (panel skeleton), toast feedback on all 9 panel clients (~30 mutation handlers) | ✅ |
| **Medusa Admin API auth** | Full rewrite of `admin.ts`: JWT via `/auth/user/emailpass`, 23h cache, auto-retry on 401 | ✅ |
| **Panel sidebar** | 5 fixed items (Dashboard, Catálogo, Pedidos, Clientes, Mi Tienda) + 4 flag-gated (Carousel, WhatsApp, CMS, Analytics) | ✅ |
| **i18n** | All 5 dictionaries updated: `panel.orders.*` (23 keys) + `panel.customers.*` (8 keys) — total 485+ keys per locale | ✅ |
| **Documentation coherence** | All 3 GEMINI.md + DOCS_GUIDE + API_REFERENCE updated to reflect actual state | ✅ |

---

## Phase 9: Production Hardening & Multi-Client

### 9A: Production Remediation ✅

**Completed**: 12 Feb 2026

| Deliverable | Details | Status |
|-------------|---------|--------|
| **RLS hardening** | Tenant-scoped policies replacing `USING (true)` on all governance tables | ✅ |
| **Webhook hardening** | Stripe webhook: status tracking (claimed/processed_ok/processed_failed), proper HTTP codes, retry tests | ✅ |
| **Registration hardening** | `max_customers` fail-closed enforcement with admin client + tenant-scoped count | ✅ |
| **Credential cleanup** | Removed `'supersecret'` fallback, mandatory env validation, CREDENTIALS.md | ✅ |
| **Error Inbox** | Global error dashboard + per-tenant tab in SuperAdmin. `tenant_errors` table + `logTenantError()` | ✅ |
| **Release gate** | `release-gate.sh` 7/7 PASSED (RLS, audit, lint, tests, type-check, build) | ✅ |
| **RLS assessment** | Supabase security advisors audit — 80+ Medusa tables no RLS (expected), governance tables secured | ✅ |

### 9B: Testing & Quality 🔜

**Target**: Mar 2026

| Deliverable | Details | Status |
|-------------|---------|--------|
| E2E tests | Playwright — checkout flow, auth, cart, i18n switching | 🔜 |
| Component tests | Vitest — ProductCard, CartDrawer, PaymentMethodSelector | 🔜 |
| CI pipeline | E2E + unit tests on PR, build verification | 🔜 |
| Lighthouse CI | Automated performance regression testing | 🔜 |

### 9C: Multi-Client Operations 🔜

| Deliverable | Details | Status |
|-------------|---------|--------|
| Client provisioning script | Automate: create Supabase tenant → run migrations → seed → set config | 🔜 |
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

## Future Ideas (Post-Phase 9)

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
| 6 | ~12 | ~30 | 1 | 0 | ✅ |
| 7 | 13 | 8 | 0 | 0 | ✅ |
| 8 | ~50 | ~20 | 3 | 0 | ✅ |
| 8E | ~10 | ~8 | 0 | 0 | ✅ |
| 8F | ~15 | ~12 | 0 | 0 | ✅ |
| **Total** | **~171** | **~94** | **14** | **1** | |

