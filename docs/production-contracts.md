# Production Contracts by Module

> **Purpose**: Defines the minimum guarantees each module must satisfy before being considered production-ready.
> **Updated**: 2026-02-20 (Post Production Readiness Remediation)

---

## Contract Structure

Every module must satisfy these dimensions:

| Dimension | Description |
|-----------|-------------|
| **Feature Flag** | Which flag(s) gate this module |
| **Plan Limit** | Which limit(s) control capacity |
| **Server Enforcement** | Flag checked in server action/component (not just UI) |
| **Limit Enforcement** | `checkLimit()` called before creation mutations |
| **Auth Guard** | Role check (owner/super_admin) required |
| **Panel Guard** | Advanced route guard if applicable |
| **Validation** | Zod schema on all mutations |
| **Toast Feedback** | User sees success/error toast after actions |
| **Error Boundary** | `error.tsx` catches rendering failures |
| **i18n** | All strings from dictionary |

---

## Module Contracts

### 1. Catálogo (Products + Categories)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | N/A | Essential module (always visible) |
| Plan Limit | `max_products`, `max_categories`, `max_images_per_product` | |
| Server Enforcement | ✅ | Essential route — always allowed |
| Limit Enforcement | ✅ | `productos/actions.ts`, `categorias/actions.ts` |
| Auth Guard | ✅ | `(panel)/layout.tsx` → `isPanelRole()` |
| Panel Guard | ✅ | Essential route |
| Validation | ✅ | Zod schemas in action files |
| Toast Feedback | ✅ | All action handlers |
| Error Boundary | ✅ | `error.tsx` in panel routes |
| i18n | ✅ | Dictionary keys in `panel.*` |

---

### 2. Pedidos (Orders)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | N/A | Essential module |
| Plan Limit | `max_orders_month` | |
| Server Enforcement | ✅ | Checkout validates order count |
| Limit Enforcement | ✅ | `checkout/actions.ts` — **tenant-scoped via `sales_channel_id`** (C1 fix) |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | Essential route |
| Validation | ✅ | Zod schemas in action files |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 3. Clientes (Customers)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | N/A | Essential module |
| Plan Limit | `max_customers` | |
| Server Enforcement | ✅ | Registration action checks flag + limit |
| Limit Enforcement | ✅ | `registro/actions.ts` |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | Essential route |
| Validation | ✅ | |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 4. Tienda (Store Config)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | N/A | Essential module |
| Plan Limit | N/A | |
| Server Enforcement | ✅ | |
| Limit Enforcement | N/A | |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | Essential route |
| Validation | ✅ | Zod in tienda actions |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 5. Carrusel (Carousel) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_carousel` | |
| Plan Limit | `max_carousel_slides` | |
| Server Enforcement | ✅ | `panel-modules.ts` gates visibility |
| Limit Enforcement | ✅ | `carrusel/actions.ts` |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | ✅ | |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 6. Mensajes (WhatsApp Templates) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_whatsapp_checkout` | |
| Plan Limit | `max_whatsapp_templates` | |
| Server Enforcement | ✅ | |
| Limit Enforcement | ✅ | `mensajes/actions.ts` |
| Auth Guard | ✅ | |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | ✅ | |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 7. Páginas (CMS Pages) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_cms_pages` | |
| Plan Limit | `max_cms_pages` | |
| Server Enforcement | ✅ | Public route + panel both check flag |
| Limit Enforcement | ✅ | `paginas/actions.ts` |
| Auth Guard | ✅ | |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | ✅ | |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 8. Analíticas (Analytics) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_analytics` | |
| Plan Limit | N/A | |
| Server Enforcement | ✅ | `analiticas/page.tsx` checks flag |
| Limit Enforcement | N/A | |
| Auth Guard | ✅ | |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | N/A | Read-only dashboard |
| Toast Feedback | N/A | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

> **Note**: Analytics funnel now uses real data from `analytics_events` table (C4 fix). `order_placed` emitted in all 4 checkout paths.

---

### 9. Chatbot (ChatbotPRO) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_chatbot` | |
| Plan Limit | `max_chatbot_messages_month` | |
| Server Enforcement | ✅ | `/api/chat` route checks flag + quota |
| Limit Enforcement | ✅ | `checkChatQuota()` before LLM — **fail-closed** + **10 req/min server-side rate-limit** (C2 fix) |
| Auth Guard | ✅ | Panel layout for config page |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | ✅ | `request-schema.ts` Zod |
| Toast Feedback | ✅ | Chat UI inline feedback |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 10. Devoluciones (Returns) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_self_service_returns` | |
| Plan Limit | N/A | |
| Server Enforcement | ✅ | `devoluciones/page.tsx` uses `shouldAllowPanelRoute()` central guard (H1 fix) |
| Limit Enforcement | N/A | |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set — uses central `shouldAllowPanelRoute` (H1 fix) |
| Validation | ✅ | |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

### 11. Insignias (Badges) — Advanced

| Dimension | Status | Notes |
|-----------|--------|-------|
| Feature Flag | `enable_product_badges` (indirect) | |
| Plan Limit | `max_badges` | ⚠️ Not enforced |
| Server Enforcement | 🟡 | Redirect to catalogo; no standalone flag check |
| Limit Enforcement | ⚠️ | `max_badges` in type but no `checkLimit()` call |
| Auth Guard | ✅ | Panel layout |
| Panel Guard | ✅ | `ADVANCED_ROUTES` set |
| Validation | ✅ | Via catalogo actions |
| Toast Feedback | ✅ | |
| Error Boundary | ✅ | |
| i18n | ✅ | |

---

## Modules NOT Production-Ready

| Module | Missing |
|--------|---------|
| **Insignias** | `max_badges` limit not enforced server-side |
| **Analytics** | `trackEvent()` calls are fire-and-forget; no guaranteed delivery |

## Checkout Flows (Cross-Module)

| Flow | Flag | Server Enforcement | Limit | Notes |
|------|------|-------------------|-------|-------|
| Stripe | `enable_online_payments` | ✅ | `max_orders_month` | Full server check |
| WhatsApp | `enable_whatsapp_checkout` | ✅ | `max_orders_month` | `submitWhatsAppOrder` (C1 fix) |
| Bank Transfer | `enable_bank_transfer` | ✅ | `max_orders_month` | |
| Cash on Delivery | `enable_cash_on_delivery` | ✅ | `max_orders_month` | |

## Customer-Facing Modules

| Module | Flag | Server Enforcement | Notes |
|--------|------|-------------------|-------|
| Customer Accounts | `enable_customer_accounts` | ✅ | `cuenta/layout.tsx` redirects |
| Order Tracking | `enable_order_tracking` | ✅ | `pedidos/page.tsx` checks |
| Wishlist | `enable_wishlist` | 🟡 | UI-only gating |
| Reviews | `enable_reviews` | 🟡 | UI-only gating |
| Newsletter | `enable_newsletter` | 🟡 | UI-only gating |

---

## Production Contract Test Suites

5 automated test suites validate critical production invariants (`pnpm test:run`):

| Suite | File | Validates |
|-------|------|----------|
| Checkout Multi-Method | `production-contract-checkout.test.ts` | Feature flags ↔ payment methods, `order_placed` emission, tenant scope |
| Chat Anti-Abuse | `production-contract-chat.test.ts` | Rate-limit config, visitor server-side quota, fail-closed, payload restrictions |
| Owner Lite Gating | `production-contract-owner-lite.test.ts` | 5 essential + 7 advanced routes, `devoluciones`+`chatbot` coverage |
| Webhook Idempotency | `production-contract-webhook.test.ts` | Fail-closed `claimEvent`, critical/non-critical paths, analytics |
| Revalidation & Governance | `production-contract-revalidation.test.ts` | Migration paths (filesystem), schema cutoff, tenant scope mechanism |
