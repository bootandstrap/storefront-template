/**
 * governance-defaults.test.ts — Validates FALLBACK_CONFIG consistency
 *
 * Ensures the auto-derived FALLBACK_CONFIG in defaults.ts properly
 * reflects the current governance contract (no stale flags or limits).
 *
 * @module __tests__/governance/governance-defaults.test
 */

import { describe, it, expect } from 'vitest'
import { loadContract } from './governance-test-utils'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'

describe('FALLBACK_CONFIG — Feature Flags', () => {
    const contract = loadContract()

    it('has a flag entry for every contract flag', () => {
        const configFlags = FALLBACK_CONFIG.featureFlags as Record<string, boolean>
        for (const flag of contract.flags.keys) {
            expect(
                flag in configFlags,
                `FALLBACK_CONFIG.featureFlags is missing flag '${flag}'`
            ).toBe(true)
        }
    })

    it('all flags are false except enable_maintenance_mode', () => {
        const configFlags = FALLBACK_CONFIG.featureFlags as Record<string, boolean>
        for (const [key, value] of Object.entries(configFlags)) {
            if (key === 'enable_maintenance_mode') {
                expect(value).toBe(true) // Fail-closed: maintenance mode ON
            } else {
                expect(value, `Flag '${key}' should be false in fallback`).toBe(false)
            }
        }
    })
})

describe('FALLBACK_CONFIG — Plan Limits', () => {
    const contract = loadContract()

    it('has a limit entry for every contract numeric limit', () => {
        const configLimits = FALLBACK_CONFIG.planLimits as Record<string, unknown>
        for (const limit of contract.limits.numeric_keys) {
            expect(
                limit in configLimits,
                `FALLBACK_CONFIG.planLimits is missing limit '${limit}'`
            ).toBe(true)
        }
    })

    it('all numeric limits are 0 or minimum floor', () => {
        const configLimits = FALLBACK_CONFIG.planLimits as Record<string, unknown>
        const ALLOWED_FLOORS: Record<string, number> = {
            max_languages: 1,
            max_currencies: 1,
        }

        for (const limit of contract.limits.numeric_keys) {
            const value = configLimits[limit]
            const allowedFloor = ALLOWED_FLOORS[limit] ?? 0
            expect(
                value,
                `FALLBACK_CONFIG.planLimits['${limit}'] should be ${allowedFloor} (got ${value})`
            ).toBe(allowedFloor)
        }
    })
})

describe('FALLBACK_CONFIG — Safety Properties', () => {
    it('is marked as degraded', () => {
        expect(FALLBACK_CONFIG._degraded).toBe(true)
    })

    it('has tenant status "active"', () => {
        expect(FALLBACK_CONFIG.tenantStatus).toBe('active')
    })

    it('plan is not expired', () => {
        expect(FALLBACK_CONFIG.planExpired).toBe(false)
    })

    it('plan name is "degraded"', () => {
        const limits = FALLBACK_CONFIG.planLimits as Record<string, unknown>
        expect(limits.plan_name).toBe('degraded')
    })
})
