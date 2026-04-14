# Changelog

All notable changes to the BootandStrap Storefront template are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] — 2026-04-13

### Added

#### Email Design System (Sprint 9)
- 3-tier email layout system: `MinimalLayout` (free), `BrandLayout` (basic, 15 CHF/mo), `ModernLayout` (pro, 30 CHF/mo)
- Shared `LayoutProps` interface in `src/emails/layouts/types.ts` ensuring layout interchangeability
- `ModernLayout.tsx` — premium dark-mode design with gradient hero banner, glow card, brand pill footer, "Powered by BootandStrap" badge
- Dynamic layout injection: `email.ts` reads `email_preferences.template_design` from DB → resolves layout component at render time
- `loadEmailLayout(slug)` in email-template-registry with lazy loading and MinimalLayout fallback
- Brand prop injection pipeline: `logoUrl`, `brandColor` auto-extracted from tenant `config` table
- `EMAIL_DESIGNS[]` registry with `requiredTier` gating and `price_label` for upsell UI
- Static preview generator (`src/emails/preview-all.tsx`): renders 12 templates × 3 layouts = 36 HTML files + index dashboard
- All 12 email templates refactored to accept `Layout?: LayoutComponent` prop (defaults to MinimalLayout for standalone preview)
- Enhanced template content: realistic preview defaults, brandColor-aware CTAs, visual elements (star ratings, timer boxes, info callouts)
- Inter web font integration across all layouts via `@react-email/components` Font component

### Changed
- All 12 email templates now use consistent typography system: 26px headings, 15px body, -0.3px letter spacing
- `MinimalLayout` redesigned: Apple/Notion-inspired with uppercase header, multi-layer card shadow, structured footer
- `BrandLayout` redesigned: Stripe/Linear-inspired with 135° gradient header, 3px accent stripe, branded footer with decorative dot
- `email-template-registry.ts` overhauled: added layout loaders, design metadata, tier pricing

## [1.0.0] — 2026-04-12

### Added

#### Security (Sprint 1)
- Rate limiting on 13 API route handlers via `withRateLimit()` guard
- 6 pre-configured rate limit guards: `API_GUARD` (60/min), `PANEL_GUARD` (120/min), `CHECKOUT_GUARD` (10/min), `AUTH_GUARD` (20/min), `UPLOAD_GUARD` (30/min), `WEBHOOK_GUARD` (120/min)
- Redis-backed distributed rate limiter with automatic in-memory fallback (`rate-limit-factory.ts`)
- Per-tenant traffic capacity rate limiting (`rate-limit-tenant.ts`) — 2-layer model (anti-abuse + commercial)
- Security headers verified: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, X-DNS-Prefetch-Control

#### UX Resilience (Sprint 2)
- `PanelLoadingSkeleton` component with 3 variants (table, cards, form)
- `PanelErrorBoundary` component with retry, back-to-panel, and dev error display
- 34 `loading.tsx` files covering 100% of panel pages (variant-matched)
- 33 `error.tsx` files covering all panel pages (re-export PanelErrorBoundary)

#### SEO & Performance (Sprint 3)
- `generateMetadata` for 12 shop pages (cuenta, pedidos, perfil, direcciones, buscar-pedido, favoritos, mi-proyecto, pedido, checkout/confirmation, comparar, productos, carrito)
- Web Vitals tracking (CLS, FCP, LCP, TTFB, INP) via `web-vitals.ts`
- `WebVitalsReporter` client component — side-effect, dynamic import, gated by `enable_analytics` flag
- `navigator.sendBeacon()` for reliable metric delivery without blocking navigation

#### Observability (Sprint 4)
- Email alerts via Resend in BSWEB `alerts.ts` — severity-coded HTML templates (previously stub)
- Structured logging integration with Sentry + Web Vitals pipeline

#### Limit Enforcement (Sprint 5)
- Capability override seeding (`useCapabilityOverrides.ts` reads from `capability_overrides` table on mount)
- Verified: `max_file_upload_mb`, `max_images_per_product`, `storage_limit_mb` already enforced in `productos/actions.ts`

#### Testing (Sprint 6)
- Playwright E2E panel smoke tests (`panel-smoke.spec.ts`) — 5 critical-path tests (dashboard, catalog, settings, ventas, clientes)
- Playwright configuration with CI/local mode differentiation

#### Progressive Enhancements (Sprint 7)
- PWA manifest (`public/manifest.json`) — tenant-customizable name, theme, icons
- `KeyboardShortcutsGuide` component — triggered by `?` key, displays 8 shortcuts
- Dynamically imported in panel layout (zero bundle impact when unused)

#### Documentation (Sprint 8)
- Root `GEMINI.md` — 3 new sections: Security Hardening, UX Resilience, Observability
- Ecommerce `GEMINI.md` — Zone Map updates, PWA guide, Loading/Error reference
- `README.md` overhaul — security architecture, state map, testing matrix, observability guide
- `PWA_MANIFEST.md` — companion doc for `manifest.json` customization
- `CHANGELOG.md` — this file
- Enhanced JSDoc across security lib, panel components, and API routes
- Inline documentation in `next.config.ts` (security header explanations) and `playwright.config.ts` (testing strategy)

### Changed
- `next.config.ts` — Added detailed comments explaining each security header and cache-control strategy
- `playwright.config.ts` — Expanded header documentation with testing strategy, auth prereqs, CI vs local

### Security
- Content Security Policy via dynamic nonce in `proxy.ts` (per-request)
- HTML sanitization (`sanitize-html.ts`) — allowlist-based, strips dangerous tags/attributes/protocols
- Timing-safe secret comparison (`timing-safe.ts`) — constant-time via `crypto.timingSafeEqual`
- Trusted proxy IP extraction (`get-client-ip.ts`) — LAST X-Forwarded-For value model
- SSRF prevention in `products/[id]` — validates Medusa ID format before proxying
