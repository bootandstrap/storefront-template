# Storefront Customization Guide

This storefront was created from the BootandStrap template for your business.
You (or our team) can customize everything visual while the commerce engine, security, and payments stay rock-solid.

## What You Can Change

### 🎨 Visual Identity
- **Logo**: Replace the logo file in `apps/storefront/public/`
- **Colors**: Edit the color palette in `apps/storefront/src/app/globals.css`
- **Fonts**: Add custom fonts to `public/fonts/` or import from Google Fonts
- **Favicon**: Replace `src/app/favicon.ico`

### 🏠 Homepage
- Reorder, add, or remove sections in the homepage
- Create entirely new sections (testimonials, gallery, team, stats...)
- Modify the hero banner (text, images, layout)
- Customize the featured products section
- Edit trust indicators and social proof

### 🛍️ Product Display
- Customize product card design (layout, info shown, hover effects)
- Adjust product detail page layout
- Modify the product grid (columns, spacing, filters)

### 📝 Text & Translations
- All text lives in dictionary files (`lib/i18n/dictionaries/*.json`)
- Edit headlines, descriptions, button labels, error messages
- Available in 5 languages: English, Spanish, German, French, Italian

### 📄 New Pages
- Add pages like About Us, Gallery, Team, FAQ
- Any new page supports all 5 languages automatically

### 🖼️ Images
- Place client images in `public/images/`
- Hero banners, team photos, gallery images

## What Stays Untouched

These are managed by BootandStrap and should **never be modified**:

| Area | Why |
|------|-----|
| Payment processing | Stripe integration is platform-managed |
| User authentication | Auth is shared across all tenants |
| Product/order data | Comes from Medusa commerce engine |
| Feature flags | Controlled from BootandStrap admin |
| API endpoints | Webhooks, health checks, revalidation |
| Owner panel | Governed by your purchased modules |
| Environment variables | Pre-configured during setup |

## How Changes Go Live

1. Make your changes
2. Run quality checks: `pnpm test:run && pnpm build`
3. Push to main: `git push origin main`
4. Automatic deployment (~4 minutes)

That's it. No manual server work needed.

## Need Help?

For customization requests, contact the BootandStrap team.
For detailed technical guidance, see `GEMINI.md`.
