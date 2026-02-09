import { describe, it, expect } from 'vitest'
import { getEnabledMethods } from '../payment-methods'
import type { FeatureFlags } from '../config'

// Helper to create flags with specific checkout methods enabled
function makeFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
    return {
        enable_whatsapp_checkout: false,
        enable_online_payments: false,
        enable_cash_on_delivery: false,
        enable_bank_transfer: false,
        enable_user_registration: true,
        enable_guest_checkout: true,
        require_auth_to_order: false,
        enable_google_auth: true,
        enable_email_auth: true,
        enable_reviews: false,
        enable_wishlist: false,
        enable_carousel: true,
        enable_cms_pages: false,
        enable_product_search: true,
        enable_analytics: false,
        enable_promotions: false,
        enable_multi_language: false,
        enable_multi_currency: false,
        enable_admin_api: false,
        enable_social_links: true,
        enable_order_notes: true,
        enable_address_management: true,
        enable_maintenance_mode: false,
        enable_owner_panel: true,
        enable_customer_accounts: true,
        enable_order_tracking: true,
        ...overrides,
    }
}

describe('getEnabledMethods', () => {
    it('returns empty array when no payment methods enabled', () => {
        const flags = makeFlags()
        expect(getEnabledMethods(flags)).toEqual([])
    })

    it('returns single method when only whatsapp enabled', () => {
        const flags = makeFlags({ enable_whatsapp_checkout: true })
        const methods = getEnabledMethods(flags)
        expect(methods).toHaveLength(1)
        expect(methods[0].id).toBe('whatsapp')
        expect(methods[0].variant).toBe('whatsapp')
    })

    it('returns single method when only card enabled', () => {
        const flags = makeFlags({ enable_online_payments: true })
        const methods = getEnabledMethods(flags)
        expect(methods).toHaveLength(1)
        expect(methods[0].id).toBe('card')
    })

    it('returns 2 methods sorted by priority', () => {
        const flags = makeFlags({
            enable_online_payments: true,
            enable_whatsapp_checkout: true,
        })
        const methods = getEnabledMethods(flags)
        expect(methods).toHaveLength(2)
        // WhatsApp has priority 1, Card has priority 2
        expect(methods[0].id).toBe('whatsapp')
        expect(methods[1].id).toBe('card')
    })

    it('returns all 4 methods when all enabled, sorted by priority', () => {
        const flags = makeFlags({
            enable_whatsapp_checkout: true,
            enable_online_payments: true,
            enable_cash_on_delivery: true,
            enable_bank_transfer: true,
        })
        const methods = getEnabledMethods(flags)
        expect(methods).toHaveLength(4)
        expect(methods.map((m) => m.id)).toEqual([
            'whatsapp',
            'card',
            'cod',
            'bank',
        ])
    })

    it('each method has required fields', () => {
        const flags = makeFlags({
            enable_whatsapp_checkout: true,
            enable_online_payments: true,
            enable_cash_on_delivery: true,
            enable_bank_transfer: true,
        })
        const methods = getEnabledMethods(flags)
        for (const m of methods) {
            expect(m.id).toBeTruthy()
            expect(m.flag).toBeTruthy()
            expect(m.label).toBeTruthy()
            expect(m.description).toBeTruthy()
            expect(m.icon).toBeDefined()
            expect(m.component).toBeTruthy()
            expect(typeof m.priority).toBe('number')
            expect(['whatsapp', 'primary', 'secondary', 'ghost']).toContain(m.variant)
        }
    })

    it('maintains correct priority ordering even with non-adjacent methods', () => {
        // Enable whatsapp (pri 1) and bank (pri 4) — skip card and cod
        const flags = makeFlags({
            enable_whatsapp_checkout: true,
            enable_bank_transfer: true,
        })
        const methods = getEnabledMethods(flags)
        expect(methods).toHaveLength(2)
        expect(methods[0].id).toBe('whatsapp')
        expect(methods[1].id).toBe('bank')
    })

    it('cod and bank have secondary variant', () => {
        const flags = makeFlags({
            enable_cash_on_delivery: true,
            enable_bank_transfer: true,
        })
        const methods = getEnabledMethods(flags)
        expect(methods.every((m) => m.variant === 'secondary')).toBe(true)
    })
})
