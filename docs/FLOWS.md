# Critical Flows

> Consolidated from: AUTH_FLOW.md, CHECKOUT_FLOWS.md, MEDUSA_CUSTOMIZATIONS.md, API_REFERENCE.md.
> Last updated: 2026-03-25.

## 1. Auth Flow (Flag-Driven Providers)

Supabase Auth handles all authentication. Medusa validates Supabase JWTs via custom provider.

### Feature Flags

| Flag | Default | Effect |
|------|---------|--------|
| `enable_email_auth` | `true` | Email/password login |
| `enable_google_auth` | `true` | Google OAuth button |
| `enable_user_registration` | `true` | Registration page |
| `enable_guest_checkout` | `true` | Checkout without account |
| `require_auth_to_order` | `false` | Force login before checkout |

### Flow

```
User → Login page (renders providers from flags)
     → Supabase returns JWT (httpOnly cookie via @supabase/ssr)
     → proxy.ts validates session via getClaims()
     → Server Actions use authenticated Supabase client
     → Medusa API calls include JWT in Authorization header
     → Medusa supabase-auth provider validates JWT → AuthIdentity
```

### Route Protection (proxy.ts)

| Route | Access |
|-------|--------|
| `/[lang]/`, `/[lang]/productos/**` | Public |
| `/[lang]/login`, `/[lang]/registro` | Public |
| `/[lang]/checkout/**` | Conditional (protected if `require_auth_to_order`) |
| `/[lang]/cuenta/**` | Protected (requires login) |
| `/[lang]/panel/**` | Protected (requires `owner` or `super_admin`) |

---

## 2. Checkout Flows (Dynamic N-Method Payment)

Payment methods are **entirely feature-flag driven**. The system renders 1-N methods dynamically.

### Payment Method Flags

| Flag | Method | Priority |
|------|--------|----------|
| `enable_whatsapp_checkout` | WhatsApp order | 10 (highest) |
| `enable_online_payments` | Stripe card | 20 |
| `enable_cash_on_delivery` | COD | 30 |
| `enable_bank_transfer` | Bank transfer | 40 |

### Shared Flow

All methods share `CheckoutModal`: shipping address → method selection → method-specific UI.

**WhatsApp**: validate cart → create pending order → build message from template → open `wa.me` link
**Stripe**: Stripe Elements form → `completeCart()` → PaymentIntent → webhook confirms
**COD**: confirm delivery + notes → create pending order → admin confirms delivery
**Bank Transfer**: show account details → confirm → admin verifies payment

### Adding a New Payment Method

1. Add flag to `feature_flags`: `enable_my_method`
2. Create `components/checkout/MyMethodFlow.tsx`
3. Register in `lib/payment-methods.ts` with id, flag, label, icon, component, priority
4. Done — auto-renders when flag enabled

---

## 3. Owner Panel Onboarding Flow

The panel guides new owners through store setup via a multi-phase process.

### Phase 1: Welcome Wizard (`PanelOnboarding`)

```
First panel visit → PanelOnboarding (3 phases)
  Phase 1: Welcome — business name, locale, currency confirmation
  Phase 2: Language — panel language selection (5 locales)
  Phase 3: Tour — guided walkthrough of panel sections
→ POST /api/panel/onboarding-complete → sets onboarding_completed in governance
```

### Phase 2: Persistent Setup Progress (`SetupProgress`)

After onboarding completes, the dashboard shows a persistent setup widget:

```
store-readiness.ts calculates score (0-100) from:
  ⚙️ Setup   — branding, contact info, payment methods, domain
  📝 Content — products, categories, images
  💰 Sales   — first order, shipping config
  📈 Growth  — modules activated, maintenance off

SetupProgress widget → collapsible (localStorage), never permanently dismissed
  → Shows module upsell badges for gated checks
  → Celebrates at 100% with animation, then auto-collapses
  → Re-accessible via StoreHealthCard "Replay Tour" + "Language" buttons
  → Topbar nudge shows "X steps left" when score < 60
```

### Re-Access Points

| Entry Point | What It Does |
|-------------|-------------|
| `SetupProgress` (dashboard) | Collapsible checklist, always visible until 100% |
| `StoreHealthCard` → "Replay Tour" | Clears `bns-tour-done` localStorage, refresh |
| `StoreHealthCard` → "Language" | Links to `/panel/tienda` (store config) |
| `PanelTopbar` nudge | Shows "⚡ X steps left" inline when score < 60 |

---

## 4. POS Flow (Point of Sale)

Full-screen overlay mode for in-person sales at `/[lang]/panel/pos`.

```
Owner opens POS → POSClient (full-screen, no sidebar/topbar)
  → POSProductGrid (search + barcode scan via camera)
  → POSVariantPicker (size/color selection modal)
  → POSCart (item list + quantity adjustment)
  → POSPaymentOverlay (cash/card/mixed payment)
  → POSReceipt (on-screen + thermal printer via ESC/POS Web Serial)
  → POSOfflineBanner (offline detection + queue)
  → POSDashboard (daily sales summary)
```

Flag: `enable_pos`. Layout detection: `PanelShell` checks pathname for `/pos` → hides sidebar/topbar.

---

## 5. Medusa Customizations

### Custom Modules

| Module | Path | Purpose |
|--------|------|---------|
| **Supabase Auth** | `apps/medusa/src/modules/supabase-auth/` | JWT validation, bridges Supabase ↔ Medusa auth |
| **Supabase Storage** | `apps/medusa/src/modules/supabase-storage/` | File provider using Supabase Storage CDN |

### Authenticated Medusa Client (`lib/medusa/auth-medusa.ts`)

Reads Supabase JWT from server cookies → sends as Bearer token to Medusa Store API.

### Owner Panel Admin Client (`lib/medusa/admin.ts`)

Authenticates via `POST /auth/user/emailpass` with env credentials. JWT cached 23h, auto-retry on 401.

---

## 6. Key Server Actions & API Routes

### Custom API Routes

| Route | Purpose |
|-------|---------
| `POST /api/webhooks/stripe` | Stripe webhook handler (4 flows: module_order, module_purchase, tenant_provisioning, legacy) |
| `GET /api/health[/live\|/ready]` | Health checks (liveness + readiness probes) |
| `POST /api/revalidate` | On-demand config revalidation |
| `POST /api/analytics` | Analytics event recording |
| `POST /api/chat` | Chatbot (flag + quota gated) |
| `GET /auth/callback` | OAuth callback (all providers) |
| `POST /api/panel/onboarding-complete` | Marks owner onboarding as done |
| `POST /api/panel/inventory/update-stock` | POS stock adjustment |

### Owner Panel Actions (all require `requirePanelAuth()`)

| Module | Actions |
|--------|---------|
| Productos | create, update, delete, uploadImage, removeImage |
| Categorías | create, edit, remove |
| Pedidos | fulfill, cancel |
| Carrusel | create, update, delete slides |
| Mensajes | create, update, delete WhatsApp templates |
| Páginas | create, update, delete, togglePublish CMS pages |
| Insignias | toggleBadge |
| Tienda | saveStoreConfig |
| POS | processPayment, updateInventory |
| Email | sendCampaign, manageLists |

All mutations call `revalidatePanel()` for instant UI refresh.

### System Actions

| Action | Purpose |
|--------|---------|
| `revalidateConfig()` | Clears TTL cache + revalidatePath |
| `setLocaleCookie()` | Sets locale preference |
| `setCurrencyCookie()` | Sets currency preference |
