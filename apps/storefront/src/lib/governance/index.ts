/**
 * @module governance
 * @description Barrel export for inline governance modules.
 *
 * In the monorepo (dev), config.ts imports from @bootandstrap/shared.
 * In standalone tenant repos, config.ts imports from this barrel.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/index.ts
 * Sync via: scripts/sync-governance.sh
 */

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

export { FALLBACK_CONFIG } from './defaults'

export {
    shouldCircuitSkipFetch,
    circuitRecordSuccess,
    circuitRecordFailure,
    resetCircuitBreaker,
} from './circuit-breaker'

export { getCachedConfig, setCachedConfig, clearCachedConfig } from './cache'

export { getRequiredTenantId, isBuildPhase } from './tenant'

export { reportDegradedMode } from './report'
