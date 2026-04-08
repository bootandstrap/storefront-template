/**
 * OfflineAdapter — Fail-closed fallback for circuit breaker
 *
 * Returns the most restrictive governance state from generated defaults.
 * All flags OFF (except maintenance mode), all limits at 0.
 * Used when Supabase is unreachable and circuit breaker is open.
 * Zero I/O — pure static data.
 */
import { FALLBACK_CONFIG } from '../defaults';
export class OfflineAdapter {
    name = 'offline';
    async getFlags(_tenantId) {
        return { ...FALLBACK_CONFIG.featureFlags };
    }
    async getLimits(_tenantId) {
        const raw = FALLBACK_CONFIG.planLimits;
        const result = {};
        for (const [k, v] of Object.entries(raw)) {
            if (v !== null && v !== undefined)
                result[k] = v;
        }
        return result;
    }
    async getModules(_tenantId) {
        return []; // No modules in offline mode
    }
    async getConfig(_tenantId) {
        return null; // No config in offline mode — use defaults
    }
}
//# sourceMappingURL=offline.js.map