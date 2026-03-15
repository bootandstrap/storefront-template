/**
 * @module governance/circuit-breaker
 * @description 3-state circuit breaker to prevent hammering Supabase during outages.
 *
 * States: CLOSED (normal) → OPEN (skip fetch for WINDOW_MS) → HALF_OPEN (probe)
 * - After THRESHOLD consecutive failures → OPEN
 * - After WINDOW_MS → HALF_OPEN: one probe request allowed
 * - If probe succeeds → CLOSED. If probe fails → OPEN again.
 *
 * Uses globalThis to share state across Turbopack module instances in dev.
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */

type CircuitState = 'closed' | 'open' | 'half-open'

const globalForCircuit = globalThis as unknown as {
    __circuitState?: CircuitState
    __circuitFailCount?: number
    __circuitLastFailTime?: number
}

const CIRCUIT_THRESHOLD = 3       // open after 3 consecutive failures
const CIRCUIT_WINDOW_MS = 60_000  // stay open for 60s before probe

/**
 * Returns true when the circuit is OPEN (should skip Supabase fetch).
 * In HALF_OPEN state, allows one probe request through.
 */
export function shouldCircuitSkipFetch(): boolean {
    const state = globalForCircuit.__circuitState ?? 'closed'
    if (state === 'closed') return false
    if (state === 'open') {
        const elapsed = Date.now() - (globalForCircuit.__circuitLastFailTime ?? 0)
        if (elapsed > CIRCUIT_WINDOW_MS) {
            globalForCircuit.__circuitState = 'half-open'
            return false // allow one probe
        }
        return true // skip, use fallback
    }
    // half-open: allow probe
    return false
}

/** Record a successful Supabase fetch — closes the circuit. */
export function circuitRecordSuccess(): void {
    globalForCircuit.__circuitState = 'closed'
    globalForCircuit.__circuitFailCount = 0
}

/** Record a failed Supabase fetch — may trip the circuit open. */
export function circuitRecordFailure(): void {
    const count = (globalForCircuit.__circuitFailCount ?? 0) + 1
    globalForCircuit.__circuitFailCount = count
    globalForCircuit.__circuitLastFailTime = Date.now()
    if (count >= CIRCUIT_THRESHOLD) {
        globalForCircuit.__circuitState = 'open'
    }
}

/** Reset circuit breaker to closed state. Exported for testing. */
export function resetCircuitBreaker(): void {
    globalForCircuit.__circuitState = 'closed'
    globalForCircuit.__circuitFailCount = 0
    globalForCircuit.__circuitLastFailTime = 0
}
