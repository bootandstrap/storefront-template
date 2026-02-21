# Medusa Customizations

> Custom modules, subscribers, workflows, and API routes for the E-Commerce Template template.

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

E-Commerce Template-specific seed with:
- 5 categories: Cítricos, Frutas Tropicales, Frutas de Temporada, Cajas Surtidas, Productos Artesanales
- 13 products with Spanish descriptions, weight-based variants, EUR pricing
- Template-configurable via env vars (`STORE_NAME`, `STORE_CURRENCY`, `STORE_COUNTRY`)

**Idempotent** — safe to run multiple times. Each section checks for existing data before creating:
- Region, tax region, stock location, fulfillment set, categories, products, inventory levels
- Link operations (sales channel ↔ stock location, API key) wrapped in try-catch

## Owner Panel — Medusa Admin API Client (`lib/medusa/admin.ts`) ✅

**Purpose**: The Owner Panel manages catalog, orders, and customers directly through the Medusa Admin API. A dedicated helper (`admin.ts`) handles authentication and provides typed functions.

### Authentication Flow

```
Server Action → getAdminToken() → POST /auth/user/emailpass
             → JWT (24h validity, cached 23h)
             → Authorization: Bearer <token>
             → Admin API endpoints
```

- Env vars: `MEDUSA_ADMIN_EMAIL` + `MEDUSA_ADMIN_PASSWORD`
- Auto-retry on 401 (token refresh)
- In-memory token cache with 23h TTL

### Available Functions

| Function | Endpoint | Returns |
|----------|----------|---------|
| `getAdminProducts(limit, offset)` | `GET /admin/products` | Paginated product list |
| `getAdminProduct(id)` | `GET /admin/products/:id` | Single product detail |
| `createAdminProduct(data)` | `POST /admin/products` | New product |
| `updateAdminProduct(id, data)` | `POST /admin/products/:id` | Updated product |
| `deleteAdminProduct(id)` | `DELETE /admin/products/:id` | — |
| `getProductCount()` | `GET /admin/products` | Total count |
| `getAdminCategories(limit, offset)` | `GET /admin/product-categories` | Category list |
| `createAdminCategory(data)` | `POST /admin/product-categories` | New category |
| `updateAdminCategory(id, data)` | `POST /admin/product-categories/:id` | Updated category |
| `deleteAdminCategory(id)` | `DELETE /admin/product-categories/:id` | — |
| `getAdminOrders(limit, offset)` | `GET /admin/orders` | Paginated order list |
| `getAdminOrderDetail(id)` | `GET /admin/orders/:id` | Order with items + fulfillments |
| `createOrderFulfillment(orderId)` | `POST /admin/orders/:id/fulfillments` | New fulfillment |
| `cancelAdminOrder(orderId)` | `POST /admin/orders/:id/cancel` | Cancelled order |
| `getAdminCustomers(limit, offset)` | `GET /admin/customers` | Customer list |
| `getCustomerCount()` | `GET /admin/customers` | Total count |
| `uploadFiles(formData)` | `POST /admin/uploads` | Uploaded file URLs |
| `updateProductImages(id, images)` | `POST /admin/products/:id` | Updated images array |
| `deleteProductImage(id, url)` | `POST /admin/products/:id` | Filtered images array |
| `updateVariantPrices(prodId, varId, prices)` | `POST /admin/products/:id/variants/:vid/prices` | Updated prices |

### Server Actions (8 `actions.ts` files)

Each panel module has its own `actions.ts` that calls `admin.ts` helpers:
- `panel/productos/actions.ts` — Product CRUD + image upload/delete
- `panel/categorias/actions.ts` — Category CRUD
- `panel/pedidos/actions.ts` — Order fulfill/cancel
- `panel/carrusel/actions.ts` — Carousel slide CRUD (Supabase)
- `panel/mensajes/actions.ts` — WhatsApp template CRUD (Supabase)
- `panel/paginas/actions.ts` — CMS page CRUD (Supabase)
- `panel/insignias/actions.ts` — Badge toggle (Medusa metadata)
- `panel/tienda/actions.ts` — Store config save (Supabase)

All mutations call `revalidatePanel()` for instant UI refresh across panel + storefront.

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
