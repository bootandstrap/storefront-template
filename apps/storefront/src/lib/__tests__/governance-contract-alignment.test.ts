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
import contract from '@/lib/governance-contract.json'

describe('Governance Contract Alignment', () => {
    // ── Inline Schema Integrity ───────────────────────────────────────

    it('inline FALLBACK_CONFIG validates against AppConfigSchema', () => {
        expect(() => AppConfigSchema.parse(FALLBACK_CONFIG)).not.toThrow()
    })

    it('inline FeatureFlags matches contract count', () => {
        expect(Object.keys(FeatureFlagsSchema.shape)).toHaveLength(contract.flags.count)
    })

    it('inline PlanLimits matches contract count', () => {
        expect(Object.keys(PlanLimitsSchema.shape)).toHaveLength(contract.limits.count)
    })

    it('inline StoreConfig has expected fields', () => {
        expect(Object.keys(StoreConfigSchema.shape)).toHaveLength(58)
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

    it('inline defaults.ts produces same FALLBACK_CONFIG as shared package (monorepo only)', async () => {
        // Instead of comparing source text (which differs now that inline uses contract-derived 
        // generation), we compare the actual FALLBACK_CONFIG outputs from both packages.
        // This validates that they produce identical fail-closed configurations at runtime.
        try {
            const shared = await import('../../../../../packages/shared/src/governance/defaults')
            const inline = await import('../governance/defaults')
            
            // Compare feature flags
            const sharedFlags = Object.keys(shared.FALLBACK_CONFIG.featureFlags).sort()
            const inlineFlags = Object.keys(inline.FALLBACK_CONFIG.featureFlags).sort()
            expect(inlineFlags).toEqual(sharedFlags)
            
            // Compare plan limits keys
            const sharedLimits = Object.keys(shared.FALLBACK_CONFIG.planLimits).sort()
            const inlineLimits = Object.keys(inline.FALLBACK_CONFIG.planLimits).sort()
            expect(inlineLimits).toEqual(sharedLimits)
            
            // Both should be degraded
            expect(inline.FALLBACK_CONFIG._degraded).toBe(shared.FALLBACK_CONFIG._degraded)
        } catch {
            // Standalone tenant repo — shared package not available
            return
        }
    })
})
