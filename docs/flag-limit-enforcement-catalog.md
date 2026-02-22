# Flag & Limit Enforcement Catalog

> **Purpose**: Documents which flags and limits are actively enforced server-side, which are UI-only, and which lack enforcement entirely.
> **Updated**: 2026-02-21 (Post Fase 2 SaaS Governance)

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
| `enable_guest_checkout` | 🟡 UI-gated | `CheckoutModal` conditional |
| `require_auth_to_order` | 🟡 UI-gated | CheckoutModal auth check (proxy delegates to page) |
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
| `enable_promotions` | ⚠️ No enforcement | Defined in FeatureFlags; promotion engine runs unconditionally |
| `enable_multi_language` | 🟡 UI-gated | Header language selector |
| `enable_multi_currency` | 🟡 UI-gated | Header currency selector |

### Business (4 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_admin_api` | ⚠️ No enforcement | Defined but no gate on `/api/admin` routes |
| `enable_social_links` | 🟡 UI-gated | Footer social icons |
| `enable_order_notes` | 🟡 UI-gated | CheckoutModal notes field |
| `enable_address_management` | 🟡 UI-gated | AccountSidebar addresses link |

### System (8 flags)

| Flag | Enforcement | Where |
|------|-------------|-------|
| `enable_newsletter` | 🟡 UI-gated | Footer newsletter form |
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
| `max_admin_users` | Panel dashboard display (hardcoded count=1) |
| `storage_limit_mb` | Panel dashboard display (hardcoded count=0) |
| `max_email_sends_month` | Panel dashboard display (hardcoded count=0) |

### Display-Only (4 limits)

These appear in the panel dashboard `UsageMeter` but have **no server-side block**:

| Limit | Status |
|-------|--------|
| `max_admin_users` | Display shows `1/3`; no enforcement on user creation |
| `storage_limit_mb` | Display shows `0/500`; no enforcement on uploads |
| `max_email_sends_month` | Display shows `0/500`; no enforcement on Resend calls |
| `max_custom_domains` | Display shows `0/1`; no domain provisioning logic exists |

### No Enforcement At All (6 limits)

These exist in `PlanLimits` type and DB but have **no UI display** and **no server check**:

| Limit | Status |
|-------|--------|
| `max_languages` | Config `active_languages` is not validated against this |
| `max_currencies` | Config `active_currencies` is not validated against this |
| `max_file_upload_mb` | Individual file size not checked against this |
| `max_custom_domains` | No domain provisioning infrastructure |
| `max_api_calls_day` | In `LimitableResource` type; no rate-limiting integration |
| `plan_name` | Metadata field (not a numeric limit) |
| `plan_expires_at` | Metadata field (enforced separately via trial logic) |

---

## Recommendations

1. **`enable_promotions`**: Add server-side check in promotion application flow
2. **`enable_admin_api`**: Gate `/api/admin` routes with this flag check
3. **`enable_guest_checkout`** / **`require_auth_to_order`**: Consider server-side enforcement in checkout actions
4. **`max_admin_users`**: Count real admin profiles and enforce at user invitation
5. **`storage_limit_mb`**: Sum tenant storage usage and enforce at upload
6. **`max_api_calls_day`**: Integrate with rate limiter using per-tenant quota
