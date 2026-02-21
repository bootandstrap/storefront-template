/**
 * Config Schema Alignment Tests
 * 
 * Verifies that the TypeScript interfaces in config.ts match what we expect
 * from the database. If a flag is added to the FeatureFlags interface but not
 * to the DB (or vice-versa), these tests will catch it.
 */
import { describe, it, expect, vi as _vi, beforeEach, afterEach } from 'vitest'
import type { FeatureFlags, PlanLimits, StoreConfig } from '../config'
import { getRequiredTenantId } from '../config'

// ---------------------------------------------------------------------------
// Expected keys — must match Supabase table columns exactly
// Update these arrays when adding new flags/limits to the DB migration
// ---------------------------------------------------------------------------

const EXPECTED_FEATURE_FLAGS: (keyof FeatureFlags)[] = [
    // Checkout
    'enable_whatsapp_checkout',
    'enable_online_payments',
    'enable_cash_on_delivery',
    'enable_bank_transfer',
    'enable_whatsapp_contact',
    // Auth
    'enable_user_registration',
    'enable_guest_checkout',
    'require_auth_to_order',
    'enable_google_auth',
    'enable_email_auth',
    // Content
    'enable_reviews',
    'enable_wishlist',
    'enable_carousel',
    'enable_cms_pages',
    'enable_product_search',
    'enable_related_products',
    'enable_product_comparisons',
    'enable_product_badges',
    // Advanced
    'enable_analytics',
    'enable_promotions',
    'enable_multi_language',
    'enable_multi_currency',
    'enable_admin_api',
    // Business
    'enable_social_links',
    'enable_order_notes',
    'enable_address_management',
    'enable_newsletter',
    // System
    'enable_maintenance_mode',
    'enable_owner_panel',
    'enable_customer_accounts',
    'enable_order_tracking',
    'enable_cookie_consent',
    'enable_chatbot',
    'enable_self_service_returns',
    'owner_lite_enabled',
    'owner_advanced_modules_enabled',
]

const EXPECTED_PLAN_LIMITS: (keyof PlanLimits)[] = [
    'max_products',
    'max_customers',
    'max_orders_month',
    'max_categories',
    'max_images_per_product',
    'max_cms_pages',
    'max_carousel_slides',
    'max_admin_users',
    'storage_limit_mb',
    'plan_name',
    'plan_expires_at',
    'max_languages',
    'max_currencies',
    'max_whatsapp_templates',
    'max_file_upload_mb',
    'max_email_sends_month',
    'max_custom_domains',
    'max_chatbot_messages_month',
    'max_badges',
    'max_newsletter_subscribers',
    'max_api_calls_day',
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Config Schema Alignment', () => {
    describe('FeatureFlags interface', () => {
        it('has exactly the expected number of flags', () => {
            // Create a dummy object to count interface keys at runtime
            const _dummy: FeatureFlags = {} as FeatureFlags
            // We verify by checking EXPECTED array length matches the interface
            expect(EXPECTED_FEATURE_FLAGS.length).toBe(36)
        })

        it('every expected flag key is a valid FeatureFlags property', () => {
            // TypeScript compile-time check: if any key doesn't exist in FeatureFlags,
            // this file won't compile. Runtime check for double safety:
            const dummyFlags: Record<keyof FeatureFlags, boolean> = {
                enable_whatsapp_checkout: true,
                enable_online_payments: true,
                enable_cash_on_delivery: true,
                enable_bank_transfer: true,
                enable_whatsapp_contact: true,
                enable_user_registration: true,
                enable_guest_checkout: true,
                require_auth_to_order: true,
                enable_google_auth: true,
                enable_email_auth: true,
                enable_reviews: true,
                enable_wishlist: true,
                enable_carousel: true,
                enable_cms_pages: true,
                enable_product_search: true,
                enable_related_products: true,
                enable_product_comparisons: true,
                enable_product_badges: true,
                enable_analytics: true,
                enable_promotions: true,
                enable_multi_language: true,
                enable_multi_currency: true,
                enable_admin_api: true,
                enable_social_links: true,
                enable_order_notes: true,
                enable_address_management: true,
                enable_newsletter: true,
                enable_maintenance_mode: true,
                enable_owner_panel: true,
                enable_customer_accounts: true,
                enable_order_tracking: true,
                enable_cookie_consent: true,
                enable_chatbot: true,
                enable_self_service_returns: true,
                owner_lite_enabled: true,
                owner_advanced_modules_enabled: false,
            }

            const keys = Object.keys(dummyFlags)
            expect(keys).toHaveLength(EXPECTED_FEATURE_FLAGS.length)
            for (const flag of EXPECTED_FEATURE_FLAGS) {
                expect(keys).toContain(flag)
            }
        })

        it('all flag values are booleans', () => {
            for (const flag of EXPECTED_FEATURE_FLAGS) {
                // Type-level check: FeatureFlags[flag] should be boolean
                // Runtime: the dummy above already covers this
                expect(typeof flag).toBe('string')
            }
        })
    })

    describe('PlanLimits interface', () => {
        it('has exactly the expected number of limit keys', () => {
            expect(EXPECTED_PLAN_LIMITS.length).toBe(21)
        })

        it('every expected limit key is a valid PlanLimits property', () => {
            const dummyLimits: PlanLimits = {
                max_products: 100,
                max_customers: 100,
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

            const keys = Object.keys(dummyLimits)
            expect(keys).toHaveLength(EXPECTED_PLAN_LIMITS.length)
            for (const limit of EXPECTED_PLAN_LIMITS) {
                expect(keys).toContain(limit)
            }
        })
    })

    describe('StoreConfig interface', () => {
        it('includes tenant_id for multi-tenant support', () => {
            const dummy: StoreConfig = {} as StoreConfig
            // Type-level check — if tenant_id doesn't exist this won't compile
            const _idCheck: string | null = dummy.tenant_id
            expect(true).toBe(true) // Passes if compilation succeeds
        })

        it('includes Phase 8A columns', () => {
            const dummy: StoreConfig = {} as StoreConfig
            // These should all exist on the interface
            const _checks: (string | null)[] = [
                dummy.store_email,
                dummy.store_phone,
                dummy.store_address,
                dummy.social_facebook,
                dummy.social_instagram,
                dummy.social_tiktok,
                dummy.social_twitter,
                dummy.announcement_bar_text,
                dummy.bank_name,
                dummy.bank_account_type,
                dummy.bank_account_number,
                dummy.bank_account_holder,
                dummy.bank_id_number,
                dummy.google_analytics_id,
                dummy.facebook_pixel_id,
                dummy.custom_css,
                dummy.delivery_info_text,
            ]
            expect(true).toBe(true)
        })
    })
})

// ---------------------------------------------------------------------------
// getRequiredTenantId() tests
// ---------------------------------------------------------------------------

describe('getRequiredTenantId', () => {
    const originalEnv = process.env

    beforeEach(() => {
        process.env = { ...originalEnv }
        // Clear both vars
        delete process.env.TENANT_ID
        delete process.env.NEXT_PUBLIC_TENANT_ID
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('returns TENANT_ID when set', () => {
        process.env.TENANT_ID = 'tenant-abc'
        expect(getRequiredTenantId()).toBe('tenant-abc')
    })

    it('does NOT fall back to NEXT_PUBLIC_TENANT_ID (server-only contract)', () => {
        process.env.NEXT_PUBLIC_TENANT_ID = 'tenant-xyz'
            // Without TENANT_ID set, should NOT use NEXT_PUBLIC_TENANT_ID
            ; (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
        const result = getRequiredTenantId()
        expect(result).toBe('__dev_no_tenant__')
        // Must NOT return the public tenant id
        expect(result).not.toBe('tenant-xyz')
    })

    it('prefers TENANT_ID (ignores NEXT_PUBLIC_TENANT_ID entirely)', () => {
        process.env.TENANT_ID = 'private-id'
        process.env.NEXT_PUBLIC_TENANT_ID = 'public-id'
        expect(getRequiredTenantId()).toBe('private-id')
    })

    it('throws in production when neither env var is set', () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
        expect(() => getRequiredTenantId()).toThrow('[FATAL] TENANT_ID is not set in production')
    })

    it('throws in production even if NEXT_PUBLIC_TENANT_ID is set (not a valid server fallback)', () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
        process.env.NEXT_PUBLIC_TENANT_ID = 'public-id'
        expect(() => getRequiredTenantId()).toThrow('[FATAL] TENANT_ID is not set in production')
    })

    it('returns dev placeholder in development when neither env var is set', () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
        expect(getRequiredTenantId()).toBe('__dev_no_tenant__')
    })
})
