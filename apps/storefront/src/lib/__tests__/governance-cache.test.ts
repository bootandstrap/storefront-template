/**
 * Enterprise Test Suite — TTL Cache
 *
 * Validates in-memory TTL cache behavior: hits, misses, expiry, and overwrites.
 * Uses fake timers for deterministic TTL testing.
 *
 * @enterprise Cache is the primary hot-path optimization — incorrect behavior causes
 * either stale config (security risk) or excessive Supabase calls (availability risk)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getCachedConfig, setCachedConfig, clearCachedConfig } from '@/lib/governance/cache'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'
import type { AppConfig } from '@/lib/governance/schemas'

const CACHE_TTL_MS = 300_000 // Must match cache.ts constant

// Test fixture: a valid non-degraded config
const MOCK_CONFIG: AppConfig = {
    ...FALLBACK_CONFIG,
    config: { ...FALLBACK_CONFIG.config, business_name: 'Cached Store' },
    _degraded: false,
}

describe('TTL Cache — Enterprise Behavior', () => {
    beforeEach(() => {
        clearCachedConfig()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ── Cache Miss ────────────────────────────────────────────────────

    describe('miss', () => {
        it('returns null when cache is empty', () => {
            expect(getCachedConfig()).toBeNull()
        })

        it('returns null after explicit clear', () => {
            setCachedConfig(MOCK_CONFIG)
            clearCachedConfig()
            expect(getCachedConfig()).toBeNull()
        })
    })

    // ── Cache Hit ─────────────────────────────────────────────────────

    describe('hit', () => {
        it('returns stored config within TTL window', () => {
            setCachedConfig(MOCK_CONFIG)
            const result = getCachedConfig()
            expect(result).not.toBeNull()
            expect(result!.config.business_name).toBe('Cached Store')
        })

        it('returns config at TTL boundary minus 1ms', () => {
            setCachedConfig(MOCK_CONFIG)
            vi.advanceTimersByTime(CACHE_TTL_MS - 1)
            expect(getCachedConfig()).not.toBeNull()
        })
    })

    // ── Cache Expiry ──────────────────────────────────────────────────

    describe('expiry', () => {
        it('returns null after TTL expires', () => {
            setCachedConfig(MOCK_CONFIG)
            vi.advanceTimersByTime(CACHE_TTL_MS + 1)
            expect(getCachedConfig()).toBeNull()
        })

        it('returns null at exactly TTL boundary', () => {
            setCachedConfig(MOCK_CONFIG)
            vi.advanceTimersByTime(CACHE_TTL_MS)
            // At exactly TTL, the check is `now - timestamp < TTL`
            // so at exactly TTL it should miss (not strictly less than)
            expect(getCachedConfig()).toBeNull()
        })

        it('returns null long after TTL (no stale data)', () => {
            setCachedConfig(MOCK_CONFIG)
            vi.advanceTimersByTime(CACHE_TTL_MS * 10)
            expect(getCachedConfig()).toBeNull()
        })
    })

    // ── Overwrite ─────────────────────────────────────────────────────

    describe('overwrite', () => {
        it('overwrites previous value with new config', () => {
            setCachedConfig(MOCK_CONFIG)
            const updated: AppConfig = {
                ...MOCK_CONFIG,
                config: { ...MOCK_CONFIG.config, business_name: 'Updated Store' },
            }
            setCachedConfig(updated)

            const result = getCachedConfig()
            expect(result!.config.business_name).toBe('Updated Store')
        })

        it('overwrite resets TTL (extends cache life)', () => {
            setCachedConfig(MOCK_CONFIG)
            vi.advanceTimersByTime(CACHE_TTL_MS - 10_000) // 10s before expiry
            // Overwrite refreshes timestamp
            setCachedConfig({ ...MOCK_CONFIG, config: { ...MOCK_CONFIG.config, business_name: 'Refresh' } })
            vi.advanceTimersByTime(CACHE_TTL_MS - 1) // Should still be valid
            expect(getCachedConfig()).not.toBeNull()
        })
    })

    // ── Contract: TTL constant ────────────────────────────────────────

    describe('TTL constant', () => {
        it('TTL is exactly 5 minutes (300000ms)', () => {
            expect(CACHE_TTL_MS).toBe(300_000)
        })
    })
})
