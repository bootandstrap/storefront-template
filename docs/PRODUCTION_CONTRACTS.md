# Production Contracts & Enforcement

> Last updated: 2026-04-14.

## Contract Dimensions

Every module must satisfy: Feature Flag gate, Plan Limit enforcement, Server-side auth guard, Zod validation, Toast feedback, Error boundary, i18n.

## Module Contracts

| Module | Flag | Limit | Server Enforced |
|--------|------|-------|----------------|
| Catálogo | N/A (essential) | `max_products`, `max_categories`, `max_images_per_product` | ✅ |
| Pedidos | N/A (essential) | `max_orders_month` | ✅ |
| Clientes | N/A (essential) | `max_customers` | ✅ |
| Carrusel | `enable_carousel` | `max_carousel_slides` | ✅ |
| Mensajes | `enable_whatsapp_checkout` | `max_whatsapp_templates` | ✅ |
| Páginas | `enable_cms_pages` | `max_cms_pages` | ✅ |
| Chatbot | `enable_chatbot` | `max_chatbot_messages_month` | ✅ (fail-closed) |
| Insignias | `enable_product_badges` | `max_badges` | ✅ |
| CRM | `enable_crm` | `max_crm_contacts` | ✅ |
| POS | `enable_pos` | N/A | ✅ |
| Email | `enable_email_notifications` | `max_email_sends_month` | ✅ |

## Server-Enforced Flags (20+)

Key enforcement points: `checkout/actions.ts` (payment flags), `registro/actions.ts` (registration), `checkout/page.tsx` (guest/auth), `paginas/[slug]/page.tsx` (CMS), `/api/cart/promotions`, `/api/newsletter`, `/api/chat`, `(shop)/layout.tsx` (maintenance), `(panel)/layout.tsx` (panel), panel pages (module gates).

## Server-Enforced Limits (14)

`max_products`, `max_customers`, `max_orders_month`, `max_categories`, `max_images_per_product`, `max_cms_pages`, `max_carousel_slides`, `max_whatsapp_templates`, `max_badges`, `max_newsletter_subscribers`, `max_chatbot_messages_month`, `max_file_upload_mb`, `max_email_sends_month`, `max_api_calls_day`.

**Open items**: `max_admin_users` (display-only, needs invitation enforcement), `storage_limit_mb` (per-file enforced, aggregate not).
