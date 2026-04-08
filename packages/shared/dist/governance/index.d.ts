/**
 * @module governance
 * @description Barrel export for all governance modules.
 *
 * Usage:
 *   import { StoreConfig, FALLBACK_CONFIG, shouldCircuitSkipFetch } from '@bootandstrap/shared'
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */
export { StoreConfigSchema, FeatureFlagsSchema, PlanLimitsSchema, TenantStatusSchema, AppConfigSchema, GovernanceRpcResultSchema, } from './schemas';
export type { StoreConfig, FeatureFlags, PlanLimits, TenantStatus, AppConfig, GovernanceRpcResult, } from './schemas';
export { FALLBACK_CONFIG } from './defaults';
export { shouldCircuitSkipFetch, circuitRecordSuccess, circuitRecordFailure, resetCircuitBreaker, } from './circuit-breaker';
export { getCachedConfig, setCachedConfig, clearCachedConfig } from './cache';
export { getRequiredTenantId, isBuildPhase } from './tenant';
export { reportDegradedMode } from './report';
export type { ModuleKey, FeatureGateEntry } from './feature-gates';
export type { LimitableResource, LimitCheckResult } from './limitable-resources';
export { createGovernanceAdapter } from './adapter';
export type { GovernanceAdapter, ActiveModule, GovernanceModeEnv } from './adapter';
//# sourceMappingURL=index.d.ts.map