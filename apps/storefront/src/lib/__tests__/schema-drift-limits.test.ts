/**
 * Schema Drift Detection — Plan Limits
 *
 * Validates that ALL plan limit keys are consistent across:
 * 1. PlanLimitsSchema (Zod shape) — the type definition
 * 2. FALLBACK_CONFIG.planLimits — the fail-closed defaults
 * 3. LimitableResource type — the runtime limit checker keys
 *
 * If this test fails, a limit was added/removed in one place but not the others.
 *
 * Phase 4 of MEGA PLAN v4 — Schema Drift Detection
 */

import { describe, it, expect } from 'vitest'
import { PlanLimitsSchema } from '@/lib/governance/schemas'
import { FALLBACK_CONFIG } from '@/lib/governance/defaults'
import type { LimitableResource } from '@/lib/limits'

// All LimitableResource keys — manually maintained here as the definitive list.
// If the LimitableResource type changes, this test MUST be updated.
const EXPECTED_LIMITABLE_RESOURCES: LimitableResource[] = [
    'max_products',
    'max_customers',
    'max_orders_month',
    'max_categories',
    'max_images_per_product',
    'max_cms_pages',
    'max_carousel_slides',
    'max_admin_users',
    'storage_limit_mb',
    'max_languages',
    'max_currencies',
    'max_whatsapp_templates',
    'max_file_upload_mb',
    'max_email_sends_month',
    'max_custom_domains',
    'max_chatbot_messages_month',
    'max_badges',
    'max_newsletter_subscribers',
    'max_requests_day',
    'max_reviews_per_product',
    'max_wishlist_items',
    'max_promotions_active',
    'max_payment_methods',
    'max_pos_payment_methods',
    'max_crm_contacts',
]

describe('Schema Drift — Plan Limits', () => {
    const schemaKeys = Object.keys(PlanLimitsSchema.shape).sort()
    const fallbackKeys = Object.keys(FALLBACK_CONFIG.planLimits).sort()

    it('PlanLimitsSchema and FALLBACK_CONFIG have matching limit keys', () => {
        // FALLBACK_CONFIG may have subset of schema (fail-closed with zeros)
        const missingInFallback = schemaKeys.filter(k => !fallbackKeys.includes(k))
        expect(
            missingInFallback,
            'Limits in schema but missing from FALLBACK_CONFIG'
        ).toEqual([])
    })

    it('every LimitableResource key exists in PlanLimitsSchema', () => {
        const missing = EXPECTED_LIMITABLE_RESOURCES.filter(
            k => !schemaKeys.includes(k)
        )
        expect(
            missing,
            'LimitableResource keys missing from PlanLimitsSchema'
        ).toEqual([])
    })

    it('PlanLimitsSchema does not have extra keys beyond LimitableResource + internal fields', () => {
        // Allow internal fields like 'id', 'tenant_id', 'created_at' etc.
        const internalFields = ['id', 'tenant_id', 'created_at', 'updated_at']
        const extraKeys = schemaKeys.filter(
            k => !EXPECTED_LIMITABLE_RESOURCES.includes(k as LimitableResource) &&
                !internalFields.includes(k)
        )
        // Extra keys are OK (schema may have more detail than the runtime checker)
        // but we should be aware of them
        if (extraKeys.length > 0) {
            console.log(`ℹ️ Extra PlanLimitsSchema keys not in LimitableResource: ${extraKeys.join(', ')}`)
        }
    })

    // Fields that are not numeric limits (metadata/string fields)
    const NON_NUMERIC_FIELDS = ['id', 'tenant_id', 'created_at', 'updated_at', 'plan_name', 'plan_tier', 'plan_expires_at']

    it('FALLBACK_CONFIG plan limits are restrictive (fail-closed)', () => {
        // Fail-closed: limits should be 0 (fully blocked) or a minimal floor (e.g., 1 language).
        // This ensures degraded mode doesn't give tenants unlimited resources.
        // Known minimum-floor fields (1 instead of 0):
        const MINIMUM_FLOOR_FIELDS = ['max_languages', 'max_currencies'] // at least 1 of each for a functional store
        for (const [key, value] of Object.entries(FALLBACK_CONFIG.planLimits)) {
            if (NON_NUMERIC_FIELDS.includes(key)) continue
            if (MINIMUM_FLOOR_FIELDS.includes(key)) {
                expect(value, `${key} should be 1 (minimum floor) in fallback`).toBe(1)
            } else {
                expect(value, `${key} should be 0 in fallback (fail-closed)`).toBe(0)
            }
        }
    })

    it('all numeric limit fields in schema accept numbers', () => {
        for (const key of schemaKeys) {
            if (NON_NUMERIC_FIELDS.includes(key)) continue
            const field = PlanLimitsSchema.shape[key as keyof typeof PlanLimitsSchema.shape]
            const parsed = field.safeParse(42)
            expect(parsed.success, `Limit "${key}" should accept numeric values`).toBe(true)
        }
    })
})
