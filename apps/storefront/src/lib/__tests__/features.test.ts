import { describe, it, expect } from 'vitest'
import { isFeatureEnabled } from '../features'
import type { FeatureFlags } from '../config'

// Minimal mock flags for testing
const mockFlags: FeatureFlags = {
    enable_whatsapp_checkout: true,
    enable_online_payments: false,
    enable_cash_on_delivery: true,
    enable_bank_transfer: false,
    enable_whatsapp_contact: true,
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
    enable_cookie_consent: true,
    enable_chatbot: false,
    enable_self_service_returns: false,
    enable_related_products: true,
    enable_product_comparisons: false,
    enable_product_badges: true,
    enable_newsletter: false,
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: false,
}

describe('isFeatureEnabled', () => {
    it('returns true for enabled flags', () => {
        expect(isFeatureEnabled(mockFlags, 'enable_whatsapp_checkout')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_cash_on_delivery')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_carousel')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_google_auth')).toBe(true)
    })

    it('returns false for disabled flags', () => {
        expect(isFeatureEnabled(mockFlags, 'enable_online_payments')).toBe(false)
        expect(isFeatureEnabled(mockFlags, 'enable_bank_transfer')).toBe(false)
        expect(isFeatureEnabled(mockFlags, 'enable_reviews')).toBe(false)
        expect(isFeatureEnabled(mockFlags, 'enable_analytics')).toBe(false)
        expect(isFeatureEnabled(mockFlags, 'enable_maintenance_mode')).toBe(false)
    })

    it('checks all checkout-related flags correctly', () => {
        expect(isFeatureEnabled(mockFlags, 'enable_whatsapp_checkout')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_online_payments')).toBe(false)
        expect(isFeatureEnabled(mockFlags, 'enable_cash_on_delivery')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_bank_transfer')).toBe(false)
    })

    it('checks auth flags', () => {
        expect(isFeatureEnabled(mockFlags, 'enable_user_registration')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_guest_checkout')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'require_auth_to_order')).toBe(false)
    })

    it('handles all flags without throwing', () => {
        const allKeys = Object.keys(mockFlags) as (keyof FeatureFlags)[]
        for (const key of allKeys) {
            expect(() => isFeatureEnabled(mockFlags, key)).not.toThrow()
        }
    })
})
