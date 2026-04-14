# Medusa Subscribers — BootandStrap Platform

## Overview

Event-driven handlers that react to Medusa domain events (orders, fulfillments, inventory).
All subscribers are **governance-gated** — they only fire when the corresponding feature flag is active for the tenant.

## Governance Gate Pattern

All subscribers use the `withGovernanceGate()` HOF from `shared/governance-gate.ts`:

```typescript
import { withGovernanceGate } from "./shared/governance-gate"

// Single flag check
export default withGovernanceGate("enable_ecommerce", async ({ event, container }) => {
    // Only runs if enable_ecommerce = true in Supabase
})

// Multiple flags required (ALL must be true)
export default withGovernanceGateAll(
    ["enable_ecommerce", "enable_low_stock_alerts"],
    async ({ event, container }) => { ... }
)

// Any flag enables handler
export default withGovernanceGateAny(
    ["enable_chatbot", "enable_rrss"],
    async ({ event, container }) => { ... }
)
```

### How It Works

1. When an event fires, the gate checks `feature_flags` in Supabase for the tenant
2. If the flag is `false` or missing, the handler is **silently skipped** (structured log emitted)
3. Flag values are cached for **60 seconds** to minimize Supabase pressure
4. In dev mode (no governance config), all features default to **enabled**

### Cache Invalidation

Call `invalidateFlagsCache()` after changing feature flags programmatically:

```typescript
import { invalidateFlagsCache } from "./shared/governance-gate"

// After activating a module for a tenant
invalidateFlagsCache()
```

## Subscriber Matrix

| File | Event | Gate Flag(s) | Gate Mode |
|------|-------|-------------|-----------|
| `order-placed.ts` | `order.placed` | `enable_ecommerce` | `withGovernanceGate` |
| `order-canceled.ts` | `order.canceled` | `enable_ecommerce` | `withGovernanceGate` |
| `order-shipped.ts` | `order.fulfillment_created` | `enable_ecommerce` | `withGovernanceGate` |
| `order-return-requested.ts` | `order.return_requested` | `enable_ecommerce` | `withGovernanceGate` |
| `low-stock-alert.ts` | `inventory-item.updated` | `enable_ecommerce` | `withGovernanceGate` |

## Shared Utilities

| File | Purpose |
|------|---------|
| `shared/bridge.ts` | `notifyStorefront()`, `dispatchToChannels()`, `logAnalyticsEvent()` |
| `shared/channels.ts` | Multi-channel dispatch (webhook, WhatsApp, Telegram) |
| `shared/governance-gate.ts` | Feature flag gating HOFs |
| `shared/message-templates.ts` | Localized message formatting |

## Adding a New Subscriber

1. Create handler file in `subscribers/`
2. Wrap with appropriate governance gate
3. Add entry to the matrix in this README
4. If the subscriber serves a specific module, use that module's flag (e.g., `enable_crm`)

```typescript
// Example: CRM contact sync on customer creation
import { withGovernanceGate } from "./shared/governance-gate"

export default withGovernanceGate("enable_crm", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) => {
    // Sync customer to CRM...
})

export const config: SubscriberConfig = {
    event: "customer.created",
}
```

## Architecture

```
Medusa Event Bus
    │
    ├──► Subscriber (wrapped with governance gate)
    │        │
    │        ├──► Check feature_flags table (cached 60s)
    │        │
    │        ├─── Flag OFF ──► Silent skip + structured log
    │        │
    │        └─── Flag ON ──► Execute handler
    │                │
    │                ├──► Structured logging (JSON)
    │                ├──► Multi-channel dispatch (bridge)
    │                ├──► Email notification (storefront bridge OR Notification Module)
    │                └──► Analytics event (Supabase)
    │
    └──► Next subscriber...
```

## Notification Module (Resend Provider)

The Medusa Notification Module is registered in `medusa-config.ts` with a custom
Resend provider (`src/modules/resend-notification/`).

- **Only active** when `RESEND_API_KEY` env var is set
- **Channel**: `email` — skips non-email channels silently
- **Graceful degradation**: If API key missing, logs warning but does not crash

### Env vars required:
- `RESEND_API_KEY` — Resend API key (starts with `re_`)
- `RESEND_FROM` — Sender address (default: `noreply@bootandstrap.com`)

### Dual email path:
1. **Storefront bridge** (existing): Subscriber → POST to `/api/webhooks/medusa-events` → storefront sends via Resend
2. **Notification Module** (new): Subscriber → `notificationService.createNotifications()` → Resend provider sends directly

Both paths coexist. The bridge path has tenant-specific templates; the Notification Module path is for Medusa-built-in events.