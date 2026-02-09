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
| `setLocaleCookie(locale)` | `lib/i18n/actions.ts` | Sets locale preference cookie |
| `setCurrencyCookie(currency)` | `lib/i18n/actions.ts` | Sets currency preference cookie |

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

## Supabase Tables (Governance)

Used by the storefront's `lib/config.ts` and related utilities:

| Table | Read By | Written By |
|-------|---------|------------|
| `config` | Storefront (getConfig) | SuperAdmin, Owner Panel |
| `feature_flags` | Storefront (isFeatureEnabled) | SuperAdmin |
| `plan_limits` | Storefront (checkLimit) | SuperAdmin |
| `tenants` | SuperAdmin | SuperAdmin |
| `whatsapp_templates` | Storefront (WhatsApp checkout) | Owner Panel |
| `profiles` | Auth flow | Supabase Auth triggers |
