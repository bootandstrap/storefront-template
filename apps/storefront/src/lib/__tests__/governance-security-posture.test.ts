/**
 * Enterprise Test Suite — Security Posture Validation
 *
 * Verifies fail-closed defaults, tenant isolation guarantees,
 * degraded mode reporting structure, and security invariants.
 *
 * @enterprise These tests are the "last line of defense" — if they break,
 * unpaid tenants could access premium features or maintenance mode could fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'
import { AppConfigSchema, FeatureFlagsSchema, PlanLimitsSchema } from '@/lib/governance/schemas'
import { getRequiredTenantId, isBuildPhase } from '@/lib/governance/tenant'
import { reportDegradedMode } from '@/lib/governance/report'

describe('Security Posture — Enterprise Invariants', () => {

    // ── Fail-Closed Defaults ──────────────────────────────────────────

    describe('FALLBACK_CONFIG invariants', () => {
        it('is structurally valid against AppConfigSchema', () => {
            expect(() => AppConfigSchema.parse(FALLBACK_CONFIG)).not.toThrow()
        })

        it('has _degraded=true (always identifies as degraded)', () => {
            expect(FALLBACK_CONFIG._degraded).toBe(true)
        })

        it('maintenance_mode is the ONLY true flag', () => {
            const trueFlags = Object.entries(FALLBACK_CONFIG.featureFlags)
                .filter(([, v]) => v === true)
                .map(([k]) => k)
            expect(trueFlags).toEqual(['enable_maintenance_mode'])
        })

        it('all 43 non-maintenance flags are false', () => {
            const falseFlags = Object.entries(FALLBACK_CONFIG.featureFlags)
                .filter(([, v]) => v === false)
            expect(falseFlags).toHaveLength(43)
        })

        it('all numeric plan limits are zero (no free access)', () => {
            const numericLimits = Object.entries(FALLBACK_CONFIG.planLimits)
                .filter(([k, v]) => typeof v === 'number' && !['max_languages', 'max_currencies'].includes(k))
            for (const [key, value] of numericLimits) {
                expect(value, `Limit ${key} should be 0 in fallback`).toBe(0)
            }
        })

        it('max_languages and max_currencies are 1 (minimum viable)', () => {
            expect(FALLBACK_CONFIG.planLimits.max_languages).toBe(1)
            expect(FALLBACK_CONFIG.planLimits.max_currencies).toBe(1)
        })

        it('plan_name is "degraded" (not a real plan)', () => {
            expect(FALLBACK_CONFIG.planLimits.plan_name).toBe('degraded')
        })

        it('planExpired is false (never treat fallback as expired)', () => {
            expect(FALLBACK_CONFIG.planExpired).toBe(false)
        })

        it('tenantStatus is "active" (not suspended)', () => {
            expect(FALLBACK_CONFIG.tenantStatus).toBe('active')
        })

        it('ecommerce is disabled in fallback (no unpaid sales)', () => {
            expect(FALLBACK_CONFIG.featureFlags.enable_ecommerce).toBe(false)
        })

        it('owner panel is disabled in fallback', () => {
            expect(FALLBACK_CONFIG.featureFlags.enable_owner_panel).toBe(false)
        })

        it('all payment methods disabled in fallback', () => {
            expect(FALLBACK_CONFIG.featureFlags.enable_online_payments).toBe(false)
            expect(FALLBACK_CONFIG.featureFlags.enable_whatsapp_checkout).toBe(false)
            expect(FALLBACK_CONFIG.featureFlags.enable_cash_on_delivery).toBe(false)
            expect(FALLBACK_CONFIG.featureFlags.enable_bank_transfer).toBe(false)
        })
    })

    // ── Schema Field Count Guards ─────────────────────────────────────

    describe('schema field count guards (prevent accidental additions/removals)', () => {
        it('FeatureFlags has exactly 44 flags', () => {
            expect(Object.keys(FeatureFlagsSchema.shape)).toHaveLength(44)
        })

        it('PlanLimits has exactly 26 fields', () => {
            expect(Object.keys(PlanLimitsSchema.shape)).toHaveLength(26)
        })

        it('FALLBACK_CONFIG flags count matches schema', () => {
            const schemaCount = Object.keys(FeatureFlagsSchema.shape).length
            const fallbackCount = Object.keys(FALLBACK_CONFIG.featureFlags).length
            expect(fallbackCount).toBe(schemaCount)
        })

        it('FALLBACK_CONFIG limits count matches schema', () => {
            const schemaCount = Object.keys(PlanLimitsSchema.shape).length
            const fallbackCount = Object.keys(FALLBACK_CONFIG.planLimits).length
            expect(fallbackCount).toBe(schemaCount)
        })
    })

    // ── Tenant Isolation ──────────────────────────────────────────────

    describe('tenant isolation', () => {
        const originalEnv = process.env

        beforeEach(() => {
            process.env = { ...originalEnv }
        })

        afterEach(() => {
            process.env = originalEnv
        })

        it('build phase returns placeholder (never real tenant data)', () => {
            process.env.NEXT_PHASE = 'phase-production-build'
            delete process.env.TENANT_ID
            expect(isBuildPhase()).toBe(true)
            expect(getRequiredTenantId()).toBe('__build_prerender__')
        })

        it('production without TENANT_ID throws (never silently default)', () => {
            delete process.env.TENANT_ID
            delete process.env.NEXT_PHASE
            ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
            expect(() => getRequiredTenantId()).toThrow('[FATAL]')
        })

        it('NEXT_PUBLIC_TENANT_ID is NEVER used (client-visible env = insecure)', () => {
            delete process.env.TENANT_ID
            process.env.NEXT_PUBLIC_TENANT_ID = 'public-leak-id'
            ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
            const result = getRequiredTenantId()
            expect(result).not.toBe('public-leak-id')
        })
    })

    // ── Degraded Mode Reporting Structure ──────────────────────────────

    describe('reportDegradedMode', () => {
        let consoleSpy: ReturnType<typeof vi.spyOn>

        beforeEach(() => {
            consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        })

        afterEach(() => {
            consoleSpy.mockRestore()
        })

        it('emits structured JSON log with all required APM fields', () => {
            reportDegradedMode('tenant-test-1', 'Supabase timeout')

            expect(consoleSpy).toHaveBeenCalledTimes(1)
            const logStr = consoleSpy.mock.calls[0][0] as string
            const log = JSON.parse(logStr)

            // Required APM fields
            expect(log.level).toBe('error')
            expect(log.service).toBe('storefront')
            expect(log.timestamp).toBeDefined()
            expect(log.tenant_id).toBe('tenant-test-1')
            expect(log.severity).toBe('critical')
            expect(log.error).toBe('Supabase timeout')
            expect(log.action).toBe('degraded_mode_activated')
        })

        it('timestamp is ISO-8601 format', () => {
            reportDegradedMode('tenant-2', 'test')
            const log = JSON.parse(consoleSpy.mock.calls[0][0] as string)
            expect(() => new Date(log.timestamp)).not.toThrow()
            expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })

        it('does not throw when Supabase URL is missing (fire-and-forget)', () => {
            const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            delete process.env.NEXT_PUBLIC_SUPABASE_URL
            expect(() => reportDegradedMode('tenant-3', 'test')).not.toThrow()
            process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
        })

        it('does not throw when service role key is missing', () => {
            const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            delete process.env.SUPABASE_SERVICE_ROLE_KEY
            expect(() => reportDegradedMode('tenant-4', 'test')).not.toThrow()
            process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
        })
    })
})
