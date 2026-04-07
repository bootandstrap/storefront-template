# GEMINI — Tenant Storefront Customization Guide

> **Read this first.** This guide tells an AI agent exactly what can and cannot be modified when customizing a tenant's storefront.
> Last updated: 2026-04-06 (Governance contract sync, pos_kiosk module, doc alignment run).

## 0. Local Development Setup

For **local development** of the template storefront, see the full guide at [`docs/guides/DEVELOPMENT.md`](docs/guides/DEVELOPMENT.md).

### Quick Reference

```bash
pnpm install                      # Install dependencies
npx tsx scripts/seed-demo.ts      # Seed demo products (idempotent)
./dev.sh                          # Start Redis + Medusa + Storefront
```

### Critical: Governance Supabase

The storefront fetches config, feature flags, and plan limits from the **central governance Supabase** (BootandStrap control plane) — NOT from the tenant's own Supabase.

Required `.env` variables for local dev:

| Variable | Purpose |
|----------|---------|
| `TENANT_ID` | Must exist in governance `tenants` table |
| `GOVERNANCE_SUPABASE_URL` | Governance Supabase URL |
| `GOVERNANCE_SUPABASE_ANON_KEY` | Governance Supabase **anon** key (NOT the tenant's anon key) |
| `GOVERNANCE_SUPABASE_SERVICE_KEY` | Governance Supabase service role key |

> **⚠️ Common pitfall**: If `GOVERNANCE_SUPABASE_ANON_KEY` is missing or uses the wrong project's key, the governance RPC fails with "Invalid API key" and the storefront enters **maintenance mode**. The governance client in `lib/supabase/governance.ts` checks `GOVERNANCE_SUPABASE_ANON_KEY` first, then falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Dev Tenant

If your `TENANT_ID` doesn't exist in governance, provision one via the `provision_tenant` RPC (see `docs/guides/DEVELOPMENT.md` §Dev Tenant Setup).

## 1. What This Repository Is

This is a **tenant-specific storefront** created from the BootandStrap storefront template.
It connects to:
- **Medusa v2** (shared Docker image) — headless commerce engine (products, cart, orders, payments)
- **Supabase** (shared cloud project) — auth, config, feature flags, plan limits
- **BootandStrap SaaS** (control plane) — governs what features are enabled remotely

**Your job**: customize the look, feel, content, and branding of this storefront for the specific client.
**Not your job**: modify the commerce engine, auth system, governance, or API layer.

## 2. Zone Map — What To Touch

Every file belongs to a zone. **Check the zone before editing.**

### 🟢 CUSTOMIZE — Safe to modify freely

These are the primary customization targets. Changes here are the core of client work.

| Path | What it controls |
|------|-----------------|
| `apps/storefront/src/app/globals.css` | Design tokens, colors, typography, spacing, animations. **CRITICAL**: Uses Tailwind v4 `@theme inline` which replaces ALL default palettes — any standard color (emerald, rose, amber, etc.) must be explicitly registered in the `@theme inline` block or it renders transparent |
| `apps/storefront/src/components/home/` | Homepage sections (Hero, CategoryGrid, FeaturedProducts, TrustSection, Carousel) |
| `apps/storefront/src/components/layout/Header.tsx` | Header — logo, navigation, layout |
| `apps/storefront/src/components/layout/Footer.tsx` | Footer — links, social, legal |
| `apps/storefront/src/lib/i18n/dictionaries/*.json` | All translatable text (5 locales: en, es, de, fr, it) |
| `apps/storefront/public/` | Static assets: logo, favicon, OG images, fonts, client images |
| `apps/storefront/src/app/[lang]/(shop)/page.tsx` | Homepage composition — which sections appear and in what order |

### 🟡 EXTEND — Modify with care, add new files freely

You can customize these but must preserve their **functional contracts** (props, data flow, feature flag checks).

| Path | What it controls | Watch out for |
|------|-----------------|---------------|
| `apps/storefront/src/components/products/` | Product cards, grids, detail layout | Keep `AddToCartButton` + Medusa data flow intact |
| `apps/storefront/src/components/cart/` | Cart drawer, cart items, shipping banner | Keep `CartContext` integration |
| `apps/storefront/src/components/checkout/` | Checkout modal, payment step, shipping | Keep payment method registry + Stripe integration |
| `apps/storefront/src/components/account/` | Customer dashboard, orders, profile | Keep Supabase auth + Medusa order queries |
| `apps/storefront/src/components/ui/` | Toaster, Skeleton, ErrorBoundary, ScrollReveal | These are reusable primitives — extend, don't break |
| `apps/storefront/src/app/[lang]/(shop)/` | Shop pages (productos, carrito, cuenta, etc.) | Keep route structure for SEO + i18n slugs |
| New pages in `(shop)/` | Add client-specific pages (e.g., `/about`, `/gallery`) | Use `[lang]` param for i18n |

### 🔴 LOCKED — Never modify in tenant repos

These files are the **SaaS platform layer**. Modifying them breaks governance, security, or multi-tenant isolation.

| Path | Why it's locked |
|------|----------------|
| `apps/storefront/src/lib/medusa/` | Typed API fetchers — shared contract with Medusa backend |
| `apps/storefront/src/lib/supabase/` | Auth clients (browser, server, admin) — shared contract |
| `apps/storefront/src/lib/security/` | Rate limiting, abuse prevention — platform security |
| `apps/storefront/src/lib/config.ts` | Config fetcher with TTL cache + RPC dual-mode — SaaS governance core |
| `apps/storefront/src/lib/log-tenant-error.ts` | Error logging to tenant_errors — uses governance RPC |
| `apps/storefront/src/lib/features.ts` | Feature flag checker — reads from Supabase |
| `apps/storefront/src/lib/limits.ts` | Plan limits checker — reads from Supabase |
| `apps/storefront/src/lib/feature-gate-config.ts` | Flag → module → BSWEB slug mapping |
| `apps/storefront/src/lib/panel-*.ts` | Owner panel auth, access, validation |
| `apps/storefront/src/lib/policy-engine.ts` | Business rule enforcement |
| `apps/storefront/src/proxy.ts` | Next.js 16 routing proxy — auth + locale + role protection |
| `apps/storefront/src/app/api/` | All API routes (webhooks, health, orders, revalidate, chat) |
| `apps/storefront/src/app/[lang]/(panel)/` | Owner panel — governed by SaaS flags. **40+ components** as of 2026-04-06: PanelTopbar, PanelShell, PanelSidebar, CommandPalette (⌘K), PanelToaster, SetupProgress, StoreHealthCard, SmartTip, AchievementProvider, UsageMeter, AnimatedStatValue, ModulesMarketplaceClient, TierComparisonTable, POS (POSCart, POSClient, POSProductGrid, POSPaymentOverlay, POSOfflineBanner, POSDashboard, POSVariantPicker, POSReceipt, POSKioskClient), Utilities (WiFiQRCard, LoyaltyCardPreview, BarcodeGenerator, PriceLabelSheet), SOTA Bento system (SotaBentoGrid, SotaBentoItem, SotaGlassCard, SotaMetric, SotaFeatureGateWrapper), I18n panel (I18nClient v2 with live toggles), etc. |
| `apps/storefront/src/app/[lang]/(auth)/` | Auth pages — governed by SaaS flags |
| `apps/storefront/src/lib/i18n/index.ts` | i18n engine — only edit dictionaries, not the engine |
| `apps/storefront/src/lib/i18n/locale.ts` | Locale resolution logic |
| `apps/storefront/src/lib/i18n/currencies.ts` | Currency system |

### ⚫ PLATFORM — Not in this repo (shared infrastructure)

| Component | Where it lives |
|-----------|---------------|
| Medusa backend | `ghcr.io/bootandstrap/medusa:latest` (shared Docker image) |
| Supabase migrations | Monorepo `supabase/migrations/` (applied via BootandStrap) |
| CI/CD pipeline | `.github/workflows/deploy.yml` (auto-set by provisioning) |
| Dokploy config | Managed by BootandStrap SaaS control plane |
| Environment vars | Pre-set by provisioning — **do not modify `.env`** |

## 3. Customization Playbook

### 3.1 Change branding (logo, colors, fonts)

1. **Logo**: Replace `public/logo.svg` (or `.png`). Update `<Header>` if filename changes.
2. **Favicon**: Replace `src/app/favicon.ico` + add `public/icons/` set if needed.
3. **Colors**: The storefront uses the **A+D Architecture** (Tailwind v4 `@theme inline`). ALL colors are defined as flat hex values in `globals.css`:
   - **Brand scale**: `bg-brand`, `bg-brand-light`, `bg-brand-dark`, `bg-brand-50`–`bg-brand-950`
   - **Semantic tokens**: `bg-sec`, `bg-accent`, `text-tx`, `bg-sf-0`–`bg-sf-3`
   - **UUI scale**: `bg-brand-50`–`bg-brand-950` (mapped to green brand scale)
   > ⚠️ `@theme inline` **replaces ALL default Tailwind palettes**. Standard colors like `emerald-500`, `rose-500`, etc. DO NOT WORK unless explicitly added to the `@theme inline` block.
   > ⚠️ After changing tokens: stop `./dev.sh` → `rm -rf apps/storefront/.next` → restart → DevTools: "Disable cache" + Cmd+Shift+R.
4. **Fonts**: Add font files to `public/fonts/` or import from Google Fonts in `layout.tsx`.
5. **Typography**: Update font-family in `globals.css`.

### 3.2 Change homepage layout

Edit `apps/storefront/src/app/[lang]/(shop)/page.tsx`:
```tsx
// Reorder, add, or remove sections:
<HeroSection config={config} dict={dict} />
<Suspense fallback={<CategoryGridSkeleton />}>
  <CategoryGrid lang={lang} dict={dict} />
</Suspense>
{/* Add your custom section here */}
<YourNewSection />
<Suspense fallback={<ProductGridSkeleton />}>
  <FeaturedProducts lang={lang} dict={dict} />
</Suspense>
<TrustSection dict={dict} />
```

### 3.3 Add a new homepage section

1. Create `components/home/YourSection.tsx`
2. Import in `page.tsx`
3. Style via `globals.css` or component-level styles
4. Wrap in `<ScrollReveal>` for animation

### 3.4 Customize product cards

Edit `components/products/ProductCard.tsx`. You can:
- Change layout (horizontal/vertical)
- Add/remove info (price, badges, ratings)
- Change hover effects
- **Keep**: `AddToCartButton`, price display from Medusa, feature flag checks

### 3.5 Translate / adapt copy

Edit `lib/i18n/dictionaries/es.json` (and other locales). Structure:
```json
{
  "common": { "add_to_cart": "Añadir al carrito", ... },
  "home": { "hero_title": "Client-specific headline", ... },
  "products": { ... },
  "checkout": { ... }
}
```
> Keep all 5 locale files in sync. Missing keys fall back to `en`.

### 3.6 Add client-specific pages

```
app/[lang]/(shop)/about/page.tsx       ← /en/about, /es/about
app/[lang]/(shop)/gallery/page.tsx     ← /en/gallery, /es/gallery
```

Use the `lang` param for i18n. Import `getDictionary(lang)` for translations.

### 3.7 Add client images

### 3.8 Owner Panel — Architecture Patterns (SOTA Bento Grid)

> These patterns apply to ALL panel pages. Deviating from them causes visual regressions.

**Pattern: Header in Server, Grid in Client**

Every panel page follows a strict split:
- `page.tsx` (Server Component): fetches data + renders `<PanelPageHeader>` + passes props to Client
- `*Client.tsx` (Client Component): renders `<SotaBentoGrid>` + interaction logic only

```tsx
// ✅ CORRECT — page.tsx (Server)
export default async function MyPage() {
  const { appConfig } = await withPanelGuard()
  return (
    <div className="space-y-6">
      <PanelPageHeader title={t('...')} icon={<Icon />} />
      <MyClient data={data} labels={labels} />
    </div>
  )
}

// ❌ WRONG — MyClient.tsx (Client)
// NEVER render PanelPageHeader inside a Client component — causes double header
export default function MyClient() {
  return <><PanelPageHeader ... /><SotaBentoGrid>...</SotaBentoGrid></> // ← BUG
}
```

**Pattern: Bento Grid colSpan — always inline style**

Tailwind v4 + Turbopack purges dynamic class names like `col-span-4`. Always use inline styles:

```tsx
// ✅ CORRECT
<SotaBentoItem colSpan={4}>  // internally uses style={{ gridColumn: 'span 4' }}

// ❌ WRONG — will be purged
<div className="col-span-4">
```

**Pattern: Interactive toggles with server actions**

Use `useTransition` for server action calls in Client Components. This keeps the UI responsive during the async save:

```tsx
const [isPending, startTransition] = useTransition()
function handleToggle(value: string) {
  setOptimisticState(value)  // immediate UI update
  startTransition(async () => {
    const result = await mySaveAction(value)
    if (!result.success) rollback()
  })
}
```

**Pattern: i18n Module gating**

- `enable_multi_language` flag gates the entire `/panel/idiomas` route via `FeatureGate`
- `max_languages` limit (from tier) controls how many storefront languages can be activated
- `panel_language` (config) is the owner's UI language — independent of `active_languages` (storefront)
- `LanguageSelector` in `Header.tsx` auto-hides when `active_languages.length <= 1`
- Upgrade upsell links to `/panel/suscripcion?module=i18n`


Place in `public/images/`. Use Next.js `<Image>` component:
```tsx
import Image from 'next/image'
<Image src="/images/client-hero.jpg" alt="..." width={1200} height={600} />
```

For Supabase Storage images, use the existing `supabase-image-loader.ts`.

## 4. Invariants — Rules That Must Never Break

1. **Feature flag checks stay**: Never remove `isFeatureEnabled()` guards. If a feature is flag-gated, it stays flag-gated.
2. **Config fetch untouched**: `getConfig()` in `lib/config.ts` is the single source of truth for tenant config. Uses governance RPCs (anon key) when available, service_role fallback. Don't bypass it.
3. **Auth flow intact**: Login, registration, and panel access are governed by SaaS. Don't modify auth routes.
4. **API routes untouched**: Webhook handlers, health checks, and revalidation endpoints are platform infrastructure.
5. **SEO structure preserved**: `sitemap.ts`, `robots.ts`, JSON-LD builders, and `<head>` metadata must remain functional.
6. **i18n engine intact**: Only modify dictionary JSON files, not the i18n system itself.
7. **Medusa data flow**: All product/cart/order data comes from Medusa. Don't create parallel data sources.
8. **Environment variables**: Pre-set by provisioning. **Never modify `.env` manually.**
9. **`proxy.ts` untouched**: This handles auth redirects, locale routing, and role-based access.
10. **Panel pages locked**: The owner panel (`/panel/`) is governed by SaaS feature flags and module gates.

## 5. Testing Contract

After ANY customization, these must pass:

```bash
sentrux check .              # Architectural boundaries respected
pnpm test:run              # All unit tests green
pnpm build                 # Build succeeds (no type errors)
bash scripts/release-gate.sh  # Gates pass (includes coverage and sentrux gate)
```

If a test fails after your changes, your changes broke something. Fix before pushing.

## 6. Deployment Contract

- **Auto-deploy**: `git push origin main` → GitHub Actions → GHCR → Dokploy auto-redeploy (~4 min)
- **No manual Docker ops**: Don't SSH into the VPS. Don't run `docker` commands. Dokploy handles everything.
- **No env var changes**: All env vars are set by the provisioning system. If a new env var is needed, coordinate with BootandStrap SaaS team.
- **Rollback**: Revert commits → push → auto-deploy of previous state.

## 7. Stack Reference

| Component | Version | Notes |
|-----------|---------|-------|
| Next.js | 16.x | App Router, Server Components |
| React | 19.x | `useOptimistic`, `useActionState`, Suspense |
| Tailwind CSS | v4 | CSS-first config (`@theme`), no JS config |
| TypeScript | 5.x | Strict mode |
| pnpm | 9.x | Workspace package manager |
| Turbo | Latest | Monorepo build tool |

## 8. Common Mistakes To Avoid

- ❌ Hardcoding text instead of using dictionaries
- ❌ Removing `Suspense` boundaries (breaks streaming)
- ❌ Importing server-only modules in client components
- ❌ Adding `'use client'` to pages that don't need it
- ❌ Modifying `config.ts`, `features.ts`, or `limits.ts`
- ❌ Editing `.env` or `.env.local`
- ❌ Using standard Tailwind colors (emerald, rose, amber, etc.) without first registering them in `globals.css` `@theme inline` block — Tailwind v4 `@theme inline` strips ALL defaults
- ❌ Adding npm packages without checking bundle impact
- ❌ Removing error boundaries (`error.tsx` files)
- ❌ Changing URL slug patterns (breaks SEO + i18n alternates)
- ❌ Disabling TypeScript strict mode
- ❌ Rendering `PanelPageHeader` inside a Client Component (`*Client.tsx`) — it belongs exclusively in `page.tsx` (Server Component). Double render = double header.
- ❌ Using `className="col-span-N"` for Bento Grid layout — Turbopack purges dynamic Tailwind classes. Use `<SotaBentoItem colSpan={N}>` which applies `style={{ gridColumn: 'span N' }}` directly.
- ❌ Calling `saveActiveLanguagesAction` with an empty array — minimum 1 language must always remain active; the action rejects it server-side.
- ❌ Using `saveLanguagePreferencesAction` to update only `panel_language` — it also overwrites `active_languages`. Use `savePanelLanguageAction` instead for panel-only language changes.

## 9. When In Doubt

1. Check the Zone Map (Section 2)
2. Is the file 🟢 or 🟡? → Proceed with the playbook
3. Is the file 🔴 or ⚫? → **Stop. Ask the BootandStrap team.**
4. Run tests after every change
5. Commit small — easier to rollback
