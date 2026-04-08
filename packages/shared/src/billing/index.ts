/**
 * @module billing
 * @description Barrel export for the multi-provider billing system.
 *
 * Usage:
 *   import { createBillingGateway, type BillingGateway } from '@bootandstrap/shared/billing'
 *   // or
 *   import { createBillingGateway } from '@bootandstrap/shared'
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */

// Core types
export type {
    BillingGateway,
    BillingProvider,
    BillingCurrency,
    BillingWebhookEvent,

    // Params
    CreateCustomerParams,
    PortalSessionParams,
    MaintenanceSubscriptionParams,
    CancelSubscriptionParams,
    ModuleCheckoutParams,
    AddModuleParams,
    RemoveModuleParams,
    ChangeModuleTierParams,

    // Results
    OperationResult,
    CustomerResult,
    PortalSessionResult,
    SubscriptionResult,
    CheckoutResult,
    ModuleSubscriptionResult,
    ModuleListResult,
    EntitlementResult,
    WebhookResult,

    // Domain types
    SubscriptionStatus,
    ModuleSubscriptionItem,
    ModuleEntitlement,
} from './types'

// Factory
export { createBillingGateway } from './factory'
export type { BillingGatewayOptions } from './factory'

// Plans config (auto-derived from contract)
export {
    derivePlansFromContract,
    formatPrice,
    getStartingPrice,
    getRecommendedTier,
} from './plans'
export type {
    PlansConfig,
    PricePerCurrency,
    ModulePlan,
    ModuleTierPlan,
} from './plans'

// Providers (for direct instantiation in tests or advanced usage)
export { StripeBillingGateway } from './providers/stripe'
export type { TenantBillingStore } from './providers/stripe'
export { MockBillingGateway } from './providers/mock'
