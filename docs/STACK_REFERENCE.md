# Stack Reference — Campifrut v2 (SOTA)

> **Purpose**: Quick reference for every technology in the Campifrut v2 stack + SOTA patterns. Updated Feb 2026.

---

## 1. Medusa.js v2 (v2.13.1)

**Role**: Headless e-commerce engine — catalog, cart, checkout, orders, inventory, payments.

**Official Docs**: [docs.medusajs.com/learn](https://docs.medusajs.com/learn)

### Key Concepts

| Concept | Description |
|---|---|
| **Modules** | Reusable packages of functionality for a single domain. Created in `src/modules/<name>/`. Each module has a data model, service, and index.ts definition. Services extend `MedusaService()` for auto-generated CRUD. |
| **Workflows** | Durable execution chains with step-by-step orchestration, rollback support, and async capabilities. Created in `src/workflows/`. Steps have compensation (rollback) logic. |
| **API Routes** | REST endpoints in `src/api/<path>/route.ts`. Export handler functions (`GET`, `POST`, etc.) using `MedusaRequest`/`MedusaResponse` types. |
| **Subscribers** | Event listeners in `src/subscribers/`. Listen to Medusa events like `order.placed`, `inventory-item.updated`. |
| **Links** | Cross-module relationships in `src/links/`. Connect entities between different modules. |
| **Admin SDK** | Custom admin UI widgets/pages via `src/admin/`. |

### Module Structure (Custom Module Pattern)

```
src/modules/<module-name>/
├── index.ts      # Module definition: Module("<name>", { service })
├── service.ts    # Extends MedusaService({ Model }) or custom class
└── models/       # Data models (optional if no DB tables)
    └── <model>.ts
```

### Creating a Module Service

```typescript
// For modules WITH data models:
import { MedusaService } from "@medusajs/framework/utils"
import MyModel from "./models/my-model"
class MyModuleService extends MedusaService({ MyModel }) {}

// For modules WITHOUT data models (integrations):
// Just create a plain class, no need to extend MedusaService
class MyIntegrationService {
  async authenticate() { /* ... */ }
}
```

### Module Definition

```typescript
import { Module } from "@medusajs/framework/utils"
import MyModuleService from "./service"
export const MY_MODULE = "my-module"
export default Module(MY_MODULE, { service: MyModuleService })
```

### Registering in medusa-config.ts

```typescript
module.exports = defineConfig({
  modules: {
    authProviders: [{ resolve: "./src/modules/supabase-auth", id: "supabase" }],
    fileProviders: [{ resolve: "./src/modules/supabase-storage", id: "supabase-storage" }],
  }
})
```

### API Route Pattern

```typescript
// src/api/custom/<path>/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // Access container: req.scope.resolve("myModuleService")
  res.json({ success: true })
}
```

### Workflow Pattern

```typescript
import { createStep, createWorkflow, StepResponse } from "@medusajs/framework/workflows-sdk"

const myStep = createStep("my-step", async (input, { container }) => {
  // Step logic
  return new StepResponse(result, compensationData)
}, async (compensationData, { container }) => {
  // Rollback logic
})

const myWorkflow = createWorkflow("my-workflow", (input) => {
  const result = myStep(input)
  return result
})
```

### Medusa Store API (Key Endpoints)

| Endpoint | Purpose |
|---|---|
| `GET /store/products` | List products (requires publishable API key) |
| `GET /store/products/:id` | Get product details |
| `POST /store/carts` | Create cart |
| `POST /store/carts/:id/line-items` | Add item to cart |
| `DELETE /store/carts/:id/line-items/:item_id` | Remove item |
| `POST /store/carts/:id/complete` | Complete checkout |
| `GET /store/product-categories` | List categories |
| `GET /store/orders` | List customer orders (auth required) |
| `GET /store/orders/:id` | Get order detail (auth required) |
| `GET /store/customers/me/addresses` | List customer addresses |
| `POST /store/customers/me/addresses` | Create address |
| `POST /store/customers/me/addresses/:id` | Update address |
| `DELETE /store/customers/me/addresses/:id` | Delete address |

### Project-Specific Config

```typescript
// medusa-config.ts
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // NOTE: Do NOT set databaseSchema — all tables in public schema
    redisUrl: process.env.REDIS_URL,
    workerMode: "shared",
    http: {
      storeCors: "http://localhost:3000",
      adminCors: "http://localhost:3000,http://localhost:5173",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
})
```

---

## 2. Supabase Cloud

**Role**: Auth, PostgreSQL (shared DB), Storage (CDN), Realtime, Edge Functions.

**Official Docs**: [supabase.com/docs](https://supabase.com/docs)

### Auth with Next.js SSR (`@supabase/ssr`)

**Packages**: `@supabase/supabase-js`, `@supabase/ssr`

#### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Safe to ignore in Server Components — middleware handles refresh
          }
        },
      },
    }
  )
}
```

#### Proxy (`proxy.ts` — NOT middleware.ts)

> **CRITICAL**: Next.js 16 uses `proxy.ts` (replaces deprecated `middleware.ts`). Use `supabase.auth.getClaims()` instead of `getSession()` for server-side JWT validation.

```typescript
// proxy.ts — route protection + session refresh
import { createServerClient } from '@supabase/ssr'

export async function proxy(request) {
  // Public routes: /, /productos/**, /login, /registro, /auth/**
  // Conditional: /checkout/** (protected if require_auth_to_order)
  // Protected: /cuenta/** (always requires session)
  const { data } = await supabase.auth.getClaims()
  // Redirect to /login if needed
}
```

### Storage

```typescript
// Upload to bucket
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(`products/${fileName}`, file, { upsert: true })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('product-images')
  .getPublicUrl(filePath)
```

### Database (RLS Patterns)

```sql
-- Admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Public read, admin write pattern
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON config FOR SELECT USING (true);
CREATE POLICY "Admin write" ON config FOR UPDATE USING (is_admin());
```

---

## 3. Next.js 16 (v16.1.6) — App Router + proxy.ts

**Role**: Storefront SSR layer, Server Components, Server Actions, ISR, Streaming.

**Official Docs**: [nextjs.org/docs](https://nextjs.org/docs)

### Key Patterns for This Project

| Pattern | Usage |
|---|---|
| **Server Components** | Product pages, catalog, homepage — data fetching on server |
| **Server Actions** | `'use server'` functions for cart mutations, auth, checkout |
| **proxy.ts** | Next.js 16 proxy — auth guard via `getClaims()` (replaces middleware.ts) |
| **Dynamic Routes** | `[handle]` for product pages, `[slug]` for CMS pages |
| **Route Groups** | `(shop)`, `(auth)` for logical grouping without URL impact |
| **Dynamic pages** | `force-dynamic` — all API-dependent pages render on-demand |
| **Suspense Streaming** | Independent `<Suspense>` per section, skeleton fallbacks |
| **Error Boundaries** | `error.tsx` at every route, `<ErrorBoundary>` for components |

### Caching Pattern (SOTA — Feb 2026 Update)

> **Note**: `unstable_cache` was removed because it conflicts with `cookies()` in Next.js 16.
> Config now uses an in-memory TTL cache. All API pages use `force-dynamic`.

```typescript
// All API-dependent pages use force-dynamic
export const dynamic = 'force-dynamic' // No build-time prerendering

// In-memory TTL cache for config (avoids unstable_cache + cookies conflict)
let _cachedConfig: AppConfig | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 300_000 // 5 minutes

export async function getConfig(): Promise<AppConfig> {
  const now = Date.now()
  if (_cachedConfig && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedConfig
  }
  const supabase = await createClient()
  // ... fetch from Supabase tables
}

// On-demand revalidation
export async function revalidateConfig() {
  'use server'
  _cachedConfig = null
  _cacheTimestamp = 0
  revalidatePath('/', 'layout')
}
```

### Suspense Streaming Pattern (SOTA)

```tsx
// page.tsx — each section streams independently
import { Suspense } from 'react'

export default function Page() {
  return (
    <>
      <HeroSection />  {/* instant — from cached config */}
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />  {/* async — Medusa API */}
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton />}>
        <FeaturedProducts />  {/* async — Medusa API */}
      </Suspense>
      <TrustSection />  {/* static */}
    </>
  )
}
```

### Error Boundary Pattern (SOTA)

```tsx
// app/(shop)/productos/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <div>
      <h2>Error loading products</h2>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
```

### SEO: JSON-LD Structured Data (SOTA)

```tsx
// In product detail page
export default function ProductPage({ product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.thumbnail,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'COP',
      availability: 'https://schema.org/InStock',
    },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ... product UI */}
    </>
  )
}
```

### Server Action Pattern

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getStoreConfig() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('config').select('*').single()
  if (error) throw error
  return data
}
```

### Medusa API Client Pattern (with retry)

```typescript
// lib/medusa/client.ts
const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

export async function medusaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000) // 3s timeout

  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        ...options?.headers,
      },
    })
    if (!res.ok) throw new Error(`Medusa API error: ${res.status}`)
    return res.json()
  } catch (err) {
    // Retry once on failure
    const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, { ...options })
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}
```

---

## 4. React 19 (v19.2.3)

**Role**: UI rendering with the latest React features.

### Key Features Used

- **Server Components** (default in Next.js App Router)
- **`use()` hook** for consuming promises/context
- **`useActionState()`** for form state with Server Actions
- **`useOptimistic()`** for optimistic UI updates (cart)
- **Suspense boundaries** for streaming/loading states

---

## 5. Tailwind CSS v4

**Role**: Utility-first CSS framework using the new v4 engine.

### v4 Key Differences from v3

- **No `tailwind.config.js`** — configuration via CSS `@theme` directive
- **CSS-first configuration** in your main CSS file
- **Automatic content detection** — no `content` array needed
- **Native `@import`** — no PostCSS `@tailwind` directives

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #2D5016;
  --color-secondary: #8BC34A;
  --color-accent: #FF9800;
  --font-sans: "Inter", sans-serif;
}
```

---

## 6. Redis

**Role**: Event bus, caching, session store for Medusa.

- **Version**: Redis 7 Alpine (via Docker)
- **Port**: 6379
- **Usage**: `REDIS_URL=redis://localhost:6379`
- Medusa uses Redis for event pub/sub (subscribers), cache invalidation, and background job queues

---

## 7. Turborepo

**Role**: Monorepo build system for the pnpm workspace.

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", ".medusa/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- `pnpm dev` → starts all apps concurrently
- `pnpm build` → builds in dependency order

---

## 8. Docker Compose

**Role**: Production container orchestration.

| Service | Image | Port | Purpose |
|---|---|---|---|
| `storefront` | Custom (Next.js standalone) | 3000 | Customer-facing app |
| `medusa-server` | Custom (Medusa) | 9000 | API + Admin panel |
| `medusa-worker` | Custom (Medusa) | — | Background jobs |
| `redis` | `redis:7-alpine` | 6379 | Events, cache |

PostgreSQL is **NOT** in Docker — it's on **Supabase Cloud**.

---

## 9. pnpm (v9.15.4)

**Role**: Fast, disk-space-efficient package manager with workspace support.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## Version Summary

| Component | Version | Notes |
|---|---|---|
| Medusa.js | 2.13.1 | Latest v2 stable |
| Next.js | 16.1.6 | App Router, Server Actions, proxy.ts |
| React | 19.2.3 | Server Components, `use()` hook |
| Tailwind CSS | 4.x | CSS-first config, no JS config file |
| Node.js | 20+ | Required by Medusa |
| pnpm | 9.15.4 | Workspace manager |
| Redis | 7 Alpine | Docker container |
| TypeScript | 5.x | Strict mode |
