/**
 * GovernanceAdapter Types — Pure type definitions (no implementation)
 *
 * This file exists to break the circular dependency between adapter.ts
 * and its concrete implementations (contract, offline, supabase).
 *
 * @module governance/types
 */

import type { StoreConfig } from './schemas'

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

// ── Factory mode type ──────────────────────────────────────────────────────

export type GovernanceModeEnv = 'supabase' | 'contract' | 'offline'
