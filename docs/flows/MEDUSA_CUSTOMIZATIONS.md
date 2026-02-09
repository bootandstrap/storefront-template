# Medusa Customizations

> Custom modules, subscribers, workflows, and API routes for the Campifrut template.

## Custom Modules

### 1. Supabase Auth Provider (`src/modules/supabase-auth/`) ✅

**Purpose**: Bridges Supabase Auth with Medusa's auth system.

- Extends `AbstractAuthModuleProvider`
- `authenticate()`: extracts JWT from header/body → `supabase.auth.getUser(token)` → creates/retrieves AuthIdentity
- `register()`: delegates to `authenticate()` (Supabase handles registration)
- Registered in `medusa-config.ts` as `authProviders` with `id: "supabase"`

### 2. Supabase Storage Provider (`src/modules/supabase-storage/`) ✅

**Purpose**: Uses Supabase Storage as Medusa's file provider.

- Extends `AbstractFileProviderService`
- All methods: `upload()`, `delete()`, `getAsBuffer()`, `getDownloadStream()`, `getUploadStream()`, `getPresignedDownloadUrl()`, `getPresignedUploadUrl()`
- Uploads to `product-images` bucket
- Returns Supabase Storage public CDN URLs
- Registered as `fileProviders` with `id: "supabase-storage"`

## Custom Subscribers (`src/subscribers/`)

### `order-placed.ts` (planned)
- **Listens to**: `order.placed`
- **Actions**:
  1. Sends confirmation email via Resend
  2. If WhatsApp order, sends notification to admin
  3. Writes `analytics_events` record to Supabase
  4. Broadcasts via Supabase Realtime for admin dashboard

### `stock-updated.ts` (planned)
- **Listens to**: `inventory-item.updated`
- **Actions**: broadcasts stock status changes via Realtime

## Custom Workflows (`src/workflows/`)

### `whatsapp-checkout.ts` (planned)
- **Steps**:
  1. `validate-cart` — Ensure cart has items, prices are current
  2. `create-pending-order` — Create order with status `pending`
  3. `build-whatsapp-message` — Use template engine with stored template
  4. `return-whatsapp-url` — Return `wa.me` deep link
- **Compensation**: marks order as `cancelled` on failure

## Custom API Routes (`src/api/`)

### `POST /store/whatsapp-order` (planned)
- Receives cart ID + customer info
- Triggers `whatsapp-checkout` workflow
- Returns WhatsApp URL + order ID

## Storefront — Authenticated Medusa Client (`lib/medusa/auth-medusa.ts`) ✅

**Purpose**: Customer-specific operations (orders, addresses) require authentication. The authenticated fetcher reads the Supabase JWT from server-side cookies and passes it as a Bearer token to the Medusa Store API.

### How It Works

```
Supabase Cookie → extract access_token → Bearer header → Medusa Store API
```

- Reads `sb-*-auth-token` from `next/headers` cookies
- Sends as `Authorization: Bearer <token>` to Medusa's `/store/*` endpoints
- Medusa's `supabase-auth` module validates the JWT and resolves the customer
- Retry with doubled timeout on first failure

### Available Functions

| Function | Endpoint | Returns |
|----------|----------|---------|
| `getAuthCustomerOrders(limit, offset)` | `GET /store/orders` | Paginated orders |
| `getAuthOrder(id)` | `GET /store/orders/:id` | Single order detail |
| `getAuthCustomerAddresses()` | `GET /store/customers/me/addresses` | All addresses |
| `createAuthAddress(data)` | `POST /store/customers/me/addresses` | New address |
| `updateAuthAddress(id, data)` | `POST /store/customers/me/addresses/:id` | Updated address |
| `deleteAuthAddress(id)` | `DELETE /store/customers/me/addresses/:id` | — |

### Types (from `client.ts`)

Key types used by the authenticated fetcher:
- `MedusaAddress` — all string fields are `string | null`
- `MedusaOrderItem` — uses `variant_title` (not `variant.title`)
- `MedusaFulfillment`, `MedusaPayment` — for order detail rendering

## Seed Script (`src/scripts/seed.ts`) ✅

Campifrut-specific seed with:
- 5 categories: Cítricos, Frutas Tropicales, Frutas de Temporada, Cajas Surtidas, Productos Artesanales
- 13 products with Spanish descriptions, weight-based variants, EUR pricing
- Template-configurable via env vars (`STORE_NAME`, `STORE_CURRENCY`, `STORE_COUNTRY`)

**Idempotent** — safe to run multiple times. Each section checks for existing data before creating:
- Region, tax region, stock location, fulfillment set, categories, products, inventory levels
- Link operations (sales channel ↔ stock location, API key) wrapped in try-catch

## Configuration (`medusa-config.ts`) ✅

```typescript
defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // NOTE: Do NOT set databaseSchema — all tables live in public schema
    redisUrl: process.env.REDIS_URL,
  },
  modules: [
    { resolve: "./src/modules/supabase-auth",    // Auth provider
      id: "supabase", options: { ... } },
    { resolve: "./src/modules/supabase-storage", // File provider
      id: "supabase-storage", options: { ... } },
  ]
})
```
