# Module Developer Kit (SDK)

> How to add a new module to BootandStrap — end-to-end.

## Architecture Overview

```
┌─────────── BSWEB (Control Plane) ───────────┐
│ modules table → module_tiers → Stripe prices │
│ module_flag_bridge → flag_definitions       │
│ Entitlement Engine (7-layer PDP)            │
└─────────────────────────┬───────────────────┘
                          │ resolveCapabilities()
┌─────────── Storefront (Data Plane) ─────────┐
│ feature-gate-config.ts → FeatureGate UI     │
│ panel-policy.ts → navigation/routing        │
│ /panel/{segment} → module page              │
└─────────────────────────────────────────────┘
```

## Step-by-Step: Adding a New Module

### 1. Define Module in BSWEB Database

```sql
-- Insert into modules table
INSERT INTO modules (key, name_key, description_key, icon, category, sort_order)
VALUES ('loyalty', 'modules.loyalty.name', 'modules.loyalty.description', '🏆', 'engagement', 50);

-- Define tiers
INSERT INTO module_tiers (module_key, tier, price_monthly_eur, features)
VALUES
  ('loyalty', 'basic',    15, '{"points": true, "max_rules": 5}'),
  ('loyalty', 'premium',  30, '{"points": true, "referrals": true, "max_rules": 25}'),
  ('loyalty', 'enterprise', 50, '{"points": true, "referrals": true, "vip_tiers": true, "max_rules": -1}');
```

### 2. Create Stripe Prices

```typescript
// Use Stripe MCP or Dashboard
// Create a product: "BootandStrap — Loyalty Module"
// Create 3 recurring prices: 15€/mo, 30€/mo, 50€/mo
// Save price IDs to module_tiers.stripe_price_id
```

### 3. Map Module → Feature Flags

```sql
-- In flag_definitions (seed via scripts/seed-flag-definitions.ts)
INSERT INTO flag_definitions (key, label, category, default_value, description) VALUES
  ('enable_loyalty_points', 'Loyalty Points', 'engagement', false, 'Point accrual and redemption'),
  ('enable_loyalty_referrals', 'Referral Program', 'engagement', false, 'Customer referral tracking'),
  ('enable_loyalty_vip', 'VIP Tiers', 'engagement', false, 'Tiered loyalty levels');

-- Bridge: which flags each tier unlocks
INSERT INTO module_flag_bridge (module_key, tier, flag_key) VALUES
  ('loyalty', 'basic',      'enable_loyalty_points'),
  ('loyalty', 'premium',    'enable_loyalty_points'),
  ('loyalty', 'premium',    'enable_loyalty_referrals'),
  ('loyalty', 'enterprise', 'enable_loyalty_points'),
  ('loyalty', 'enterprise', 'enable_loyalty_referrals'),
  ('loyalty', 'enterprise', 'enable_loyalty_vip');
```

### 4. Add to Storefront `feature-gate-config.ts`

```typescript
// src/lib/feature-gate-config.ts
enable_loyalty_points: {
    moduleKey: 'loyalty',
    moduleNameKey: 'featureGate.modules.loyalty',
    icon: '🏆',
    bswSlug: {
        es: 'programa-fidelidad',
        en: 'loyalty-program',
        de: 'treueprogramm',
        fr: 'programme-fidelite',
        it: 'programma-fedelta',
    },
},
```

### 5. Add Panel Page + Navigation

```typescript
// src/lib/panel-policy.ts — ADVANCED_MODULES array
{ key: 'loyalty', segment: 'fidelidad', featureKey: 'enable_loyalty_points' },

// Also add to ADVANCED_ROUTES Set:
'fidelidad',

// And PanelRouteKey type:
| 'fidelidad'
```

### 6. Create Panel Page

```
apps/storefront/src/app/[lang]/panel/fidelidad/
├── page.tsx          — Server component with FeatureGate wrapper
├── LoyaltyDashboard.tsx  — Client component with module UI
└── actions.ts        — Server actions for module data
```

```tsx
// page.tsx pattern
import { FeatureGate } from '@/components/ui/FeatureGate'
import LoyaltyDashboard from './LoyaltyDashboard'

export default async function LoyaltyPage({ params }: { params: { lang: string } }) {
  return (
    <FeatureGate flagKey="enable_loyalty_points" lang={params.lang}>
      <LoyaltyDashboard lang={params.lang} />
    </FeatureGate>
  )
}
```

### 7. Add i18n Keys

```json
// dictionaries/es.json
{
  "panel.sidebar.loyalty": "Fidelización",
  "featureGate.modules.loyalty": "Programa de Fidelización",
  "loyalty.dashboard.title": "Panel de Fidelización",
  "loyalty.points.label": "Puntos"
}

// Repeat for: en.json, de.json, fr.json, it.json
```

### 8. Add BSWEB Module Info Page

```
BOOTANDSTRAP_WEB/src/app/[lang]/modulos/programa-fidelidad/page.tsx
```

## Module Lifecycle

```mermaid
graph TD
    A[Owner visits /panel/modulos] --> B[Sees Loyalty module card]
    B --> C[Clicks 'Activar']
    C --> D[Stripe Checkout Session]
    D --> E[Payment Success]
    E --> F[Webhook: checkout.session.completed]
    F --> G[module_orders created]
    G --> H[module_flag_bridge → flags activated]
    H --> I[resolveCapabilities invalidated]
    I --> J[/panel/fidelidad now accessible]
```

## Testing Checklist

- [ ] Flag exists in `flag_definitions` table
- [ ] `feature-gate-config.ts` entry present
- [ ] `panel-policy.ts` ADVANCED_MODULES + ADVANCED_ROUTES + PanelRouteKey updated
- [ ] Panel page renders with `FeatureGate` wrapper
- [ ] i18n keys in all 5 locales
- [ ] Module purchase flow works (Stripe → webhook → flag activation)
- [ ] Panel sidebar shows/hides based on flag state
- [ ] `evaluatePanelAccess()` correctly gates the route
- [ ] BSWEB module info page links correctly

## Entitlement Engine Integration

The 7-layer pipeline resolves capabilities:

| Layer | Source | Priority |
|-------|--------|----------|
| 1 | `flag_definitions.default_value` | Lowest |
| 2 | System defaults | |
| 3 | Plan presets | |
| 4 | **Module effects** (from purchase) | ← Your module |
| 5 | Capability overrides (SuperAdmin) | |
| 6 | Cascade rules | |
| 7 | Status gate (maintenance mode) | Highest |

Your module's flags are activated at **Layer 4** when a customer purchases a tier.
SuperAdmin can override at **Layer 5** on a per-tenant basis.
