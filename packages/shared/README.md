# @bootandstrap/shared

Shared types, governance contracts, billing abstractions, provisioning pipeline, module registry, and Medusa router for the BootandStrap SaaS platform.

## Installation

```bash
# In BSWEB or other consumers (via GitHub Packages)
npm install @bootandstrap/shared

# In the ecommerce-template monorepo (already linked via pnpm workspace)
# No installation needed — use workspace:* protocol
```

## Subpath Exports

```ts
// Everything
import { ... } from '@bootandstrap/shared'

// Billing gateway
import { BillingGatewayFactory, MockBillingGateway, derivePlansFromContract } from '@bootandstrap/shared/billing'

// Governance types & schemas
import { FeatureFlagsSchema, PlanLimitsSchema, FALLBACK_CONFIG } from '@bootandstrap/shared/governance'

// Provisioning pipeline
import { UnifiedProvisioner } from '@bootandstrap/shared/provisioning'

// Module registry + Medusa router
import { createModuleRegistry, MedusaModuleRouter, getFeatureGateMap, getPanelPolicy } from '@bootandstrap/shared/modules'
```

## Core Concepts

### BillingGateway

Provider-agnostic billing abstraction. Two implementations:

| Provider | Usage |
|----------|-------|
| `MockBillingGateway` | Local dev, test, demo |
| `StripeBillingGateway` | Production (requires `TenantBillingStore`) |

```ts
const gateway = BillingGatewayFactory.create({
    provider: process.env.BILLING_PROVIDER ?? 'mock',
    store: new SupabaseBillingStore(), // Only needed for Stripe
})
```

### UnifiedProvisioner

Single pipeline replacing 3 legacy provisioners. Supports 4 modes:

| Mode | Billing | Governance | Infrastructure |
|------|---------|------------|----------------|
| `local` | Mock | All flags ON | None |
| `demo` | Mock | All flags ON | Optional |
| `staging` | Mock | Contract defaults | None |
| `production` | Stripe | Contract defaults | Full |

### ModuleRegistry

Contract-driven module definitions with auto-derived feature gates and panel policies:

```ts
const registry = createModuleRegistry(contract)
const featureMap = getFeatureGateMap(registry)   // 73 mappings
const policy = getPanelPolicy(registry)          // 13 policies
```

### MedusaModuleRouter

Declarative router: governance module changes → Medusa actions.

```ts
const router = new MedusaModuleRouter(registry.modules)

// Activate a module
const result = router.route({
    type: 'activate',
    tenantId: '...',
    moduleKey: 'pos',
    newTierLevel: 1,
    previousTierLevel: 0,
})
// → { success: true, actions: [{ type: 'configure_module', ... }, ...] }

// Upgrade a module
router.route({ type: 'upgrade', moduleKey: 'pos', newTierLevel: 2, ... })

// Deactivate a module
router.route({ type: 'deactivate', moduleKey: 'pos', newTierLevel: 0, ... })
```

### Plans Derivation

Auto-derive pricing from the governance contract:

```ts
const plans = derivePlansFromContract(contract)
// → { maintenance: { prices: { CHF: 40, EUR: 44 } }, modules: [...] }
```

## BSWEB Integration

The shared bridge (`BSWEB/src/lib/governance/shared-bridge.ts`) provides high-level adapters:

```ts
import { routeModuleChangeToMedusa, executeMedusaActions } from '@/lib/governance/shared-bridge'
import { triggerMedusaProvisioning } from '@/lib/governance/shared-bridge'
import { getPlansConfig, getModuleRegistryFromContract } from '@/lib/governance/shared-bridge'
```

## Medusa Subscriber Governance Gate

On the Medusa side, subscribers use `withGovernanceGate()`:

```ts
import { withGovernanceGate } from "./shared/governance-gate"

export default withGovernanceGate("enable_ecommerce", async ({ event, container }) => {
    // Only fires if ecommerce is enabled for this tenant
})
```

See `apps/medusa/src/subscribers/README.md` for full documentation.

## Testing

```bash
cd packages/shared

# Unit tests (97 tests, ~330ms)
pnpm test

# E2E Provisioning Drill (59 checks)
cd ../.. && npx tsx scripts/e2e-provision-drill.ts
```

## Validation

| Check | Command | Expected |
|-------|---------|----------|
| Unit tests | `pnpm test` | 97/97 passed |
| E2E drill | `npx tsx scripts/e2e-provision-drill.ts` | 59/59 passed |
| Type check | `pnpm type-check` | 0 errors |
| Governance drift | CI `governance-gate.yml` | All jobs green |

## Versioning

Uses [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm changeset           # Create a changeset
pnpm version             # Bump version from changesets
pnpm release             # Build + publish to GitHub Packages
```
