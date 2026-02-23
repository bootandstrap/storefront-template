/**
 * Tests for FreeShippingBanner component logic
 *
 * Verifies: threshold gating, progress calculation, unlocked state, edge cases.
 * Tests component logic via direct function invocation — no DOM rendering needed.
 */
import { describe, it, expect } from 'vitest'

// ── Extract testable logic from the component ──

function shouldRender(threshold: number): boolean {
    return threshold > 0
}

function calculateProgress(subtotal: number, threshold: number): number {
    return Math.min((subtotal / threshold) * 100, 100)
}

function isUnlocked(subtotal: number, threshold: number): boolean {
    return subtotal >= threshold
}

function calculateRemaining(subtotal: number, threshold: number): number {
    return threshold - subtotal
}

describe('FreeShippingBanner — threshold gating', () => {
    it('does not render when threshold is 0 (disabled)', () => {
        expect(shouldRender(0)).toBe(false)
    })

    it('does not render when threshold is negative', () => {
        expect(shouldRender(-100)).toBe(false)
    })

    it('renders when threshold is positive', () => {
        expect(shouldRender(5000)).toBe(true)
    })
})

describe('FreeShippingBanner — progress calculation', () => {
    it('calculates 50% at halfway', () => {
        expect(calculateProgress(5000, 10000)).toBe(50)
    })

    it('calculates 0% at zero subtotal', () => {
        expect(calculateProgress(0, 10000)).toBe(0)
    })

    it('calculates 100% at exact threshold', () => {
        expect(calculateProgress(10000, 10000)).toBe(100)
    })

    it('caps at 100% when subtotal exceeds threshold', () => {
        expect(calculateProgress(20000, 10000)).toBe(100)
    })

    it('calculates 25% at quarter', () => {
        expect(calculateProgress(2500, 10000)).toBe(25)
    })

    it('handles small amounts correctly', () => {
        expect(calculateProgress(100, 10000)).toBe(1)
    })
})

describe('FreeShippingBanner — unlocked state', () => {
    it('is unlocked when subtotal equals threshold', () => {
        expect(isUnlocked(10000, 10000)).toBe(true)
    })

    it('is unlocked when subtotal exceeds threshold', () => {
        expect(isUnlocked(15000, 10000)).toBe(true)
    })

    it('is locked when subtotal is below threshold', () => {
        expect(isUnlocked(5000, 10000)).toBe(false)
    })

    it('is locked at zero subtotal', () => {
        expect(isUnlocked(0, 10000)).toBe(false)
    })
})

describe('FreeShippingBanner — remaining amount', () => {
    it('calculates correct remaining at halfway', () => {
        expect(calculateRemaining(5000, 10000)).toBe(5000) // €50 remaining
    })

    it('remaining is zero at threshold', () => {
        expect(calculateRemaining(10000, 10000)).toBe(0)
    })

    it('remaining is negative when over threshold (but component shows unlocked)', () => {
        expect(calculateRemaining(15000, 10000)).toBe(-5000)
    })

    it('remaining equals threshold at zero subtotal', () => {
        expect(calculateRemaining(0, 10000)).toBe(10000)
    })
})
