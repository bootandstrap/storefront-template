/**
 * limits-engine.test.ts — Tests for the checkLimit() utility
 *
 * Verifies that checkLimit produces correct LimitCheckResult objects
 * for various usage scenarios (zero, normal, warning, critical, exceeded).
 *
 * @module __tests__/governance/limits-engine.test
 */

import { describe, it, expect } from 'vitest'
import { checkLimit, getLimitSeverity } from '@/lib/limits'

// Build a minimal PlanLimits object for testing
function makeLimits(overrides: Record<string, number> = {}): Record<string, number> {
    return {
        max_products: 10,
        max_categories: 5,
        max_cms_pages: 3,
        max_carousel_slides: 5,
        max_promotions_active: 5,
        max_images_per_product: 10,
        max_customers: 100,
        max_orders_month: 50,
        max_crm_contacts: 50,
        max_email_sends_month: 100,
        max_chatbot_messages_month: 500,
        max_languages: 3,
        max_currencies: 3,
        max_badges: 5,
        max_newsletter_subscribers: 100,
        max_whatsapp_templates: 5,
        max_reviews_per_product: 50,
        max_wishlist_items: 100,
        max_custom_domains: 1,
        max_admin_users: 2,
        max_requests_day: 1000,
        max_file_upload_mb: 10,
        max_payment_methods: 3,
        max_pos_payment_methods: 3,
        storage_limit_mb: 500,
        ...overrides,
    }
}

describe('checkLimit()', () => {
    it('returns allowed=true when current < limit', () => {
        const limits = makeLimits({ max_products: 10 })
        const result = checkLimit(limits as never, 'max_products', 5)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(5)
        expect(result.limit).toBe(10)
        expect(result.current).toBe(5)
        expect(result.percentage).toBe(50)
    })

    it('returns allowed=false when current >= limit', () => {
        const limits = makeLimits({ max_products: 10 })
        const result = checkLimit(limits as never, 'max_products', 10)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.percentage).toBe(100)
    })

    it('returns allowed=false when current > limit', () => {
        const limits = makeLimits({ max_products: 10 })
        const result = checkLimit(limits as never, 'max_products', 15)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.percentage).toBe(150)
    })

    it('returns 0% for zero usage', () => {
        const limits = makeLimits({ max_products: 10 })
        const result = checkLimit(limits as never, 'max_products', 0)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(10)
        expect(result.percentage).toBe(0)
    })
})

describe('getLimitSeverity()', () => {
    it('returns "ok" for < 70%', () => {
        expect(getLimitSeverity({ allowed: true, remaining: 5, limit: 10, current: 3, percentage: 30 })).toBe('ok')
        expect(getLimitSeverity({ allowed: true, remaining: 3, limit: 10, current: 6, percentage: 60 })).toBe('ok')
        expect(getLimitSeverity({ allowed: true, remaining: 4, limit: 10, current: 6, percentage: 69 })).toBe('ok')
    })

    it('returns "warning" for 70-89%', () => {
        expect(getLimitSeverity({ allowed: true, remaining: 3, limit: 10, current: 7, percentage: 70 })).toBe('warning')
        expect(getLimitSeverity({ allowed: true, remaining: 2, limit: 10, current: 8, percentage: 80 })).toBe('warning')
        expect(getLimitSeverity({ allowed: true, remaining: 1, limit: 10, current: 8, percentage: 89 })).toBe('warning')
    })

    it('returns "critical" for >= 90%', () => {
        expect(getLimitSeverity({ allowed: true, remaining: 1, limit: 10, current: 9, percentage: 90 })).toBe('critical')
        expect(getLimitSeverity({ allowed: false, remaining: 0, limit: 10, current: 10, percentage: 100 })).toBe('critical')
        expect(getLimitSeverity({ allowed: false, remaining: 0, limit: 10, current: 12, percentage: 120 })).toBe('critical')
    })
})

describe('checkLimit — edge cases', () => {
    it('handles limit of 0 gracefully', () => {
        const limits = makeLimits({ max_products: 0 })
        const result = checkLimit(limits as never, 'max_products', 0)
        expect(result.allowed).toBe(false) // 0 < 0 is false
        expect(result.remaining).toBe(0)
        expect(result.percentage).toBe(0) // 0/0 → 0
    })

    it('handles limit of 1 at boundary', () => {
        const limits = makeLimits({ max_products: 1 })
        const atZero = checkLimit(limits as never, 'max_products', 0)
        expect(atZero.allowed).toBe(true)
        expect(atZero.remaining).toBe(1)

        const atOne = checkLimit(limits as never, 'max_products', 1)
        expect(atOne.allowed).toBe(false)
        expect(atOne.remaining).toBe(0)
    })

    it('works with all limitable resource keys', () => {
        const limits = makeLimits()
        // Should not throw for any valid key
        for (const key of Object.keys(limits)) {
            const result = checkLimit(limits as never, key as never, 0)
            expect(result.limit).toBeGreaterThanOrEqual(0)
        }
    })
})
