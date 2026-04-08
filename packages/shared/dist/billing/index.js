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
// Factory
export { createBillingGateway } from './factory';
// Plans config (auto-derived from contract)
export { derivePlansFromContract, formatPrice, getStartingPrice, getRecommendedTier, } from './plans';
// Providers (for direct instantiation in tests or advanced usage)
export { StripeBillingGateway } from './providers/stripe';
export { MockBillingGateway } from './providers/mock';
//# sourceMappingURL=index.js.map