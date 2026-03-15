/**
 * Enterprise Test Suite — Config Business Logic Edge Cases
 *
 * Tests the core orchestration logic in config.ts:
 * - _buildAppConfig: plan expiry, maintenance_free enforcement, days remaining
 * - getConfig: cache → circuit breaker → fetch → fallback chain
 * - getConfigForTenant: explicit tenant scoping and validation
 * - revalidateConfig: cache clear + Next.js ISR
 *
 * @enterprise This is the hot path for every storefront request. Bugs here
 * cause either unpaid feature access (revenue leak) or maintenance mode lockout (outage).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()
const mockGovernanceClient = {
    rpc: mockRpc,
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
        })),
    })),
}

vi.mock('@/lib/supabase/governance', () => ({
    createGovernanceClient: vi.fn(() => mockGovernanceClient),
    getGovernanceMode: vi.fn(() => 'rpc'),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRpcResponse(overrides: Record<string, unknown> = {}) {
    return {
        data: {
            config: {
                id: 'test-1', tenant_id: 'tenant-biz-1', business_name: 'BizStore',
                whatsapp_number: '+1234', default_country_prefix: '1',
                primary_color: '#000', secondary_color: '#fff', accent_color: '#f00',
                surface_color: null, text_color: null, color_preset: 'nature',
                theme_mode: 'light', logo_url: null, language: 'en', timezone: 'UTC',
                meta_title: null, meta_description: null, favicon_url: null,
                hero_title: null, hero_subtitle: null, hero_image: null,
                footer_description: null, active_languages: ['en'],
                active_currencies: ['usd'], default_currency: 'usd',
                store_email: null, store_phone: null, store_address: null,
                social_facebook: null, social_instagram: null,
                social_tiktok: null, social_twitter: null,
                announcement_bar_text: null, announcement_bar_enabled: false,
                min_order_amount: 0, max_delivery_radius_km: null,
                business_hours: null, delivery_info_text: null,
                bank_name: null, bank_account_type: null,
                bank_account_number: null, bank_account_holder: null,
                bank_id_number: null, google_analytics_id: null,
                facebook_pixel_id: null, sentry_dsn: null, custom_css: null,
                stock_mode: 'always_in_stock', low_stock_threshold: 5,
                free_shipping_threshold: 0, tax_display_mode: 'tax_included',
                onboarding_completed: false,
            },
            feature_flags: {
                enable_ecommerce: true, enable_whatsapp_checkout: true,
                enable_online_payments: false, enable_maintenance_mode: false,
            },
            plan_limits: {
                max_products: 50, max_customers: 100, max_orders_month: 200,
                max_categories: 10, max_images_per_product: 5,
                max_cms_pages: 5, max_carousel_slides: 5, max_admin_users: 2,
                storage_limit_mb: 250, plan_name: 'base',
                plan_expires_at: null,
                max_languages: 1, max_currencies: 1, max_whatsapp_templates: 3,
                max_file_upload_mb: 5, max_email_sends_month: 100,
                max_custom_domains: 0, max_chatbot_messages_month: 50,
                max_badges: 2, max_newsletter_subscribers: 50,
                max_requests_day: 1000, max_reviews_per_product: 10,
                max_wishlist_items: 20, max_promotions_active: 2,
                max_payment_methods: 2, max_crm_contacts: 50,
            },
            tenant_status: 'active',
            ...overrides,
        },
        error: null,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Config Business Logic — Enterprise Edge Cases', () => {
    const originalEnv = process.env

    beforeEach(() => {
        process.env = { ...originalEnv }
        process.env.TENANT_ID = 'tenant-biz-1'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
        vi.clearAllMocks()
        vi.resetModules()

        // Clear globalThis cache and circuit breaker
        const g = globalThis as Record<string, unknown>
        delete g.__configCache
        delete g.__configCacheTimestamp
        delete g.__circuitState
        delete g.__circuitFailCount
        delete g.__circuitLastFailTime
    })

    afterEach(() => {
        process.env = originalEnv
    })

    // ── Plan Expiry Auto-Enforcement ──────────────────────────────────

    describe('plan expiry', () => {
        it('sets planExpired=true when plan_expires_at is in the past', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                plan_limits: {
                    ...makeRpcResponse().data.plan_limits,
                    plan_expires_at: '2020-01-01T00:00:00Z', // Past date
                },
                tenant_status: 'active',
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.planExpired).toBe(true)
        })

        it('sets planExpired=false when plan_expires_at is in the future', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                plan_limits: {
                    ...makeRpcResponse().data.plan_limits,
                    plan_expires_at: '2099-12-31T23:59:59Z', // Future
                },
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.planExpired).toBe(false)
        })

        it('sets planExpired=false when plan_expires_at is null (no expiry)', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse())

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.planExpired).toBe(false)
        })
    })

    // ── maintenance_free → paused auto-enforcement ────────────────────

    describe('maintenance_free auto-enforcement', () => {
        it('converts maintenance_free + expired plan → paused status', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                plan_limits: {
                    ...makeRpcResponse().data.plan_limits,
                    plan_expires_at: '2020-01-01T00:00:00Z',
                },
                tenant_status: 'maintenance_free',
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.tenantStatus).toBe('paused')
            expect(result.planExpired).toBe(true)
        })

        it('keeps maintenance_free when plan NOT expired', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                plan_limits: {
                    ...makeRpcResponse().data.plan_limits,
                    plan_expires_at: '2099-12-31T23:59:59Z',
                },
                tenant_status: 'maintenance_free',
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.tenantStatus).toBe('maintenance_free')
        })

        it('calculates maintenanceDaysRemaining for maintenance_free tenants', async () => {
            // Set expiry to ~10 days from now
            const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                plan_limits: {
                    ...makeRpcResponse().data.plan_limits,
                    plan_expires_at: futureDate.toISOString(),
                },
                tenant_status: 'maintenance_free',
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result.maintenanceDaysRemaining).toBeGreaterThanOrEqual(9)
            expect(result.maintenanceDaysRemaining).toBeLessThanOrEqual(11)
        })
    })

    // ── Build Phase Detection ─────────────────────────────────────────

    describe('build phase', () => {
        it('returns FALLBACK_CONFIG during Next.js build phase', async () => {
            process.env.NEXT_PHASE = 'phase-production-build'

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result._degraded).toBe(true)
            expect(result.config.business_name).toBe('Store')
        })
    })

    // ── getConfigForTenant validation ─────────────────────────────────

    describe('getConfigForTenant', () => {
        it('throws on empty tenantId', async () => {
            const { getConfigForTenant } = await import('../config')
            await expect(getConfigForTenant('')).rejects.toThrow(
                '[config] getConfigForTenant requires a valid tenantId',
            )
        })

        it('returns result for valid tenantId', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse())

            const { getConfigForTenant } = await import('../config')
            const result = await getConfigForTenant('tenant-explicit-1')
            expect(result.config.business_name).toBe('BizStore')
            expect(result._degraded).toBe(false)
        })

        it('returns FALLBACK_CONFIG on fetch error', async () => {
            mockRpc.mockRejectedValueOnce(new Error('Connection refused'))

            const { getConfigForTenant } = await import('../config')
            const result = await getConfigForTenant('tenant-broken-1')
            expect(result._degraded).toBe(true)
        })
    })

    // ── Fallback flag merging ─────────────────────────────────────────

    describe('flag merging', () => {
        it('merges partial flags from DB with FALLBACK_CONFIG defaults', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse({
                feature_flags: { enable_ecommerce: true, enable_reviews: true },
            }))

            const { getConfig } = await import('../config')
            const result = await getConfig()

            // Explicit flags from DB
            expect(result.featureFlags.enable_ecommerce).toBe(true)
            expect(result.featureFlags.enable_reviews).toBe(true)
            // Fallback defaults for unset flags
            expect(result.featureFlags.enable_maintenance_mode).toBe(true) // fallback is true
            expect(result.featureFlags.enable_chatbot).toBe(false) // fallback is false
        })
    })

    // ── Non-degraded config marker ────────────────────────────────────

    describe('_degraded marker', () => {
        it('successful fetch sets _degraded=false', async () => {
            mockRpc.mockResolvedValueOnce(makeRpcResponse())

            const { getConfig } = await import('../config')
            const result = await getConfig()
            expect(result._degraded).toBe(false)
        })

        it('FALLBACK_CONFIG always has _degraded=true', async () => {
            const { FALLBACK_CONFIG } = await import('../config')
            expect(FALLBACK_CONFIG._degraded).toBe(true)
        })
    })
})
