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
/**
 * Returns true when the circuit is OPEN (should skip Supabase fetch).
 * In HALF_OPEN state, allows one probe request through.
 */
export declare function shouldCircuitSkipFetch(): boolean;
/** Record a successful Supabase fetch — closes the circuit. */
export declare function circuitRecordSuccess(): void;
/** Record a failed Supabase fetch — may trip the circuit open. */
export declare function circuitRecordFailure(): void;
/** Reset circuit breaker to closed state. Exported for testing. */
export declare function resetCircuitBreaker(): void;
//# sourceMappingURL=circuit-breaker.d.ts.map