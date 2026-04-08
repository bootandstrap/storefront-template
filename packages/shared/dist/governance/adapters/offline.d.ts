/**
 * OfflineAdapter — Fail-closed fallback for circuit breaker
 *
 * Returns the most restrictive governance state from generated defaults.
 * All flags OFF (except maintenance mode), all limits at 0.
 * Used when Supabase is unreachable and circuit breaker is open.
 * Zero I/O — pure static data.
 */
import type { GovernanceAdapter, ActiveModule } from '../types';
import type { StoreConfig } from '../schemas';
export declare class OfflineAdapter implements GovernanceAdapter {
    readonly name = "offline";
    getFlags(_tenantId: string): Promise<Record<string, boolean>>;
    getLimits(_tenantId: string): Promise<Record<string, number | string>>;
    getModules(_tenantId: string): Promise<ActiveModule[]>;
    getConfig(_tenantId: string): Promise<StoreConfig | null>;
}
//# sourceMappingURL=offline.d.ts.map