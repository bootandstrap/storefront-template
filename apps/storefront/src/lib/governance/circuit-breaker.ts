/**
 * @module governance/circuit-breaker
 * @description 3-state circuit breaker to prevent hammering Supabase during outages.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/circuit-breaker.ts
 * Sync via: scripts/sync-governance.sh
 */

type CircuitState = 'closed' | 'open' | 'half-open'

const globalForCircuit = globalThis as unknown as {
    __circuitState?: CircuitState
    __circuitFailCount?: number
    __circuitLastFailTime?: number
}

const CIRCUIT_THRESHOLD = 3
const CIRCUIT_WINDOW_MS = 60_000

export function shouldCircuitSkipFetch(): boolean {
    const state = globalForCircuit.__circuitState ?? 'closed'
    if (state === 'closed') return false
    if (state === 'open') {
        const elapsed = Date.now() - (globalForCircuit.__circuitLastFailTime ?? 0)
        if (elapsed > CIRCUIT_WINDOW_MS) {
            globalForCircuit.__circuitState = 'half-open'
            return false
        }
        return true
    }
    return false
}

export function circuitRecordSuccess(): void {
    globalForCircuit.__circuitState = 'closed'
    globalForCircuit.__circuitFailCount = 0
}

export function circuitRecordFailure(): void {
    const count = (globalForCircuit.__circuitFailCount ?? 0) + 1
    globalForCircuit.__circuitFailCount = count
    globalForCircuit.__circuitLastFailTime = Date.now()
    if (count >= CIRCUIT_THRESHOLD) {
        globalForCircuit.__circuitState = 'open'
    }
}

export function resetCircuitBreaker(): void {
    globalForCircuit.__circuitState = 'closed'
    globalForCircuit.__circuitFailCount = 0
    globalForCircuit.__circuitLastFailTime = 0
}
