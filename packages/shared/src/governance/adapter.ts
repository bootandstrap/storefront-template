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

import type { FeatureFlags, PlanLimits, StoreConfig } from './schemas'

// ── Active module representation ───────────────────────────────────────────

export interface ActiveModule {
    moduleKey: string
    tierName: string
    status: string
    orderId?: string
}

// ── Adapter Interface ──────────────────────────────────────────────────────

export interface GovernanceAdapter {
    /** Get all feature flags for a tenant */
    getFlags(tenantId: string): Promise<Record<string, boolean>>
    /** Get all plan limits for a tenant */
    getLimits(tenantId: string): Promise<Record<string, number | string>>
    /** Get active modules for a tenant */
    getModules(tenantId: string): Promise<ActiveModule[]>
    /** Get store config for a tenant */
    getConfig(tenantId: string): Promise<StoreConfig | null>
    /** Subscribe to governance changes (optional — not all environments support it) */
    subscribe?(tenantId: string, cb: () => void): () => void
    /** Name of this adapter (for logging) */
    readonly name: string
}

// ── Factory ────────────────────────────────────────────────────────────────

export type GovernanceModeEnv = 'supabase' | 'contract' | 'offline'

/**
 * Create governance adapter based on GOVERNANCE_MODE env var.
 * Default: 'supabase' (production)
 */
export function createGovernanceAdapter(mode?: GovernanceModeEnv): GovernanceAdapter {
    const resolved = mode ?? (process.env.GOVERNANCE_MODE as GovernanceModeEnv) ?? 'supabase'

    switch (resolved) {
        case 'contract': {
            const { ContractAdapter } = require('./adapters/contract')
            return new ContractAdapter()
        }
        case 'offline': {
            const { OfflineAdapter } = require('./adapters/offline')
            return new OfflineAdapter()
        }
        default: {
            const { SupabaseAdapter } = require('./adapters/supabase')
            return new SupabaseAdapter()
        }
    }
}

// Re-export adapter types
export type { FeatureFlags, PlanLimits, StoreConfig }
