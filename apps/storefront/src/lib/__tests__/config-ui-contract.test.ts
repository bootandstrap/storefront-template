/**
 * Config → UI Integration Contract Tests
 *
 * Validates that:
 * - FALLBACK_CONFIG forces maintenance mode (fail-closed posture)
 * - Every governance-contract.json flag has a FeatureFlagsSchema field
 * - Every governance-contract.json limit has a PlanLimitsSchema field
 * - Schemas parse correctly with realistic data
 *
 * v0.1 Release Gate — must pass before professional development begins.
 */

import { describe, it, expect } from 'vitest'
import { FALLBACK_CONFIG } from '../governance/defaults'
import {
    FeatureFlagsSchema,
    PlanLimitsSchema,
    StoreConfigSchema,
    AppConfigSchema,
} from '../governance/schemas'
import contract from '../governance-contract.json'

describe('Config → UI Integration Contract', () => {
    // ── Fail-Closed Posture ──

    it('FALLBACK_CONFIG forces maintenance mode', () => {
        expect(FALLBACK_CONFIG.featureFlags.enable_maintenance_mode).toBe(true)
    })

    it('FALLBACK_CONFIG marks as degraded', () => {
        expect(FALLBACK_CONFIG._degraded).toBe(true)
    })

    it('FALLBACK_CONFIG disables all non-maintenance flags', () => {
        const flags = FALLBACK_CONFIG.featureFlags
        for (const [key, value] of Object.entries(flags)) {
            if (key === 'enable_maintenance_mode') continue
            expect(value, `Flag ${key} should be false in fallback`).toBe(false)
        }
    })

    it('FALLBACK_CONFIG validates against AppConfigSchema', () => {
        expect(() => AppConfigSchema.parse(FALLBACK_CONFIG)).not.toThrow()
    })

    // ── Contract ↔ Schema Alignment ──

    it('every contract flag has a corresponding FeatureFlagsSchema field', () => {
        const schemaKeys = Object.keys(FeatureFlagsSchema.shape)
        const missing = contract.flags.keys.filter(k => !schemaKeys.includes(k))
        expect(
            missing,
            `Flags in contract but missing from schema: ${missing.join(', ')}`
        ).toHaveLength(0)
    })

    it('every contract limit has a corresponding PlanLimitsSchema field', () => {
        const schemaKeys = Object.keys(PlanLimitsSchema.shape)
        const missing = contract.limits.keys.filter(k => !schemaKeys.includes(k))
        expect(
            missing,
            `Limits in contract but missing from schema: ${missing.join(', ')}`
        ).toHaveLength(0)
    })

    it('FeatureFlagsSchema has exactly contract.flags.count fields', () => {
        expect(Object.keys(FeatureFlagsSchema.shape)).toHaveLength(contract.flags.count)
    })

    it('PlanLimitsSchema has exactly contract.limits.count fields', () => {
        expect(Object.keys(PlanLimitsSchema.shape)).toHaveLength(contract.limits.count)
    })

    // ── Schema Parsing ──

    it('FeatureFlagsSchema parses all-true flags', () => {
        const allTrue = Object.fromEntries(contract.flags.keys.map(k => [k, true]))
        expect(() => FeatureFlagsSchema.parse(allTrue)).not.toThrow()
    })

    it('FeatureFlagsSchema parses all-false flags', () => {
        const allFalse = Object.fromEntries(contract.flags.keys.map(k => [k, false]))
        expect(() => FeatureFlagsSchema.parse(allFalse)).not.toThrow()
    })

    it('PlanLimitsSchema parses enterprise limits', () => {
        const limits = Object.fromEntries(
            contract.limits.keys.map(k => {
                if (k === 'plan_name' || k === 'plan_tier') return [k, 'enterprise']
                if (k === 'plan_expires_at') return [k, null]
                return [k, 9999]
            })
        )
        expect(() => PlanLimitsSchema.parse(limits)).not.toThrow()
    })

    // ── StoreConfig fields ──

    it('StoreConfig has essential fields', () => {
        const keys = Object.keys(StoreConfigSchema.shape)
        expect(keys).toContain('business_name')
        expect(keys).toContain('primary_color')
        expect(keys).toContain('language')
    })

    // ── FALLBACK_CONFIG coverage ──

    it('FALLBACK_CONFIG.featureFlags has same keys as contract', () => {
        const fallbackKeys = Object.keys(FALLBACK_CONFIG.featureFlags).sort()
        const contractKeys = [...contract.flags.keys].sort()
        expect(fallbackKeys).toEqual(contractKeys)
    })

    it('FALLBACK_CONFIG.planLimits has same keys as contract', () => {
        const fallbackKeys = Object.keys(FALLBACK_CONFIG.planLimits).sort()
        const contractKeys = [...contract.limits.keys].sort()
        expect(fallbackKeys).toEqual(contractKeys)
    })
})
