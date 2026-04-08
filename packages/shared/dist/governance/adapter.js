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
import { ContractAdapter } from './adapters/contract';
import { OfflineAdapter } from './adapters/offline';
import { SupabaseAdapter } from './adapters/supabase';
// ── Factory ────────────────────────────────────────────────────────────────
/**
 * Create governance adapter based on GOVERNANCE_MODE env var.
 * Default: 'supabase' (production)
 */
export function createGovernanceAdapter(mode) {
    const resolved = mode ?? process.env.GOVERNANCE_MODE ?? 'supabase';
    switch (resolved) {
        case 'contract':
            return new ContractAdapter();
        case 'offline':
            return new OfflineAdapter();
        default:
            return new SupabaseAdapter();
    }
}
//# sourceMappingURL=adapter.js.map