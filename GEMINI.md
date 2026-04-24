# GEMINI — Tenant Storefront Guide

> AI agent guide for operating and customizing tenant storefronts.
> Last updated: 2026-04-17 (post-logger migration + integration audit).

### Agent Rules
- **NO QUICK FIXES**: Never use graceful fallbacks, try/catch band-aids, or silent failures as a substitute for proper integration. Every feature must be intentionally developed, fully wired, and production-complete. If a table is needed, create the migration. If a module is needed, register it. No half-measures.
- **Premium quality only**: Every piece of code must be SOTA, intentionally integrated, and fully functional. No MVPs, no placeholders, no "we'll fix it later".
- **Programmatic debugging first**: use `tsc`, `vitest`, `curl`, terminal, grep. Write test scripts if needed.
- **Chrome DevTools MCP second**: only if the issue is runtime/browser-only.
- **Browser agent LAST RESORT ONLY**: never use browser subagent unless absolutely required.
- After major CSS/import changes: `./stop.sh && rm -rf apps/storefront/.next apps/storefront/node_modules/.cache && ./dev.sh`

## 0. Local Dev

Full guide: [`docs/guides/DEVELOPMENT.md`](docs/guides/DEVELOPMENT.md).

```bash
pnpm install
npx tsx scripts/seed-demo.ts        # Seed demo data
./dev.sh                             # ALWAYS use this, never pnpm dev directly
```

**Critical**: `GOVERNANCE_SUPABASE_ANON_KEY` must be set (governance project, NOT tenant). Without it → maintenance mode.

## 1. What This Repo Is

Tenant storefront from BootandStrap template. Connects to Medusa v2 (commerce), Supabase (auth/config/governance), BootandStrap SaaS (feature flags).

**Your job**: customize look, feel, content, branding.
**Not your job**: commerce engine, auth, governance, API layer.

## 2. Zone Map

### 🟢 CUSTOMIZE — Safe to modify

| Path | Controls |
|------|----------|
| `globals.css` | Design tokens (Tailwind v4 `@theme inline`, flat hex). After changes: `rm -rf .next` → restart |
| `components/home/` | Homepage sections (Hero, CategoryGrid, FeaturedProducts, TrustSection) |
| `components/layout/Header.tsx` / `Footer.tsx` | Navigation, logo, links |
| `lib/i18n/dictionaries/*.json` | All text (5 locales: en, es, de, fr, it). Keep in sync |
| `public/` | Logo, favicon, OG images, fonts, client images |
| `app/[lang]/(shop)/page.tsx` | Homepage section composition |
| `src/emails/*.tsx` | Email template **content** only (text, CTAs, data display) |

### 🟡 EXTEND — Modify carefully, preserve contracts

| Path | Preserve |
|------|----------|
| `components/products/` | `AddToCartButton` + Medusa data flow |
| `components/cart/` | `CartContext` integration |
| `components/checkout/` | Payment registry + Stripe |
| `components/account/` | Supabase auth + Medusa queries |
| `components/ui/` | Reusable primitives — extend, don't break |
| `app/[lang]/(shop)/` | Route structure (SEO + i18n slugs) |

### 🔴 LOCKED — Never modify

All of: `lib/medusa/`, `lib/supabase/`, `lib/security/`, `lib/config.ts`, `lib/features.ts`, `lib/limits.ts`, `lib/feature-gate-config.ts`, `lib/panel-*.ts`, `lib/policy-engine.ts`, `lib/logger.ts`, `proxy.ts`, `app/api/`, `app/[lang]/(panel)/`, `app/[lang]/(auth)/`, `components/panel/PanelLoadingSkeleton.tsx`, `components/panel/PanelErrorBoundary.tsx`, `components/WebVitalsReporter.tsx`, `lib/analytics/`, `lib/i18n/index.ts|locale.ts|currencies.ts`, `src/emails/layouts/`, `src/emails/email-template-registry.ts`, `lib/email.ts`, `styles/panel-premium.css`.

### ⚫ PLATFORM — Not in this repo

Medusa image, Supabase migrations, CI/CD, Dokploy config, `.env` vars.

## 3. Customization Playbook

### 3.1 Branding
Logo → `public/logo.svg`. Favicon → `src/app/favicon.ico`. Colors → `globals.css` `@theme inline`. ⚠️ `@theme inline` replaces ALL default Tailwind palettes.

### 3.2 Homepage
Edit `page.tsx` — reorder/add/remove sections. New sections → `components/home/`. Wrap in `<ScrollReveal>`.

### 3.3 Product cards
Edit `components/products/ProductCard.tsx`. Keep `AddToCartButton`, Medusa data, flag checks.

### 3.4 Translations
Edit `lib/i18n/dictionaries/{locale}.json`. Keep 5 locales in sync. Missing keys → `en` fallback.

### 3.5 New pages
`app/[lang]/(shop)/{page-name}/page.tsx`. Use `lang` param + `getDictionary(lang)`.

### 3.6 Email content
Edit `src/emails/*.tsx`. Layouts are 🔴 LOCKED. 3 tiers: `minimal` (free), `brand` (email_marketing.basic), `modern` (email_marketing.pro). Prices from `EMAIL_TIER_PRICES` in `email-template-registry.ts`.

### 3.7 PWA
Edit `public/manifest.json`: `name`, `short_name`, `theme_color`, `background_color`, icons (192px + 512px PNG).

## 4. Panel Architecture

### Server/Client Split
`page.tsx` renders `<PanelPageHeader>` + passes data to `*Client.tsx`. Never render `PanelPageHeader` inside Client — causes double header.

### Bento Grid
Always use `<SotaBentoItem colSpan={N}>` (inline style). Never `className="col-span-N"` — Turbopack purges it.

### Dashboard Data (SSOT)
`panel-data-service.ts` → React `cache()` functions for all metrics. Zero Medusa calls for dashboard — all data from Medusa store API with `cache()`. Layout: CompactHero → KPIs → 30d Chart → TodaysFocus → RecentOrders → GovernanceStrip.

### Server Actions
`useTransition` + `setOptimisticState` for server actions in Client Components.

### CSS Architecture
`styles/panel-premium.css` — static CSS file (previously runtime injection via `dangerouslySetInnerHTML`). Imported in `(panel)/layout.tsx`.

## 5. Security Patterns

### `server-only` Guards
All server modules that access `createAdminClient()` or `cookies()` MUST have `import 'server-only'` at line 1. Currently guarded: `panel-guard.ts`, `log-owner-action.ts`, `chat/db.ts`, `chat/context-loader.ts`, `chat/usage-logger.ts`, `module-setup-registry.ts`.

### Rate Limiting
- Canonical IP extraction: `getClientIp()` from `lib/security/get-client-ip.ts`. **Do NOT import from `rate-limiter.ts`** (deprecated re-export).
- Smart rate limiters: `createSmartRateLimiter()` from `rate-limit-factory.ts` (Redis with memory fallback).
- Infrastructure rate limiter: `checkRateLimit()` from `rate-limiter.ts` (in-memory only, for health/revalidate).

### Structured Logging
All production logging via `logger` from `lib/logger.ts`. Zero `console.log` calls. Format: JSON with `tenant_id`, `request_id`, `trace_id`.

## 6. Invariants

1. Feature flag checks stay.
2. `getConfig()` untouched.
3. Auth flow intact.
4. API routes untouched.
5. SEO structure preserved.
6. i18n engine intact.
7. Medusa data flow respected.
8. `.env` never modified manually.
9. `proxy.ts` untouched.
10. Panel pages locked.
11. No `console.log` in production code.
12. All server modules have `server-only` guard.

## 7. Testing & Deployment

```bash
sentrux check .                                    # Architecture (score: 6270)
npx vitest run src/__tests__/governance/           # Governance tests
npx tsx scripts/audit-governance-ui.ts --strict    # 100% flag/limit/module coverage
pnpm test:run                                      # Full unit tests
pnpm build                                         # Build
bash scripts/release-gate.sh                       # Full gate
```

Deploy: `git push origin main` → GH Actions → GHCR → Dokploy (~4 min). Rollback: revert + push.

## 8. Loading/Error Coverage (100%)

43 `loading.tsx` + 43 `error.tsx` = 100% panel coverage.

| Variant | Pages |
|---------|-------|
| `table` | catalogo, categorias, clientes, crm, devoluciones, inventario, mi-tienda, paginas, pedidos, productos, resenas, tienda, ventas, automatizaciones, analiticas |
| `cards` | canales, capacidad, carrusel, insignias, mensajes, modulos, pos, utilidades |
| `form` | ajustes, auth, chatbot, email, envios, idiomas, mi-proyecto, modulos/[module], redes-sociales, seo, suscripcion |

## 9. Governance UI Components

### LimitAwareCTA — Resource-Gated Add Buttons
Replaces raw `<button>` + `SotaFeatureGateWrapper` for all "Add" actions. Receives `LimitCheckResult` from server data loader.

**Pattern**: RSC page → `data.ts` calls `checkLimit()` → passes `limitResult` to Client → `<LimitAwareCTA limitResult={...}>Add</LimitAwareCTA>`.

### ResourceBadge — Usage Counter
Compact `current/max` badge with severity coloring (ok/warning/critical) + micro progress bar.

### SubscriptionPill — Plan Indicator
Topbar badge with tier-aware gradient. Rendered in `PanelTopbar`.

## 10. Seed Pipeline

```bash
npx tsx scripts/seed-demo.ts --template=campifruit           # Products + Orders + Gov
npx tsx scripts/seed-demo.ts --template=campifruit --full    # + Carousel + Pages + Promos + Chatbot + Newsletter
npx tsx scripts/seed-governance.ts campifruit                # Governance only
npx tsx scripts/seed-content.ts --template=campifruit        # Content only (standalone)
npx tsx scripts/seed-content.ts --only=carousel,pages        # Specific content types
```

### Industry Templates (Module-Driven)

| Template | Industry | Modules |
|----------|----------|----------|
| `fresh-produce` | Frutería | ecommerce:pro, pos:pro, sales_channels:pro, email_marketing:basic, i18n:basic, seo:medio |
| `campifruit` | Frutería colombiana | ecommerce:pro, pos:enterprise, pos_kiosk:basic, sales_channels:pro, email_marketing:basic, crm:basic, seo:medio |
| `fashion` | Moda online | ecommerce:enterprise, sales_channels:enterprise, email_marketing:pro, crm:pro, rrss:instagram, seo:avanzado, i18n:pro |
| `restaurant` | Restauración | ecommerce:basic, pos:enterprise, pos_kiosk:enterprise, sales_channels:pro, chatbot:pro, automation:basic, email_marketing:basic, rrss:google_maps |
| `beauty` | Belleza / Spa | ecommerce:basic, pos:basic, sales_channels:basic, crm:basic, email_marketing:basic, rrss:instagram |
| `demo-full` | Demo completo | All 13 modules at max tier |

Flags are **auto-derived** from `contract.modules.catalog[].tiers[].flag_effects`. No plan tiers (starter/pro/enterprise). BNS model = Web Base + Module add-ons.

## 11. Governance Contract

- **SSOT**: `apps/storefront/src/lib/governance-contract.json` (82 flags, 32 limits, 13 modules)
- **Audit**: `npx tsx scripts/audit-governance-ui.ts --strict` → must return 100%
- **Module prices**: `contract.modules.catalog[].tiers[].price_chf` → never hardcode CHF values
- **Custom modules**: POS, CRM, Email Marketing, Automation, Product Reviews — all auto-migrated via `docker-entrypoint.sh`

## 12. DON'Ts

- Hardcode text (use dictionaries). Remove `Suspense` boundaries. Import server-only in client.
- Edit `config.ts`, `features.ts`, `limits.ts`, `.env`. Use unregistered Tailwind colors.
- Delete `loading.tsx`/`error.tsx`. Change URL slugs. Disable strict TS.
- Render `PanelPageHeader` in Client. Use `className="col-span-N"` for Bento.
- Use `console.log` in production code. Import `getClientIP` from `rate-limiter.ts`.
- Hardcode prices (use `EMAIL_TIER_PRICES` or contract). Modify email layouts or registry.
