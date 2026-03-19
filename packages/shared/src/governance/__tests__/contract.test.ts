/**
 * @module governance/__tests__/contract
 * @description Contract tests that validate governance schemas are consistent.
 *
 * These tests are the SOTA mechanism to prevent cross-repo drift.
 * They run in CI for ecommerce-template AND (via inline copies) storefront-template.
 * Any schema change that breaks these tests requires explicit attention.
 */

import { describe, it, expect } from 'vitest'
import {
    StoreConfigSchema,
    FeatureFlagsSchema,
    PlanLimitsSchema,
    AppConfigSchema,
    TenantStatusSchema,
    GovernanceRpcResultSchema,
} from '../schemas'
import { FALLBACK_CONFIG } from '../defaults'

describe('Governance Contract Tests', () => {
    // ── Schema Integrity ──────────────────────────────────────────────

    it('FALLBACK_CONFIG validates against AppConfigSchema', () => {
        expect(() => AppConfigSchema.parse(FALLBACK_CONFIG)).not.toThrow()
    })

    it('FeatureFlags has exactly 44 flags', () => {
        const shape = FeatureFlagsSchema.shape
        expect(Object.keys(shape)).toHaveLength(44)
    })

    it('PlanLimits has exactly 26 fields', () => {
        const shape = PlanLimitsSchema.shape
        expect(Object.keys(shape)).toHaveLength(26)
    })

    it('StoreConfig has exactly 58 fields', () => {
        const shape = StoreConfigSchema.shape
        expect(Object.keys(shape)).toHaveLength(58)
    })

    it('TenantStatus has exactly 4 values', () => {
        const values = TenantStatusSchema.options
        expect(values).toHaveLength(4)
        expect(values).toContain('active')
        expect(values).toContain('paused')
        expect(values).toContain('suspended')
        expect(values).toContain('maintenance_free')
    })

    // ── Fail-Closed Posture ───────────────────────────────────────────

    it('fallback is marked as degraded', () => {
        expect(FALLBACK_CONFIG._degraded).toBe(true)
    })

    it('all fallback flags are false except maintenance_mode', () => {
        const flags = FALLBACK_CONFIG.featureFlags
        for (const [key, value] of Object.entries(flags)) {
            if (key === 'enable_maintenance_mode') {
                expect(value).toBe(true)
            } else {
                expect(value).toBe(false)
            }
        }
    })

    it('all numeric fallback limits are zero (except languages/currencies)', () => {
        const limits = FALLBACK_CONFIG.planLimits
        const exceptionKeys = ['plan_name', 'plan_expires_at', 'max_languages', 'max_currencies']
        for (const [key, value] of Object.entries(limits)) {
            if (exceptionKeys.includes(key)) continue
            if (typeof value === 'number') {
                expect(value).toBe(0)
            }
        }
    })

    it('fallback allows 1 language and 1 currency minimum', () => {
        expect(FALLBACK_CONFIG.planLimits.max_languages).toBe(1)
        expect(FALLBACK_CONFIG.planLimits.max_currencies).toBe(1)
    })

    it('fallback plan name is "degraded"', () => {
        expect(FALLBACK_CONFIG.planLimits.plan_name).toBe('degraded')
    })

    // ── RPC Schema ────────────────────────────────────────────────────

    it('GovernanceRpcResult accepts null fields', () => {
        const result = GovernanceRpcResultSchema.parse({
            config: null,
            feature_flags: null,
            plan_limits: null,
            tenant_status: null,
        })
        expect(result.config).toBeNull()
        expect(result.feature_flags).toBeNull()
        expect(result.plan_limits).toBeNull()
        expect(result.tenant_status).toBeNull()
    })

    // ── Critical Business Fields Present ──────────────────────────────

    it('FeatureFlags includes all CRM flags', () => {
        const shape = FeatureFlagsSchema.shape
        expect(shape).toHaveProperty('enable_crm')
        expect(shape).toHaveProperty('enable_crm_segmentation')
        expect(shape).toHaveProperty('enable_crm_export')
    })

    it('FeatureFlags includes all Email Marketing flags', () => {
        const shape = FeatureFlagsSchema.shape
        expect(shape).toHaveProperty('enable_email_notifications')
        expect(shape).toHaveProperty('enable_abandoned_cart_emails')
        expect(shape).toHaveProperty('enable_email_campaigns')
        expect(shape).toHaveProperty('enable_email_templates')
    })

    it('PlanLimits uses max_requests_day (not max_api_calls_day)', () => {
        const shape = PlanLimitsSchema.shape
        expect(shape).toHaveProperty('max_requests_day')
        expect(shape).not.toHaveProperty('max_api_calls_day')
    })

    it('StoreConfig includes onboarding_completed', () => {
        const shape = StoreConfigSchema.shape
        expect(shape).toHaveProperty('onboarding_completed')
    })

    it('StoreConfig includes gamification fields', () => {
        const shape = StoreConfigSchema.shape
        expect(shape).toHaveProperty('achievements_unlocked')
        expect(shape).toHaveProperty('dismissed_tips')
        expect(shape).toHaveProperty('checklist_skipped')
        expect(shape).toHaveProperty('tour_completed')
        expect(shape).toHaveProperty('panel_language')
        expect(shape).toHaveProperty('storefront_language')
    })
})
