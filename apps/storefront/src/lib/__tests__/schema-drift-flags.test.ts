/**
 * Schema Drift Detection — Feature Flags
 *
 * Validates that ALL feature flag keys are consistent across:
 * 1. FeatureFlagsSchema (Zod shape) — the type definition
 * 2. FALLBACK_CONFIG.featureFlags — the fail-closed defaults
 * 3. FEATURE_GATE_MAP — the flag → module mapping
 * 4. CORE_INVARIANTS — the always-enabled flags
 *
 * If this test fails, a flag was added/removed in one place but not the others.
 *
 * Phase 4 of MEGA PLAN v4 — Schema Drift Detection
 */

import { describe, it, expect } from 'vitest'
import { FeatureFlagsSchema } from '@/lib/governance/schemas'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'
import { FEATURE_GATE_MAP } from '@/lib/feature-gate-config'
import { isFeatureEnabled } from '@/lib/features'

describe('Schema Drift — Feature Flags', () => {
    const schemaKeys = Object.keys(FeatureFlagsSchema.shape).sort()
    const fallbackKeys = Object.keys(FALLBACK_CONFIG.featureFlags).sort()

    it('FeatureFlagsSchema and FALLBACK_CONFIG have identical flag keys', () => {
        const missingInFallback = schemaKeys.filter(k => !fallbackKeys.includes(k))
        const extraInFallback = fallbackKeys.filter(k => !schemaKeys.includes(k))

        expect(missingInFallback, 'Flags in schema but missing from FALLBACK_CONFIG').toEqual([])
        expect(extraInFallback, 'Flags in FALLBACK_CONFIG but missing from schema').toEqual([])
    })

    // CORE_INVARIANTS (Set, not exported) — these flags must always return true
    // from isFeatureEnabled() even when feature flags say false.
    // Source: src/lib/features.ts
    //
    // NOTE: `enable_checkout` is in CORE_INVARIANTS but NOT in the schema.
    // It's a defensive guard — isFeatureEnabled returns true for it even though
    // it's not a real flag key. This is by design (future-proofing).
    const CORE_INVARIANTS_IN_SCHEMA = [
        'enable_customer_accounts',
        'enable_order_tracking',
    ]
    const CORE_INVARIANTS_DEFENSIVE = [
        'enable_checkout', // Not in schema — defensive guard only
    ]

    it('known core invariant flags exist in the schema', () => {
        for (const flag of CORE_INVARIANTS_IN_SCHEMA) {
            expect(schemaKeys, `Core invariant "${flag}" not in FeatureFlagsSchema`).toContain(flag)
        }
    })

    it('defensive core invariants are NOT in the schema (expected)', () => {
        for (const flag of CORE_INVARIANTS_DEFENSIVE) {
            expect(schemaKeys).not.toContain(flag)
        }
    })

    it('core invariant flags return true even when set to false', () => {
        const allFalseFlags = Object.fromEntries(
            schemaKeys.map(k => [k, false])
        )
        for (const flag of CORE_INVARIANTS_IN_SCHEMA) {
            expect(
                isFeatureEnabled(allFalseFlags as any, flag as any),
                `Core invariant "${flag}" should always be enabled`
            ).toBe(true)
        }
    })

    it('every FEATURE_GATE_MAP flag exists in the schema', () => {
        const gateFlags = Object.keys(FEATURE_GATE_MAP)
        const missing = gateFlags.filter(f => !schemaKeys.includes(f))
        expect(missing, 'Flags in FEATURE_GATE_MAP but not in FeatureFlagsSchema').toEqual([])
    })

    it('all flags are boolean type in the schema', () => {
        for (const key of schemaKeys) {
            const field = FeatureFlagsSchema.shape[key as keyof typeof FeatureFlagsSchema.shape]
            // Zod boolean fields have _def.typeName === 'ZodBoolean' or similar
            const parsed = field.safeParse(true)
            expect(parsed.success, `Flag "${key}" should accept boolean values`).toBe(true)
            const parsedString = field.safeParse('not-a-boolean')
            expect(parsedString.success, `Flag "${key}" should reject non-boolean values`).toBe(false)
        }
    })

    it('FALLBACK_CONFIG has all flags set to false except enable_maintenance_mode', () => {
        for (const [key, value] of Object.entries(FALLBACK_CONFIG.featureFlags)) {
            if (key === 'enable_maintenance_mode') {
                expect(value, 'enable_maintenance_mode should be true in fallback').toBe(true)
            } else {
                expect(value, `${key} should be false in fallback (fail-closed)`).toBe(false)
            }
        }
    })
})
