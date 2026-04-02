/**
 * OfflineAdapter — Fail-closed fallback for circuit breaker
 *
 * Returns the most restrictive governance state from generated defaults.
 * All flags OFF (except maintenance mode), all limits at 0.
 * Used when Supabase is unreachable and circuit breaker is open.
 * Zero I/O — pure static data.
 */

import type { GovernanceAdapter, ActiveModule } from '../types'
import type { StoreConfig } from '../schemas'
import { FALLBACK_CONFIG } from '../defaults'

export class OfflineAdapter implements GovernanceAdapter {
    readonly name = 'offline'

    async getFlags(_tenantId: string): Promise<Record<string, boolean>> {
        return { ...FALLBACK_CONFIG.featureFlags }
    }

    async getLimits(_tenantId: string): Promise<Record<string, number | string>> {
        const raw = FALLBACK_CONFIG.planLimits as Record<string, unknown>
        const result: Record<string, number | string> = {}
        for (const [k, v] of Object.entries(raw)) {
            if (v !== null && v !== undefined) result[k] = v as number | string
        }
        return result
    }

    async getModules(_tenantId: string): Promise<ActiveModule[]> {
        return [] // No modules in offline mode
    }

    async getConfig(_tenantId: string): Promise<StoreConfig | null> {
        return null // No config in offline mode — use defaults
    }
}
