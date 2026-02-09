# Campifrut — Production Task Checklist

> Updated 8 Feb 2026.

## Phase 1: Backend Foundation ✅
- [x] Step 1: Supabase Schema
- [x] Step 2: Verify Medusa ↔ Supabase DB
- [x] Step 3: Supabase Auth Provider
- [x] Step 4: Supabase Storage Provider
- [x] Step 5: Campifrut Seed Script

## Documentation ✅
- [x] GEMINI.md + refactor 10 docs

## Phase 2: Storefront MVP ✅ (40 new + 5 modified)
- [x] Step 1b: Supabase migrations (4 feature flag columns + whatsapp_templates)
- [x] Step 6: Lib Layer + Caching Strategy
  - [x] Install deps: @supabase/supabase-js, @supabase/ssr, lucide-react
  - [x] next.config.ts (standalone, image remotePatterns, ISR)
  - [x] Supabase clients (browser + server)
  - [x] Medusa client (typed fetcher + retry logic)
  - [x] Config + features + limits helpers (in-memory TTL cache)
  - [x] Payment method registry
  - [x] proxy.ts (route protection)
- [x] Step 7: SOTA Design System & Layout
  - [x] globals.css (dynamic theming, glassmorphism, animations)
  - [x] layout.tsx (config-driven CSS vars, Suspense streaming)
  - [x] Header (glassmorphism, cart badge pulse, mobile drawer)
  - [x] Footer (config-driven content)
  - [x] Homepage (Suspense-streamed sections)
  - [x] Toast system
  - [x] Skeleton primitives
  - [x] Error boundaries + error.tsx + not-found.tsx
  - [x] Route loading.tsx files
- [x] Step 8: Product & Cart Pages
  - [x] ProductGrid (filtering, search, URL state)
  - [x] ProductCard + AddToCartButton
  - [x] Product detail (JSON-LD, OG, variants, delivery info)
  - [x] Cart page + CartDrawer slide-over
  - [x] CartContext + Server Actions
  - [x] sitemap.ts + robots.ts
  - [x] JSON-LD builder
- [x] Step 9: Auth Pages
  - [x] Login (flag-driven providers)
  - [x] Register (gated by flags + plan limits)
  - [x] OAuth callback handler
- [x] Step 10: WhatsApp Checkout & Order Flow
  - [x] Template engine + message builder
  - [x] CheckoutModal (address, summary, WhatsApp CTA)
  - [x] PaymentMethodSelector (smart N-method UI)
- [x] Build verification — zero TypeScript errors, clean build

### Phase 2 Build Notes
- Removed `unstable_cache` (conflicts with `cookies()` in Next.js 16) → in-memory TTL
- All API-dependent pages use `force-dynamic` (no build-time prerendering)
- Replaced `revalidateTag` with `revalidatePath` (Next.js 16 compat)

## Phase 3: Payments & Orders ✅ (13 new + 3 modified)
- [x] Step 11: Stripe Payment Integration
  - [x] Stripe provider in Medusa config (PLACEHOLDER-safe)
  - [x] StripeCheckoutFlow (Stripe Elements, 3D Secure, Appearance API)
  - [x] BankTransferFlow (bank details + clipboard)
  - [x] WhatsAppCheckoutFlow (extracted from modal)
  - [x] CashOnDeliveryFlow (address recap + notes)
  - [x] Multi-step CheckoutModal (5-step: info → address → method → payment → confirm)
  - [x] Payment Server Actions (6 actions: init, client secret, complete, bank, COD, status)
  - [x] Stripe webhook handler (signature validation, order completion)
- [x] Step 12: Account & Orders
  - [x] Account layout (glassmorphism sidebar, auth guard, logout)
  - [x] Dashboard overview (welcome, stats, quick actions)
  - [x] Order history (status badges, cards, empty state)
  - [x] Order detail (timeline, items, payment info, reorder)
  - [x] Profile edit (name, phone, avatar, Server Action)
  - [x] Guest order lookup (/pedido, email + order number)
- [x] Build verification — zero TypeScript errors, clean build

### Phase 3 Build Notes
- Server Actions in `'use server'` files must be `async` (Next.js 16)
- Stripe SDK version uses package default (no hardcoded `apiVersion`)
- PLACEHOLDER-safe: Stripe features disabled when keys aren't configured

## Phase 4: Polish & Hardening ✅ (10 new + 1 Edge Function + 1 migration)
- [x] Step 13: Lighthouse ≥90, accessibility, Core Web Vitals
  - [x] Supabase image loader + WebP optimization
  - [x] HeroSection → next/image with priority
  - [x] Header logo → next/image
  - [x] Focus-visible + skip-to-content accessibility
- [x] Step 14: CMS pages, hero carousel, analytics tracking
  - [x] HeroCarousel (auto-slide, fade, ARIA, keyboard nav)
  - [x] CMSPageRenderer + /paginas/[slug] route
  - [x] Analytics tracker (page_view events)
  - [x] Seeded 3 CMS pages + 3 carousel slides
- [x] Step 14b: Transactional emails (Resend + Edge Function)
  - [x] send-email Edge Function (3 HTML templates)
  - [x] Stripe webhook email triggers
- [x] Step 14c: Admin revalidation controls
  - [x] /api/revalidate route with secret auth

## Phase 5: Production Deploy ✅ (8 new + 3 modified)
- [x] Step 15: Docker infrastructure
  - [x] Storefront Dockerfile (multi-stage standalone)
  - [x] Medusa Dockerfile (multi-stage)
  - [x] docker-compose.dev.yml (hot-reload dev)
  - [x] docker-compose.yml refined (networks, limits, logging)
  - [x] .dockerignore files for both apps
- [x] Step 15b: Security & resilience
  - [x] /api/health endpoint
  - [x] Security headers (CSP, HSTS, X-Frame, etc.)
  - [x] Rate limiting in proxy.ts (60 API / 200 page per min)
  - [x] /paginas/ added to public prefixes

## Local Dev Verification ✅ (9 Feb 2026)
- [x] DB connection fix: corrected Supabase pooler hostname (`aws-0` → `aws-1`)
- [x] Schema fix: removed `databaseSchema: "medusa"` — all tables in `public`
- [x] API key fix: added `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` to `.env`
- [x] `dev.sh` verified: Redis + Medusa + Storefront all start cleanly
- [x] Medusa server ready on port 9000 (all modules loaded)
- [x] Storefront loads on port 3000 without errors
- [x] Seed products — `npx medusa exec ./src/scripts/seed.ts` ✅ (idempotent, 13 products, 5 categories)
- [ ] Test full storefront with products visible
