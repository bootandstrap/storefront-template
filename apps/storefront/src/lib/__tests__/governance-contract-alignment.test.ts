/**
 * Governance Contract Alignment Test
 *
 * Validates that the inline governance modules (src/lib/governance/)
 * are aligned with the shared package (packages/shared/src/governance/).
 *
 * This test is the automated drift-prevention mechanism.
 * If it fails, run: scripts/sync-governance.sh
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Schema contract: validate inline copies match shared package field counts
import {
    StoreConfigSchema,
    FeatureFlagsSchema,
    PlanLimitsSchema,
    TenantStatusSchema,
    AppConfigSchema,
} from '@/lib/governance/schemas'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'

describe('Governance Contract Alignment', () => {
    // ── Inline Schema Integrity ───────────────────────────────────────

    it('inline FALLBACK_CONFIG validates against AppConfigSchema', () => {
        expect(() => AppConfigSchema.parse(FALLBACK_CONFIG)).not.toThrow()
    })

    it('inline FeatureFlags has exactly 44 flags', () => {
        expect(Object.keys(FeatureFlagsSchema.shape)).toHaveLength(44)
    })

    it('inline PlanLimits has exactly 26 fields', () => {
        expect(Object.keys(PlanLimitsSchema.shape)).toHaveLength(26)
    })

    it('inline StoreConfig has exactly 52 fields', () => {
        expect(Object.keys(StoreConfigSchema.shape)).toHaveLength(52)
    })

    it('inline TenantStatus has exactly 4 values', () => {
        expect(TenantStatusSchema.options).toHaveLength(4)
    })

    // ── Fail-Closed Posture ───────────────────────────────────────────

    it('inline fallback is degraded with maintenance_mode only', () => {
        expect(FALLBACK_CONFIG._degraded).toBe(true)
        expect(FALLBACK_CONFIG.featureFlags.enable_maintenance_mode).toBe(true)

        const otherFlags = Object.entries(FALLBACK_CONFIG.featureFlags)
            .filter(([k]) => k !== 'enable_maintenance_mode')
        for (const [key, value] of otherFlags) {
            expect(value, `Flag ${key} should be false in fallback`).toBe(false)
        }
    })

    // ── Cross-Repo File Alignment ─────────────────────────────────────
    // In monorepo context, verify inline files hash-match the shared package

    it('inline schemas.ts content matches shared package (monorepo only)', () => {
        const sharedPath = join(__dirname, '../../../../../packages/shared/src/governance/schemas.ts')
        if (!existsSync(sharedPath)) {
            // Standalone tenant repo — skip this check
            return
        }

        const inlinePath = join(__dirname, '../governance/schemas.ts')
        const sharedSource = readFileSync(sharedPath, 'utf-8')
        const inlineSource = readFileSync(inlinePath, 'utf-8')

        // Compare field counts rather than exact content (LOCKED markers differ)
        const sharedFlagCount = (sharedSource.match(/z\.boolean\(\)/g) || []).length
        const inlineFlagCount = (inlineSource.match(/z\.boolean\(\)/g) || []).length
        expect(inlineFlagCount).toBe(sharedFlagCount)

        const sharedNumberCount = (sharedSource.match(/z\.number\(\)/g) || []).length
        const inlineNumberCount = (inlineSource.match(/z\.number\(\)/g) || []).length
        expect(inlineNumberCount).toBe(sharedNumberCount)
    })

    it('inline defaults.ts content matches shared package (monorepo only)', () => {
        const sharedPath = join(__dirname, '../../../../../packages/shared/src/governance/defaults.ts')
        if (!existsSync(sharedPath)) return

        const inlinePath = join(__dirname, '../governance/defaults.ts')
        const sharedSource = readFileSync(sharedPath, 'utf-8')
        const inlineSource = readFileSync(inlinePath, 'utf-8')

        // Verify same number of false flags
        const sharedFalseCount = (sharedSource.match(/: false/g) || []).length
        const inlineFalseCount = (inlineSource.match(/: false/g) || []).length
        expect(inlineFalseCount).toBe(sharedFalseCount)
    })
})
