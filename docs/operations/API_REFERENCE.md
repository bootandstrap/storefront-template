# API Reference

> Custom endpoints and server actions exposed by the BootandStrap template.

---

## Custom API Routes

### `POST /api/webhooks/stripe`

Handles Stripe payment events. Configured in Stripe dashboard to receive:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Mark order as paid |
| `payment_intent.payment_failed` | Mark order as payment failed |

**Headers**: `stripe-signature` (required, validated against `STRIPE_WEBHOOK_SECRET`)

**Response**: `200 OK` or `400 Bad Request`

---

### `GET /auth/callback`

OAuth callback handler for Supabase Auth. Handles all OAuth providers (Google, GitHub, etc.).

**Query Params**: Managed by Supabase Auth — `code`, `error`, `error_description`

**Behavior**: Exchanges auth code for session, redirects to `/[lang]/` on success or `/[lang]/login?error=...` on failure.

---

## Server Actions

### Cart Actions (`app/[lang]/(shop)/` scope)

| Action | File | Description |
|--------|------|-------------|
| `addToCart(productId, variantId, quantity)` | Cart components | Adds item to Medusa cart |
| `updateCartItem(lineId, quantity)` | CartDrawer | Updates line item quantity |
| `removeCartItem(lineId)` | CartDrawer | Removes line item |

### Auth Actions (`app/[lang]/(auth)/` scope)

| Action | File | Description |
|--------|------|-------------|
| `signInWithEmail(email, password)` | LoginForm | Supabase email auth |
| `signUpWithEmail(email, password, name)` | RegisterForm | Creates Supabase user + Medusa customer |
| `signOut()` | Header | Destroys Supabase session |

### Account Actions (`app/[lang]/(shop)/cuenta/` scope)

| Action | File | Description |
|--------|------|-------------|
| `updateProfile(data)` | Profile page | Updates name, phone, avatar |
| `createAddress(data)` | Address modal | Creates Medusa shipping address |
| `updateAddress(id, data)` | Address modal | Updates existing address |
| `deleteAddress(id)` | Address card | Deletes address |

### Config Actions (System)

| Action | File | Description |
|--------|------|-------------|
| `revalidateConfig()` | `lib/config.ts` | Clears in-memory TTL cache + revalidates path |
| `revalidatePanel(scope)` | `lib/revalidate.ts` | Revalidates panel, storefront, or both (`'panel'` / `'storefront'` / `'all'`) |
| `setLocaleCookie(locale)` | `lib/i18n/actions.ts` | Sets locale preference cookie |
| `setCurrencyCookie(currency)` | `lib/i18n/actions.ts` | Sets currency preference cookie |

### Owner Panel Actions (`app/[lang]/(panel)/panel/` scope)

All actions validate auth via `requirePanelAuth()` (owner/super_admin) and call `revalidatePanel()` on success.

#### Catalog — Products (`panel/productos/actions.ts`)

| Action | Description |
|--------|-------------|
| `createProduct(data)` | Creates product with variants/prices via Medusa Admin API |
| `updateProduct(id, data)` | Updates product fields + variant prices |
| `removeProduct(id)` | Deletes product from Medusa |
| `uploadProductImage(productId, formData)` | Uploads image (5MB limit, JPEG/PNG/WebP/GIF), appends to product |
| `removeProductImage(productId, imageUrl)` | Removes specific image from product |

#### Catalog — Categories (`panel/categorias/actions.ts`)

| Action | Description |
|--------|-------------|
| `createCategory(data)` | Creates category with auto-slug via Medusa Admin API |
| `editCategory(id, data)` | Updates category name/description/handle |
| `removeCategory(id)` | Deletes category from Medusa |

#### Orders (`panel/pedidos/actions.ts`)

| Action | Description |
|--------|-------------|
| `fulfillOrder(orderId)` | Creates fulfillment for all items via Medusa Admin API |
| `cancelOrder(orderId)` | Cancels order via Medusa Admin API |

#### Carousel (`panel/carrusel/actions.ts`)

| Action | Description |
|--------|-------------|
| `createSlide(data)` | Creates carousel slide in Supabase |
| `updateSlide(id, data)` | Updates slide content/order |
| `deleteSlide(id)` | Removes slide |

#### WhatsApp Templates (`panel/mensajes/actions.ts`)

| Action | Description |
|--------|-------------|
| `createTemplate(data)` | Creates WhatsApp message template |
| `updateTemplate(id, data)` | Updates template content |
| `deleteTemplate(id)` | Removes template |

#### CMS Pages (`panel/paginas/actions.ts`)

| Action | Description |
|--------|-------------|
| `createPage(data)` | Creates CMS page with auto-slug |
| `updatePage(id, data)` | Updates page content |
| `deletePage(id)` | Removes page |
| `togglePagePublish(id, published)` | Toggles publish status |

#### Badges (`panel/insignias/actions.ts`)

| Action | Description |
|--------|-------------|
| `toggleBadge(productId, badge, enabled)` | Adds/removes badge from product metadata |

#### Store Config (`panel/tienda/actions.ts`)

| Action | Description |
|--------|-------------|
| `saveStoreConfig(data)` | Updates store configuration (name, contact, social, etc.) |

---

## Custom API Routes (Additional)

### `GET /api/health/live`
Kubernetes liveness probe. Returns `200 OK` when the process is running.

### `GET /api/health/ready`
Kubernetes readiness probe. Checks Supabase + Medusa connectivity.

### `POST /api/analytics`
Records analytics events. Requires valid session.

### `POST /api/revalidate`
On-demand revalidation endpoint. Triggers `revalidateConfig()` + `revalidatePath()`.

---

## Medusa Store API

The storefront communicates with Medusa v2 Store API at `MEDUSA_BACKEND_URL`. Key endpoints used:

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/store/products` | GET | Product listing with pagination |
| `/store/products/:id` | GET | Product detail with variants |
| `/store/product-categories` | GET | Category listing |
| `/store/carts` | POST | Create cart |
| `/store/carts/:id` | GET | Get cart |
| `/store/carts/:id/line-items` | POST | Add to cart |
| `/store/carts/:id/line-items/:lineId` | POST/DELETE | Update/remove item |
| `/store/orders` | GET | List customer orders |
| `/store/orders/:id` | GET | Order detail |
| `/store/customers/me` | GET | Current customer profile |
| `/store/customers/me/addresses` | GET/POST | Address management |

**Authentication**: All authenticated requests include `Authorization: Bearer <supabase-jwt>` header. Medusa validates JWTs via the custom `supabase-auth` module.

---

## Medusa Admin API (Owner Panel)

The Owner Panel calls Medusa Admin API via `lib/medusa/admin.ts` with JWT auth. Key endpoints:

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/admin/products` | GET/POST | Product CRUD |
| `/admin/products/:id` | GET/POST/DELETE | Product detail/update/delete |
| `/admin/products/:id/variants/:vid/prices` | POST | Variant price update |
| `/admin/product-categories` | GET/POST | Category CRUD |
| `/admin/product-categories/:id` | POST/DELETE | Category update/delete |
| `/admin/orders` | GET | Order listing |
| `/admin/orders/:id` | GET | Order detail |
| `/admin/orders/:id/fulfillments` | POST | Create fulfillment |
| `/admin/orders/:id/cancel` | POST | Cancel order |
| `/admin/customers` | GET | Customer listing |
| `/admin/uploads` | POST | File upload (images) |

**Authentication**: JWT via `POST /auth/user/emailpass` with `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`. Token cached in-memory for 23h with auto-retry on 401.

---

## Supabase Tables (Governance)

Used by the storefront's `lib/config.ts` and related utilities:

| Table | Read By | Written By |
|-------|---------|------------|
| `config` | Storefront (getConfig) | SuperAdmin, Owner Panel |
| `feature_flags` | Storefront (isFeatureEnabled) | SuperAdmin |
| `plan_limits` | Storefront (checkLimit) | SuperAdmin |
| `whatsapp_templates` | Storefront (WhatsApp checkout) | Owner Panel |
| `carousel_slides` | Storefront (homepage) | Owner Panel |
| `cms_pages` | Storefront (CMS routes) | Owner Panel |
| `profiles` | Auth flow | Supabase Auth triggers |
| `audit_log` | — | SuperAdmin |
| `stripe_webhook_events` | — | Storefront (webhook dedup) |
