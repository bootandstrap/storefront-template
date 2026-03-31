import { describe, it, expect } from 'vitest'
import { getEnabledMethods } from '../payment-methods'
import type { FeatureFlags, PlanLimits } from '../config'

// Helper to create flags with specific checkout methods enabled
function makeFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
    return {
        enable_whatsapp_checkout: false,
        enable_online_payments: false,
        enable_cash_on_delivery: false,
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
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: false,
        enable_newsletter: false,
        enable_product_comparisons: false,
        enable_product_badges: true,
        enable_chatbot: false,
        enable_related_products: true,
        enable_cookie_consent: true,
        enable_self_service_returns: false,
        enable_ecommerce: false,
        enable_crm: false,
        enable_crm_segmentation: false,
        enable_crm_export: false,
        enable_email_notifications: false,
        enable_abandoned_cart_emails: false,
        enable_email_campaigns: false,
        enable_email_templates: false,
        enable_pos: false,
        enable_pos_kiosk: false,
        enable_pos_keyboard_shortcuts: false,
        enable_pos_quick_sale: false,
        enable_pos_offline_cart: false,
        enable_pos_thermal_printer: false,
        enable_pos_line_discounts: false,
        enable_pos_customer_search: false,
        enable_pos_multi_device: false,
        enable_pos_shifts: false,
        enable_traffic_expansion: false,
        enable_traffic_analytics: false,
        enable_traffic_autoscale: false,
        enable_seo: false,
        enable_social_media: false,
        enable_automations: false,
        enable_auth_advanced: false,
        enable_sales_channels: false,
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
            'bank_transfer',
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
        expect(methods[1].id).toBe('bank_transfer')
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

// ---------------------------------------------------------------------------
// Plan limit enforcement: max_payment_methods
// ---------------------------------------------------------------------------

describe('getEnabledMethods — max_payment_methods limit', () => {
    const allEnabledFlags = makeFlags({
        enable_whatsapp_checkout: true,
        enable_online_payments: true,
        enable_cash_on_delivery: true,
        enable_bank_transfer: true,
    })

    function makeLimits(overrides: Partial<PlanLimits> = {}): PlanLimits {
        return {
            max_products: 100,
            max_customers: 1000,
            max_orders_month: 500,
            max_categories: 50,
            max_images_per_product: 10,
            max_cms_pages: 20,
            max_carousel_slides: 10,
            max_admin_users: 5,
            storage_limit_mb: 500,
            max_languages: 5,
            max_currencies: 5,
            max_whatsapp_templates: 10,
            max_file_upload_mb: 10,
            max_email_sends_month: 1000,
            max_custom_domains: 1,
            max_chatbot_messages_month: 500,
            max_badges: 10,
            max_newsletter_subscribers: 1000,
            max_requests_day: 10000,
            max_reviews_per_product: 50,
            max_wishlist_items: 100,
            max_promotions_active: 10,
            max_payment_methods: 4,
            max_crm_contacts: 500,
            plan_tier: 'starter',
            max_pos_payment_methods: 4,
            ...overrides,
        } as PlanLimits
    }

    it('clamps to max_payment_methods when enabled methods exceed limit', () => {
        const limits = makeLimits({ max_payment_methods: 2 })
        const methods = getEnabledMethods(allEnabledFlags, limits)
        expect(methods).toHaveLength(2)
        // Should keep highest priority (lowest number) methods
        expect(methods[0].id).toBe('whatsapp')
        expect(methods[1].id).toBe('card')
    })

    it('returns all when max_payment_methods is 0 (unlimited)', () => {
        const limits = makeLimits({ max_payment_methods: 0 })
        const methods = getEnabledMethods(allEnabledFlags, limits)
        expect(methods).toHaveLength(4)
    })

    it('returns all when limits param is null (backward compat)', () => {
        const methods = getEnabledMethods(allEnabledFlags, null)
        expect(methods).toHaveLength(4)
    })

    it('returns all when limits param is undefined (backward compat)', () => {
        const methods = getEnabledMethods(allEnabledFlags)
        expect(methods).toHaveLength(4)
    })

    it('clamps to 1 when max_payment_methods = 1 (only highest priority)', () => {
        const limits = makeLimits({ max_payment_methods: 1 })
        const methods = getEnabledMethods(allEnabledFlags, limits)
        expect(methods).toHaveLength(1)
        expect(methods[0].id).toBe('whatsapp')
    })

    it('does not clamp when enabled count equals limit', () => {
        const limits = makeLimits({ max_payment_methods: 4 })
        const methods = getEnabledMethods(allEnabledFlags, limits)
        expect(methods).toHaveLength(4)
    })

    it('does not clamp when enabled count is below limit', () => {
        const twoFlags = makeFlags({
            enable_whatsapp_checkout: true,
            enable_online_payments: true,
        })
        const limits = makeLimits({ max_payment_methods: 4 })
        const methods = getEnabledMethods(twoFlags, limits)
        expect(methods).toHaveLength(2)
    })
})
