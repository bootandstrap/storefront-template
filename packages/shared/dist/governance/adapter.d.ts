/**
 * GovernanceAdapter — Strategy pattern for multi-environment governance access
 *
 * Provides identical governance behavior across:
 *   - Production (SupabaseAdapter) — live DB via RPC
 *   - Tests/Storybook (ContractAdapter) — static from contract, instant
 *   - Offline/circuit-breaker (OfflineAdapter) — fail-closed fallback
 *
 * Usage:
 *   const adapter = createGovernanceAdapter()
 *   const flags = await adapter.getFlags(tenantId)
 *
 * The adapter is selected via GOVERNANCE_MODE env var:
 *   - 'supabase' (default) → SupabaseAdapter
 *   - 'contract' → ContractAdapter (for tests)
 *   - 'offline' → OfflineAdapter (for circuit breaker fallback)
 *
 * @module adapter
 */
export type { GovernanceAdapter, ActiveModule, GovernanceModeEnv } from './types';
export type { FeatureFlags, PlanLimits, StoreConfig } from './schemas';
import type { GovernanceAdapter, GovernanceModeEnv } from './types';
/**
 * Create governance adapter based on GOVERNANCE_MODE env var.
 * Default: 'supabase' (production)
 */
export declare function createGovernanceAdapter(mode?: GovernanceModeEnv): GovernanceAdapter;
//# sourceMappingURL=adapter.d.ts.map