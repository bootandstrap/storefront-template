# GEMINI — Tenant Storefront Customization Guide

> AI agent guide for what can/cannot be modified in a tenant storefront.
> Last updated: 2026-04-14 (AI-optimized documentation).

## 0. Local Dev

Full guide: [`docs/guides/DEVELOPMENT.md`](docs/guides/DEVELOPMENT.md). Quick start: `pnpm install` → `npx tsx scripts/seed-demo.ts` → `./dev.sh`.

**Critical**: `GOVERNANCE_SUPABASE_ANON_KEY` must be set (governance project, NOT tenant). Without it → maintenance mode. Dev tenant: see DEVELOPMENT.md §Dev Tenant.

## 1. What This Repo Is

Tenant storefront from BootandStrap template. Connects to Medusa v2 (commerce), Supabase (auth/config/governance), BootandStrap SaaS (feature flags).

**Your job**: customize look, feel, content, branding. **Not your job**: commerce engine, auth, governance, API layer.

## 2. Zone Map

### 🟢 CUSTOMIZE — Safe to modify

| Path | Controls |
|------|----------|
| `globals.css` | Design tokens (Tailwind v4 `@theme inline`, flat hex values). After changes: `rm -rf .next` → restart → Disable cache + Cmd+Shift+R |
| `components/home/` | Homepage sections (Hero, CategoryGrid, FeaturedProducts, TrustSection) |
| `components/layout/Header.tsx` / `Footer.tsx` | Navigation, logo, links |
| `lib/i18n/dictionaries/*.json` | All text (5 locales: en, es, de, fr, it). Keep in sync. |
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

All of: `lib/medusa/`, `lib/supabase/`, `lib/security/`, `lib/config.ts`, `lib/features.ts`, `lib/limits.ts`, `lib/feature-gate-config.ts`, `lib/panel-*.ts`, `lib/policy-engine.ts`, `proxy.ts`, `app/api/`, `app/[lang]/(panel)/`, `app/[lang]/(auth)/`, `components/panel/PanelLoadingSkeleton.tsx`, `components/panel/PanelErrorBoundary.tsx`, `components/WebVitalsReporter.tsx`, `lib/analytics/`, `lib/i18n/index.ts|locale.ts|currencies.ts`, `src/emails/layouts/`, `src/emails/email-template-registry.ts`, `lib/email.ts`.

### ⚫ PLATFORM — Not in this repo

Medusa image, Supabase migrations, CI/CD, Dokploy config, `.env` vars.

## 3. Customization Playbook

### 3.1 Branding
Logo → `public/logo.svg`. Favicon → `src/app/favicon.ico`. Colors → `globals.css` `@theme inline` (brand scale: `bg-brand`, `bg-brand-light`, semantic tokens: `bg-sec`, `text-tx`). ⚠️ `@theme inline` replaces ALL default Tailwind palettes — register any color you need.

### 3.2 Homepage
Edit `page.tsx` — reorder/add/remove sections. New sections → `components/home/`. Wrap in `<ScrollReveal>`.

### 3.3 Product cards
Edit `components/products/ProductCard.tsx`. Keep `AddToCartButton`, Medusa data, flag checks.

### 3.4 Translations
Edit `lib/i18n/dictionaries/{locale}.json`. Keep 5 locales in sync. Missing keys → `en` fallback.

### 3.5 New pages
`app/[lang]/(shop)/{page-name}/page.tsx`. Use `lang` param + `getDictionary(lang)`.

### 3.6 Email content
Edit `src/emails/*.tsx`. Layout is 🔴 LOCKED. 3 tiers: `minimal` (free), `brand` (15 CHF/mo), `modern` (30 CHF/mo). Preview: `npx react-email dev --dir src/emails --port 3333`.

### 3.7 PWA
Edit `public/manifest.json`: `name`, `short_name`, `theme_color`, `background_color`, icons (192px + 512px PNG).

## 4. Panel Architecture Patterns

**Header in Server, Grid in Client**: `page.tsx` renders `<PanelPageHeader>` + passes data to `*Client.tsx`. Never render `PanelPageHeader` inside Client — causes double header.

**Bento Grid**: Always use `<SotaBentoItem colSpan={N}>` (inline style). Never `className="col-span-N"` — Turbopack purges it.

**Toggles**: `useTransition` + `setOptimisticState` for server actions in Client Components.

## 5. Invariants

1. Feature flag checks stay. 2. `getConfig()` untouched. 3. Auth flow intact. 4. API routes untouched. 5. SEO structure preserved. 6. i18n engine intact. 7. Medusa data flow respected. 8. `.env` never modified manually. 9. `proxy.ts` untouched. 10. Panel pages locked.

## 6. Testing & Deployment

```bash
sentrux check .               # Architecture
pnpm test:run                  # Unit tests
pnpm build                     # Build
bash scripts/release-gate.sh   # Full gate
```

Deploy: `git push origin main` → GH Actions → GHCR → Dokploy (~4 min). Rollback: revert + push.

## 7. DON'Ts

- Hardcode text (use dictionaries). Remove `Suspense` boundaries. Import server-only in client.
- Edit `config.ts`, `features.ts`, `limits.ts`, `.env`. Use unregistered Tailwind colors.
- Delete `loading.tsx`/`error.tsx`. Change URL slugs. Disable strict TS.
- Render `PanelPageHeader` in Client. Use `className="col-span-N"` for Bento.
- Call `saveActiveLanguagesAction([])`. Use `saveLanguagePreferencesAction` for panel-only change.
- Modify email layouts or registry. Edit `.env`.

## 8. Loading/Error Variants

34 `loading.tsx` + 33 `error.tsx` = 100% panel coverage.

| Variant | Pages |
|---------|-------|
| `table` | catalogo, categorias, clientes, crm, devoluciones, inventario, mi-tienda, paginas, pedidos, productos, resenas, tienda, ventas, automatizaciones, analiticas |
| `cards` | canales, capacidad, carrusel, insignias, mensajes, modulos, pos, utilidades |
| `form` | ajustes, auth, chatbot, email, envios, idiomas, mi-proyecto, redes-sociales, seo, suscripcion |
