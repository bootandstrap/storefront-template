/**
 * @module governance
 * @description Barrel export for all governance modules.
 *
 * Usage:
 *   import { StoreConfig, FALLBACK_CONFIG, shouldCircuitSkipFetch } from '@bootandstrap/shared'
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */

// Zod schemas + derived types
export {
    StoreConfigSchema,
    FeatureFlagsSchema,
    PlanLimitsSchema,
    TenantStatusSchema,
    AppConfigSchema,
    GovernanceRpcResultSchema,
} from './schemas'

export type {
    StoreConfig,
    FeatureFlags,
    PlanLimits,
    TenantStatus,
    AppConfig,
    GovernanceRpcResult,
} from './schemas'

// Fail-closed defaults
export { FALLBACK_CONFIG } from './defaults'

// Circuit breaker
export {
    shouldCircuitSkipFetch,
    circuitRecordSuccess,
    circuitRecordFailure,
    resetCircuitBreaker,
} from './circuit-breaker'

// Cache
export { getCachedConfig, setCachedConfig, clearCachedConfig } from './cache'

// Tenant resolution
export { getRequiredTenantId, isBuildPhase } from './tenant'

// Degraded mode reporting
export { reportDegradedMode } from './report'

// Feature gate types (module↔flag mapping)
export type { ModuleKey, FeatureGateEntry } from './feature-gates'

// Limitable resource types (plan limit keys)
export type { LimitableResource, LimitCheckResult } from './limitable-resources'
