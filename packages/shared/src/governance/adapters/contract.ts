/**
 * ContractAdapter — Static governance from contract (for tests/Storybook)
 *
 * Returns fail-closed defaults from the generated contract.
 * Supports flag/limit overrides for test scenarios.
 * Zero I/O — instant, deterministic, no Supabase dependency.
 */

import type { GovernanceAdapter, ActiveModule } from '../types'
import type { StoreConfig } from '../schemas'
import { FALLBACK_CONFIG } from '../defaults'

export class ContractAdapter implements GovernanceAdapter {
    readonly name = 'contract'
    private flagOverrides: Record<string, boolean> = {}
    private limitOverrides: Record<string, number | string> = {}
    private moduleOverrides: ActiveModule[] = []

    /** Set flag overrides for test scenarios */
    setFlags(overrides: Record<string, boolean>): this {
        this.flagOverrides = { ...this.flagOverrides, ...overrides }
        return this
    }

    /** Set limit overrides for test scenarios */
    setLimits(overrides: Record<string, number | string>): this {
        this.limitOverrides = { ...this.limitOverrides, ...overrides }
        return this
    }

    /** Set active modules for test scenarios */
    setModules(modules: ActiveModule[]): this {
        this.moduleOverrides = modules
        return this
    }

    async getFlags(_tenantId: string): Promise<Record<string, boolean>> {
        // Start with all flags OFF (fail-closed), then apply overrides
        const base = { ...FALLBACK_CONFIG.featureFlags }
        return { ...base, ...this.flagOverrides }
    }

    async getLimits(_tenantId: string): Promise<Record<string, number | string>> {
        const raw = FALLBACK_CONFIG.planLimits as Record<string, unknown>
        const base: Record<string, number | string> = {}
        for (const [k, v] of Object.entries(raw)) {
            if (v !== null && v !== undefined) base[k] = v as number | string
        }
        return { ...base, ...this.limitOverrides }
    }

    async getModules(_tenantId: string): Promise<ActiveModule[]> {
        return this.moduleOverrides
    }

    async getConfig(_tenantId: string): Promise<StoreConfig | null> {
        return null // No config in contract mode — use defaults
    }
}
