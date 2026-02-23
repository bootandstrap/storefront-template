/**
 * Tests for rate-limit module
 */
import { describe, it, expect, vi } from 'vitest'
import { createRateLimiter } from '../rate-limit'

describe('createRateLimiter', () => {
    it('allows requests under the limit', () => {
        const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
        expect(limiter.isLimited('ip1')).toBe(false) // 1
        expect(limiter.isLimited('ip1')).toBe(false) // 2
        expect(limiter.isLimited('ip1')).toBe(false) // 3
    })

    it('blocks requests over the limit', () => {
        const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })
        expect(limiter.isLimited('ip1')).toBe(false) // 1
        expect(limiter.isLimited('ip1')).toBe(false) // 2
        expect(limiter.isLimited('ip1')).toBe(true)  // 3 → blocked
        expect(limiter.isLimited('ip1')).toBe(true)  // 4 → still blocked
    })

    it('tracks keys independently', () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
        expect(limiter.isLimited('ip1')).toBe(false)
        expect(limiter.isLimited('ip2')).toBe(false)
        expect(limiter.isLimited('ip1')).toBe(true) // ip1 over limit
        expect(limiter.isLimited('ip2')).toBe(true) // ip2 over limit
    })

    it('resets after window expires', () => {
        vi.useFakeTimers()
        const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })

        expect(limiter.isLimited('ip1')).toBe(false)
        expect(limiter.isLimited('ip1')).toBe(true)

        // Advance past window
        vi.advanceTimersByTime(1001)

        expect(limiter.isLimited('ip1')).toBe(false) // window reset
        vi.useRealTimers()
    })

    it('reset(key) clears a specific key', () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
        expect(limiter.isLimited('ip1')).toBe(false)
        expect(limiter.isLimited('ip1')).toBe(true)

        limiter.reset('ip1')
        expect(limiter.isLimited('ip1')).toBe(false)
    })

    it('resetAll() clears all keys', () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
        limiter.isLimited('ip1')
        limiter.isLimited('ip1')
        limiter.isLimited('ip2')
        limiter.isLimited('ip2')

        expect(limiter.isLimited('ip1')).toBe(true)
        expect(limiter.isLimited('ip2')).toBe(true)

        limiter.resetAll()

        expect(limiter.isLimited('ip1')).toBe(false)
        expect(limiter.isLimited('ip2')).toBe(false)
    })

    it('isLimited() returns boolean synchronously (contract test)', () => {
        const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
        const result = limiter.isLimited('contract-test')
        // Must be a plain boolean, not a Promise
        expect(typeof result).toBe('boolean')
        expect(result).not.toBeInstanceOf(Promise)
    })
})
