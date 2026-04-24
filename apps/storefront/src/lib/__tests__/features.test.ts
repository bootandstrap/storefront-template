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
    enable_google_oauth: true,
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
    enable_pos_reports: false,
    enable_pos_shifts: false,
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: false,
    enable_traffic_expansion: false,
    enable_traffic_analytics: false,
    enable_traffic_autoscale: false,
    enable_seo: false,
    enable_seo_tools: false,
    enable_social_media: false,
    enable_social_sharing: false,
    enable_automations: false,
    enable_custom_webhooks: false,
    enable_auth_advanced: false,
    enable_sales_channels: false,
    enable_reservation_checkout: false,
    enable_backups: false,
    enable_manual_backup: false,
    // Auth Advanced (granular)
    enable_apple_oauth: false,
    enable_facebook_oauth: false,
    enable_2fa: false,
    enable_magic_link: false,
    // CRM (granular)
    enable_crm_contacts: false,
    enable_crm_interactions: false,
    enable_crm_segments: false,
    // Email (granular)
    enable_transactional_emails: false,
    enable_review_request_emails: false,
    enable_email_segmentation: false,
    // Kiosk (granular)
    enable_kiosk_analytics: false,
    enable_kiosk_idle_timer: false,
    enable_kiosk_remote_management: false,
}

describe('isFeatureEnabled', () => {
    it('returns true for enabled flags', () => {
        expect(isFeatureEnabled(mockFlags, 'enable_whatsapp_checkout')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_cash_on_delivery')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_carousel')).toBe(true)
        expect(isFeatureEnabled(mockFlags, 'enable_google_oauth')).toBe(true)
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
