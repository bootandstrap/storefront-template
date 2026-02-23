import { describe, it, expect } from 'vitest'
import { checkLimit, getLimitSeverity } from '../limits'
import type { PlanLimits } from '../config'

const mockLimits: PlanLimits = {
    max_products: 100,
    max_customers: 200,
    max_orders_month: 500,
    max_categories: 20,
    max_images_per_product: 10,
    max_cms_pages: 10,
    max_carousel_slides: 10,
    max_admin_users: 3,
    storage_limit_mb: 500,
    plan_name: 'starter',
    plan_expires_at: null,
    max_languages: 1,
    max_currencies: 1,
    max_whatsapp_templates: 5,
    max_file_upload_mb: 5,
    max_email_sends_month: 500,
    max_custom_domains: 1,
    max_chatbot_messages_month: 200,
    max_badges: 3,
    max_newsletter_subscribers: 100,
    max_api_calls_day: 100,
}

describe('checkLimit', () => {
    it('allows when under limit', () => {
        const result = checkLimit(mockLimits, 'max_products', 50)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(50)
        expect(result.limit).toBe(100)
        expect(result.current).toBe(50)
        expect(result.percentage).toBe(50)
    })

    it('allows when at zero usage', () => {
        const result = checkLimit(mockLimits, 'max_products', 0)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(100)
        expect(result.percentage).toBe(0)
    })

    it('blocks when at exact limit', () => {
        const result = checkLimit(mockLimits, 'max_products', 100)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.percentage).toBe(100)
    })

    it('blocks when over limit', () => {
        const result = checkLimit(mockLimits, 'max_products', 150)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.percentage).toBe(150)
    })

    it('works with small limits', () => {
        const result = checkLimit(mockLimits, 'max_admin_users', 2)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(1)
        expect(result.limit).toBe(3)
        expect(result.percentage).toBe(67)
    })

    it('checks different resource types correctly', () => {
        expect(checkLimit(mockLimits, 'max_customers', 199).allowed).toBe(true)
        expect(checkLimit(mockLimits, 'max_customers', 200).allowed).toBe(false)
        expect(checkLimit(mockLimits, 'max_categories', 19).allowed).toBe(true)
        expect(checkLimit(mockLimits, 'max_categories', 20).allowed).toBe(false)
        expect(checkLimit(mockLimits, 'max_languages', 0).allowed).toBe(true)
        expect(checkLimit(mockLimits, 'max_languages', 1).allowed).toBe(false)
    })

    it('calculates percentage correctly for edge cases', () => {
        // 1 out of 1 = 100%
        expect(checkLimit(mockLimits, 'max_currencies', 1).percentage).toBe(100)
        // 0 out of 1 = 0%
        expect(checkLimit(mockLimits, 'max_currencies', 0).percentage).toBe(0)
    })
})

describe('getLimitSeverity', () => {
    it('returns ok for low usage', () => {
        const result = checkLimit(mockLimits, 'max_products', 50)
        expect(getLimitSeverity(result)).toBe('ok')
    })

    it('returns ok at 69%', () => {
        const result = checkLimit(mockLimits, 'max_products', 69)
        expect(getLimitSeverity(result)).toBe('ok')
    })

    it('returns warning at 70%', () => {
        const result = checkLimit(mockLimits, 'max_products', 70)
        expect(getLimitSeverity(result)).toBe('warning')
    })

    it('returns warning at 89%', () => {
        const result = checkLimit(mockLimits, 'max_products', 89)
        expect(getLimitSeverity(result)).toBe('warning')
    })

    it('returns critical at 90%', () => {
        const result = checkLimit(mockLimits, 'max_products', 90)
        expect(getLimitSeverity(result)).toBe('critical')
    })

    it('returns critical at 100%', () => {
        const result = checkLimit(mockLimits, 'max_products', 100)
        expect(getLimitSeverity(result)).toBe('critical')
    })

    it('returns critical when over limit', () => {
        const result = checkLimit(mockLimits, 'max_products', 150)
        expect(getLimitSeverity(result)).toBe('critical')
    })
})
