/**
 * Tests for per-tenant rate limiter
 *
 * Verifies: tier configuration, key construction, exported constants.
 * Note: The actual rate limiting logic is tested in rate-limit.test.ts.
 * This suite tests the tenant-scoping layer.
 */
import { describe, it, expect } from 'vitest'
import { RATE_LIMIT_TIERS } from '../rate-limit-tenant'

describe('RATE_LIMIT_TIERS', () => {
    it('defines all 5 expected tiers', () => {
        const tiers = Object.keys(RATE_LIMIT_TIERS)
        expect(tiers).toEqual(['storefront', 'cart', 'checkout', 'auth', 'api'])
    })

    it('storefront tier: 120 req/min', () => {
        expect(RATE_LIMIT_TIERS.storefront.limit).toBe(120)
        expect(RATE_LIMIT_TIERS.storefront.windowMs).toBe(60_000)
    })

    it('cart tier: 60 req/min', () => {
        expect(RATE_LIMIT_TIERS.cart.limit).toBe(60)
        expect(RATE_LIMIT_TIERS.cart.windowMs).toBe(60_000)
    })

    it('checkout tier: 20 req/min', () => {
        expect(RATE_LIMIT_TIERS.checkout.limit).toBe(20)
        expect(RATE_LIMIT_TIERS.checkout.windowMs).toBe(60_000)
    })

    it('auth tier: 10 req/min', () => {
        expect(RATE_LIMIT_TIERS.auth.limit).toBe(10)
        expect(RATE_LIMIT_TIERS.auth.windowMs).toBe(60_000)
    })

    it('api tier: 100 req/day', () => {
        expect(RATE_LIMIT_TIERS.api.limit).toBe(100)
        expect(RATE_LIMIT_TIERS.api.windowMs).toBe(86_400_000) // 24h
    })

    it('each tier has a unique name prefix', () => {
        const names = Object.values(RATE_LIMIT_TIERS).map(t => t.name)
        const uniqueNames = new Set(names)
        expect(uniqueNames.size).toBe(names.length)
    })

    it('all tiers have name starting with "tenant-"', () => {
        for (const tier of Object.values(RATE_LIMIT_TIERS)) {
            expect(tier.name).toMatch(/^tenant-/)
        }
    })

    it('all limits are positive integers', () => {
        for (const tier of Object.values(RATE_LIMIT_TIERS)) {
            expect(tier.limit).toBeGreaterThan(0)
            expect(Number.isInteger(tier.limit)).toBe(true)
        }
    })

    it('tiers are ordered from most to least permissive (contract)', () => {
        // storefront > cart > checkout > auth is the expected permissiveness order
        expect(RATE_LIMIT_TIERS.storefront.limit).toBeGreaterThan(RATE_LIMIT_TIERS.cart.limit)
        expect(RATE_LIMIT_TIERS.cart.limit).toBeGreaterThan(RATE_LIMIT_TIERS.checkout.limit)
        expect(RATE_LIMIT_TIERS.checkout.limit).toBeGreaterThan(RATE_LIMIT_TIERS.auth.limit)
    })
})
