# Critical Flows

> Last updated: 2026-04-14.

## 1. Auth Flow

Supabase Auth handles all authentication. Medusa validates Supabase JWTs via custom provider.

**Flags**: `enable_email_auth`, `enable_google_auth`, `enable_user_registration`, `enable_guest_checkout`, `require_auth_to_order`.

```
User → Login page (providers from flags) → Supabase JWT (httpOnly cookie)
  → proxy.ts validates → Server Actions use authenticated client
  → Medusa supabase-auth provider validates JWT → AuthIdentity
```

**Route protection** (proxy.ts): Public (`/`, `/productos/**`, `/login`). Conditional (`/checkout/**` if `require_auth_to_order`). Protected (`/cuenta/**`). Panel (`/panel/**` — requires `owner`/`super_admin`).

## 2. Checkout (Dynamic N-Method Payment)

Payment methods are **flag-driven**: `enable_whatsapp_checkout` (P10), `enable_online_payments` (P20), `enable_cash_on_delivery` (P30), `enable_bank_transfer` (P40). `max_payment_methods` caps visible count.

All share `CheckoutModal`: shipping → method selection → method-specific UI.

**Adding a method**: flag in DB → `components/checkout/MyFlow.tsx` → register in `lib/payment-methods.ts` (id, flag, label, icon, component, priority). Auto-renders when flag enabled.

## 3. POS Flow

Full-screen at `/panel/pos`. Flag: `enable_pos`.

```
POSProductGrid (search + barcode scan) → POSVariantPicker → POSCart
  → POSPaymentOverlay (cash/card/mixed) → POSReceipt (screen + thermal ESC/POS)
  → POSOfflineBanner (offline detection) → POSDashboard (daily summary)
```

## 4. Medusa Customizations

| Module | Purpose |
|--------|---------|
| `supabase-auth` | JWT validation, bridges Supabase ↔ Medusa auth |
| `supabase-storage` | File provider using Supabase Storage CDN |

Admin client (`lib/medusa/admin.ts`): authenticates via emailpass, JWT cached 23h, auto-retry on 401.
