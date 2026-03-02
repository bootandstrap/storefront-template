# Flag & Limit Enforcement Catalog

> **Purpose**: Documents which flags and limits are actively enforced server-side, which are UI-only, and which lack enforcement entirely.
> **Updated**: 2026-03-02 (Post Mega Plan Phase 2 — cross-verified against source code)

---

## Feature Flags (37 total)

### Legend

| Status | Meaning |
|--------|---------|
| ✅ Server-enforced | Checked in server action / server component before mutation |
| 🟡 UI-gated only | Conditionally renders UI elements; no server-side block |
| 🔵 Proxy-level | Checked in `proxy.ts` edge middleware |
| ⚠️ No enforcement | Defined in schema but not checked anywhere |

---

### Checkout (4 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_whatsapp_checkout` | ✅ Server-enforced | `checkout/actions.ts` blocks WhatsApp flow |
| `enable_online_payments` | ✅ Server-enforced | `checkout/actions.ts` blocks Stripe flow |
| `enable_cash_on_delivery` | ✅ Server-enforced | `checkout/actions.ts` blocks COD flow |
| `enable_bank_transfer` | ✅ Server-enforced | `checkout/actions.ts` blocks bank flow |

### WhatsApp Contact (1 flag)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_whatsapp_contact` | 🟡 UI-gated | Header, Footer, HeroSection hide CTA button |

### Auth (5 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_user_registration` | ✅ Server-enforced | `registro/actions.ts` + `registro/page.tsx` |
| `enable_guest_checkout` | ✅ Server-enforced | `checkout/page.tsx` RSC — redirects to login if disabled (server component, not client) |
| `require_auth_to_order` | ✅ Server-enforced | `checkout/page.tsx` RSC — redirects to login if enabled (server component, not client) |
| `enable_google_auth` | 🟡 UI-gated | Login page shows/hides Google button |
| `enable_email_auth` | 🟡 UI-gated | Login page shows/hides email form |

### Content (7 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_reviews` | 🟡 UI-gated | Product detail page conditional render |
| `enable_wishlist` | 🟡 UI-gated | Product detail + AccountSidebar |
| `enable_carousel` | 🟡 UI-gated | Homepage + panel sidebar |
| `enable_cms_pages` | ✅ Server-enforced | `paginas/[slug]/page.tsx` returns null |
| `enable_product_search` | 🟡 UI-gated | Header search bar |
| `enable_related_products` | 🟡 UI-gated | Product detail page |
| `enable_product_comparisons` | 🟡 UI-gated | Shop layout + product list |

### Advanced (5 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_product_badges` | 🟡 UI-gated | ProductCard + ProductGrid |
| `enable_analytics` | 🟡 UI-gated | Panel layout sidebar + analiticas page check |
| `enable_promotions` | ✅ Server-enforced | `cart/promotions/route.ts` via `requireFlag('enable_promotions')` (P0-5 fix) |
| `enable_multi_language` | 🟡 UI-gated | Header language selector |
| `enable_multi_currency` | 🟡 UI-gated | Header currency selector |

### Business (4 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_admin_api` | 🟡 UI-gated | Maps to `automation` module; no `/api/admin` routes exist in storefront. Panel feature visibility controlled via `SubscriptionClient.tsx` |
| `enable_social_links` | 🟡 UI-gated | Footer social icons |
| `enable_order_notes` | 🟡 UI-gated | CheckoutModal notes field |
| `enable_address_management` | 🟡 UI-gated | AccountSidebar addresses link |

### System (8 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_newsletter` | ✅ Server-enforced | `/api/newsletter/route.ts` via `isFeatureEnabled()` + `max_newsletter_subscribers` limit (fail-closed) |
| `enable_maintenance_mode` | ✅ Server-enforced | `(shop)/layout.tsx` blocks entire store |
| `enable_owner_panel` | ✅ Server-enforced | `(panel)/layout.tsx` redirects if off |
| `enable_customer_accounts` | ✅ Server-enforced | `cuenta/layout.tsx` redirects if off |
| `enable_order_tracking` | ✅ Server-enforced | `cuenta/pedidos/page.tsx` redirects if off |
| `enable_cookie_consent` | 🟡 UI-gated | Shop layout renders banner |
| `enable_chatbot` | ✅ Server-enforced | `/api/chat` route + panel chatbot page |
| `enable_self_service_returns` | ✅ Server-enforced | Panel devoluciones page |

### Owner Panel Modes (2 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `owner_lite_enabled` | ✅ Server-enforced | `panel-modules.ts` hides advanced modules |
| `owner_advanced_modules_enabled` | ✅ Server-enforced | `panel-modules.ts` + `panel-route-guards.ts` |

---

## Plan Limits (24 total)

### Actively Enforced (12 limits)

These limits have `checkLimit()` calls in **server actions or server components** that block creation:

| Limit | Enforcement Point(s) |
|-------|----------------------|
| `max_products` | `productos/actions.ts`, `catalogo/page.tsx`, `productos/page.tsx` |
| `max_customers` | `registro/actions.ts`, `registro/page.tsx` |
| `max_orders_month` | `checkout/actions.ts` — **tenant-scoped via `sales_channel_id`** (C1 fix, 20 Feb 2026) |
| `max_categories` | `categorias/actions.ts`, `categorias/page.tsx`, `catalogo/page.tsx` |
| `max_images_per_product` | `productos/actions.ts` (image upload) |
| `max_cms_pages` | `paginas/actions.ts`, `paginas/page.tsx` |
| `max_carousel_slides` | `carrusel/actions.ts`, `carrusel/page.tsx` |
| `max_whatsapp_templates` | `mensajes/actions.ts`, `mensajes/page.tsx` |
| `max_badges` | `insignias/actions.ts` (`toggleBadge` + `setBadges`) |
| `max_newsletter_subscribers` | `api/newsletter/route.ts` — fail-closed |
| `max_chatbot_messages_month` | `/api/chat` route (`checkChatQuota()`) — **fail-closed + 10 req/min rate-limit** (C2 fix, 20 Feb 2026) |
| `max_file_upload_mb` | `productos/actions.ts` (individual file size check at upload, line 168) |
| `max_email_sends_month` | `email-automations.ts` (capped in `processAbandonedCarts` + `processReviewRequests`) |
| `max_api_calls_day` | `rate-limit-tenant.ts` `checkTrafficCapacity()` → enforced in cart, checkout, orders API routes |

### Display-Only (4 limits)

These appear in the panel dashboard `UsageMeter` but have **no server-side block**:

| Limit | Status |
|-------|--------|
| `max_admin_users` | Display shows real count from profiles; no enforcement on user creation |
| `storage_limit_mb` | Display shows Medusa storage estimate; no aggregate enforcement at upload |
| `max_custom_domains` | Display shows `0/1`; no domain provisioning logic exists |

### No Enforcement At All (6 limits)

These exist in `PlanLimits` type and DB but have **no UI display** and **no server check**:

| Limit | Status |
|-------|--------|
| `max_languages` | ✅ Now enforced: `tenants.ts` `updateTenantConfig()` validates count (2026-02-21) |
| `max_currencies` | ✅ Now enforced: `tenants.ts` `updateTenantConfig()` validates count (2026-02-21) |
| `plan_name` | Metadata field (not a numeric limit) |
| `plan_expires_at` | Metadata field (enforced separately via trial logic) |

---

## Recommendations

1. ~~**`enable_promotions`**: Add server-side check~~ ✅ Done (P0-5, requireFlag)
2. ~~**`enable_admin_api`**: Gate `/api/admin` routes~~ ✅ Resolved (no admin API routes exist; UI-gated)
3. ~~**`enable_guest_checkout`** / **`require_auth_to_order`**: Server enforcement~~ ✅ Done — RSC `checkout/page.tsx` redirects to login
4. **`max_admin_users`**: Enforce at user invitation (currently display-only)
5. **`storage_limit_mb`**: Enforce aggregate at upload time (currently display-only, per-file enforced)
6. ~~**`max_api_calls_day`**: Integrate with rate limiter~~ ✅ Done — `checkTrafficCapacity` in cart/checkout/orders routes
7. ~~**`max_file_upload_mb`**: Enforce at upload~~ ✅ Done — `productos/actions.ts:168`
8. ~~**`max_email_sends_month`**: Enforce in email sends~~ ✅ Done — `email-automations.ts:57`
