/**
 * Enterprise Test Suite — Circuit Breaker State Machine
 *
 * Validates all 3 states (closed → open → half-open) and transitions.
 * Tests deterministic behavior under failure sequences.
 *
 * @enterprise Critical infrastructure — circuit breaker protects against Supabase cascading failures
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
    shouldCircuitSkipFetch,
    circuitRecordSuccess,
    circuitRecordFailure,
    resetCircuitBreaker,
} from '@/lib/governance/circuit-breaker'

describe('Circuit Breaker — Enterprise State Machine', () => {
    beforeEach(() => {
        resetCircuitBreaker()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ── State: CLOSED ─────────────────────────────────────────────────

    describe('CLOSED state (default)', () => {
        it('allows fetch when no failures recorded', () => {
            expect(shouldCircuitSkipFetch()).toBe(false)
        })

        it('allows fetch after 1 failure (below threshold)', () => {
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(false)
        })

        it('allows fetch after 2 failures (still below threshold)', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(false)
        })
    })

    // ── Transition: CLOSED → OPEN ─────────────────────────────────────

    describe('CLOSED → OPEN transition', () => {
        it('opens after exactly 3 consecutive failures (threshold)', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(true)
        })

        it('stays open with additional failures beyond threshold', () => {
            for (let i = 0; i < 5; i++) circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(true)
        })
    })

    // ── State: OPEN ───────────────────────────────────────────────────

    describe('OPEN state', () => {
        beforeEach(() => {
            // Trip the circuit
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
        })

        it('blocks fetch during window', () => {
            vi.advanceTimersByTime(30_000) // 30s < 60s window
            expect(shouldCircuitSkipFetch()).toBe(true)
        })

        it('blocks fetch at exactly window boundary', () => {
            vi.advanceTimersByTime(59_999) // Just under 60s
            expect(shouldCircuitSkipFetch()).toBe(true)
        })
    })

    // ── Transition: OPEN → HALF-OPEN ──────────────────────────────────

    describe('OPEN → HALF-OPEN transition', () => {
        beforeEach(() => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
        })

        it('transitions to half-open after window expires (allows 1 probe)', () => {
            vi.advanceTimersByTime(60_001)
            // First call should allow (probe request)
            expect(shouldCircuitSkipFetch()).toBe(false)
        })

        it('subsequent half-open calls also pass (state persists until result)', () => {
            vi.advanceTimersByTime(60_001)
            shouldCircuitSkipFetch() // Transitions to half-open
            // In half-open, subsequent calls also pass
            expect(shouldCircuitSkipFetch()).toBe(false)
        })
    })

    // ── Transition: HALF-OPEN → CLOSED (success) ──────────────────────

    describe('HALF-OPEN → CLOSED (on success)', () => {
        it('fully closes circuit after successful probe', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
            vi.advanceTimersByTime(60_001) // → half-open
            shouldCircuitSkipFetch() // probe

            circuitRecordSuccess() // Probe succeeded!

            // Should be fully closed now
            expect(shouldCircuitSkipFetch()).toBe(false)

            // And failures start from 0 again
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(false) // 1 failure, still closed
        })
    })

    // ── Transition: HALF-OPEN → OPEN (failure) ────────────────────────

    describe('HALF-OPEN → OPEN (on failure)', () => {
        it('re-opens circuit if probe fails', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
            vi.advanceTimersByTime(60_001)
            shouldCircuitSkipFetch() // half-open probe

            // Probe failed — record failures to re-open
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()

            expect(shouldCircuitSkipFetch()).toBe(true) // back to open
        })
    })

    // ── Reset ─────────────────────────────────────────────────────────

    describe('reset', () => {
        it('clears all state back to closed', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(true)

            resetCircuitBreaker()
            expect(shouldCircuitSkipFetch()).toBe(false)
        })

        it('allows fresh failure counting after reset', () => {
            // Trip it
            for (let i = 0; i < 5; i++) circuitRecordFailure()
            resetCircuitBreaker()

            // 2 failures should NOT trip it again (below threshold)
            circuitRecordFailure()
            circuitRecordFailure()
            expect(shouldCircuitSkipFetch()).toBe(false)
        })
    })

    // ── Interleaved success/failure sequences ─────────────────────────

    describe('interleaved operations', () => {
        it('success resets failure count (prevents unnecessary trips)', () => {
            circuitRecordFailure()
            circuitRecordFailure()
            circuitRecordSuccess() // Reset!
            circuitRecordFailure()
            circuitRecordFailure()
            // Only 2 consecutive since last success, should stay closed
            expect(shouldCircuitSkipFetch()).toBe(false)
        })
    })
})
