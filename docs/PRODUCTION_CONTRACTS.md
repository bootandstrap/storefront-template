# Production Contracts & Enforcement Catalog

> Consolidated from: production-contracts.md + flag-limit-enforcement-catalog.md.
> Last updated: 2026-03-03.

## Contract Dimensions

Every module must satisfy: Feature Flag gate, Plan Limit enforcement, Server-side auth guard, Zod validation, Toast feedback, Error boundary, i18n.

## Module Contracts Summary

| Module | Flag | Limit | Server Enforced | Status |
|--------|------|-------|----------------|--------|
| Catálogo (Products) | N/A (essential) | `max_products`, `max_categories`, `max_images_per_product` | ✅ | Production |
| Pedidos (Orders) | N/A (essential) | `max_orders_month` (tenant-scoped) | ✅ | Production |
| Clientes (Customers) | N/A (essential) | `max_customers` | ✅ | Production |
| Tienda (Config) | N/A (essential) | N/A | ✅ | Production |
| Carrusel | `enable_carousel` | `max_carousel_slides` | ✅ | Production |
| Mensajes (WhatsApp) | `enable_whatsapp_checkout` | `max_whatsapp_templates` | ✅ | Production |
| Páginas (CMS) | `enable_cms_pages` | `max_cms_pages` | ✅ | Production |
| Analíticas | `enable_analytics` | N/A | ✅ | Production |
| Chatbot | `enable_chatbot` | `max_chatbot_messages_month` | ✅ (fail-closed + rate-limit) | Production |
| Devoluciones | `enable_self_service_returns` | N/A | ✅ (`shouldAllowPanelRoute`) | Production |
| Insignias | `enable_product_badges` | `max_badges` | ✅ | Production |

---

## Feature Flag Enforcement (44 flags)

### Server-Enforced (20 flags) ✅

| Flag | Enforcement Point |
|------|-------------------|
| `enable_whatsapp_checkout` | `checkout/actions.ts` |
| `enable_online_payments` | `checkout/actions.ts` |
| `enable_cash_on_delivery` | `checkout/actions.ts` |
| `enable_bank_transfer` | `checkout/actions.ts` |
| `enable_user_registration` | `registro/actions.ts` + page |
| `enable_guest_checkout` | `checkout/page.tsx` RSC redirect |
| `require_auth_to_order` | `checkout/page.tsx` RSC redirect |
| `enable_cms_pages` | `paginas/[slug]/page.tsx` |
| `enable_promotions` | `/api/cart/promotions` via `requireFlag()` |
| `enable_newsletter` | `/api/newsletter` (fail-closed) |
| `enable_maintenance_mode` | `(shop)/layout.tsx` blocks store |
| `enable_owner_panel` | `(panel)/layout.tsx` redirect |
| `enable_customer_accounts` | `cuenta/layout.tsx` redirect |
| `enable_order_tracking` | `cuenta/pedidos/page.tsx` redirect |
| `enable_chatbot` | `/api/chat` + panel page |
| `enable_self_service_returns` | Panel devoluciones page |
| `owner_lite_enabled` | `panel-modules.ts` |
| `owner_advanced_modules_enabled` | `panel-modules.ts` + `panel-route-guards.ts` |
| `enable_ecommerce` | Root module gate (Flag 44/44) |

### UI-Gated Only (24 flags) 🟡

`enable_google_auth`, `enable_email_auth`, `enable_reviews`, `enable_wishlist`, `enable_carousel`, `enable_product_search`, `enable_related_products`, `enable_product_comparisons`, `enable_product_badges`, `enable_analytics`, `enable_multi_language`, `enable_multi_currency`, `enable_admin_api`, `enable_social_links`, `enable_order_notes`, `enable_address_management`, `enable_cookie_consent`, `enable_whatsapp_contact`, `enable_email_notifications`, `enable_abandoned_cart_emails`, `enable_email_campaigns`, `enable_email_templates`, `enable_crm_segmentation`, `enable_crm_export`

---

## Plan Limit Enforcement (25 limits)

### Server-Enforced (14 limits) ✅

| Limit | Enforcement Point |
|-------|-------------------|
| `max_products` | `productos/actions.ts` + page |
| `max_customers` | `registro/actions.ts` + page |
| `max_orders_month` | `checkout/actions.ts` (tenant-scoped via `sales_channel_id`) |
| `max_categories` | `categorias/actions.ts` + page |
| `max_images_per_product` | `productos/actions.ts` (upload) |
| `max_cms_pages` | `paginas/actions.ts` + page |
| `max_carousel_slides` | `carrusel/actions.ts` + page |
| `max_whatsapp_templates` | `mensajes/actions.ts` + page |
| `max_badges` | `insignias/actions.ts` |
| `max_newsletter_subscribers` | `/api/newsletter` (fail-closed) |
| `max_chatbot_messages_month` | `/api/chat` (`checkChatQuota()`, fail-closed + 10 req/min) |
| `max_file_upload_mb` | `productos/actions.ts` (per-file) |
| `max_email_sends_month` | `email-automations.ts` |
| `max_api_calls_day` | `rate-limit-tenant.ts` `checkTrafficCapacity()` |

### Display-Only (3 limits)

`max_admin_users`, `storage_limit_mb`, `max_custom_domains` — shown in dashboard `UsageMeter`, no server block.

### Open Items

- **`max_admin_users`**: Enforce at user invitation (currently display-only)
- **`storage_limit_mb`**: Enforce aggregate at upload time (per-file enforced, aggregate not)

---

## Test Suites (5 automated)

| Suite | Validates |
|-------|----------|
| Checkout Multi-Method | Flags ↔ payment methods, `order_placed` emission, tenant scope |
| Chat Anti-Abuse | Rate-limit, server-side quota, fail-closed, payload |
| Owner Lite Gating | 5 essential + 7 advanced routes |
| Webhook Idempotency | `claimEvent`, critical/non-critical paths |
| Revalidation & Governance | Migration paths, schema cutoff, tenant scope |
