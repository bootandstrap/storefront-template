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
export type { BillingGateway, BillingProvider, BillingCurrency, BillingWebhookEvent, CreateCustomerParams, PortalSessionParams, MaintenanceSubscriptionParams, CancelSubscriptionParams, ModuleCheckoutParams, AddModuleParams, RemoveModuleParams, ChangeModuleTierParams, OperationResult, CustomerResult, PortalSessionResult, SubscriptionResult, CheckoutResult, ModuleSubscriptionResult, ModuleListResult, EntitlementResult, WebhookResult, SubscriptionStatus, ModuleSubscriptionItem, ModuleEntitlement, } from './types';
export { createBillingGateway } from './factory';
export type { BillingGatewayOptions } from './factory';
export { derivePlansFromContract, formatPrice, getStartingPrice, getRecommendedTier, } from './plans';
export type { PlansConfig, PricePerCurrency, ModulePlan, ModuleTierPlan, } from './plans';
export { StripeBillingGateway } from './providers/stripe';
export type { TenantBillingStore } from './providers/stripe';
export { MockBillingGateway } from './providers/mock';
//# sourceMappingURL=index.d.ts.map