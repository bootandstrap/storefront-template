---
description: Customize a tenant storefront (branding, layout, content, pages)
---

# Storefront Customization Workflow

This workflow guides you through customizing a tenant's storefront safely.

## Pre-flight

1. Read `GEMINI.md` — specifically the **Zone Map** (Section 2)
2. Identify which files the change targets
3. Verify each file is in 🟢 CUSTOMIZE or 🟡 EXTEND zone
4. If ANY file is 🔴 LOCKED or ⚫ PLATFORM — **STOP and ask the user**

## Common Customization Tasks

### Change branding (logo, colors, fonts)
1. Replace logo: `apps/storefront/public/logo.svg` (or `.png`)
2. Edit colors in `apps/storefront/src/app/globals.css` → `:root` custom properties
3. Add fonts to `public/fonts/` or import in `layout.tsx`
4. Replace favicon: `apps/storefront/src/app/favicon.ico`

### Change homepage
1. Open `apps/storefront/src/app/[lang]/(shop)/page.tsx`
2. Reorder, add, or remove section components
3. New sections go in `apps/storefront/src/components/home/`
4. Wrap with `<ScrollReveal>` for animations

### Modify copy/translations
1. Edit `apps/storefront/src/lib/i18n/dictionaries/{locale}.json`
2. Keep all 5 locales in sync (en, es, de, fr, it)
3. Missing keys fall back to `en.json`

### Add a new page
1. Create `apps/storefront/src/app/[lang]/(shop)/{page-name}/page.tsx`
2. Use `lang` param for i18n: `const dict = await getDictionary(lang)`
3. Add corresponding dictionary keys

### Add client images
1. Place images in `apps/storefront/public/images/`
2. Use Next.js `<Image>` component with proper `width`/`height`

## Post-change verification

// turbo-all

1. Run tests:
```bash
cd apps/storefront && pnpm test:run
```

2. Verify build:
```bash
pnpm build
```

3. Run release gate:
```bash
bash scripts/release-gate.sh
```

4. Commit and push (triggers auto-deploy):
```bash
git add -A && git commit -m "customize: {brief description}" && git push origin main
```

## Rules

- **Never touch 🔴 LOCKED files** — check Zone Map first
- **Never edit `.env`** — env vars are managed by provisioning
- **Never remove feature flag checks** (`isFeatureEnabled()`)
- **Always keep i18n dictionaries in sync**
- **Always run tests before pushing**
