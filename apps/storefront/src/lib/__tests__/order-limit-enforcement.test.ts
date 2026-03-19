import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanLimits } from '../config'

// ---------------------------------------------------------------------------
// Mock governance client
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()
vi.mock('@/lib/supabase/governance', () => ({
    createGovernanceClient: () => ({ rpc: mockRpc }),
}))

// Must import AFTER mock setup
const { checkOrderLimit } = await import('../order-limits')

function makeLimits(overrides: Partial<PlanLimits> = {}): PlanLimits {
    return {
        max_products: 100,
        max_customers: 1000,
        max_orders_month: 50,
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
        ...overrides,
    } as PlanLimits
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('checkOrderLimit', () => {
    it('allows order when count is below limit', async () => {
        mockRpc.mockResolvedValue({ data: 10, error: null })
        const limits = makeLimits({ max_orders_month: 50 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(10)
        expect(result.limit).toBe(50)
        expect(result.remaining).toBe(40)
    })

    it('blocks order when count equals limit', async () => {
        mockRpc.mockResolvedValue({ data: 50, error: null })
        const limits = makeLimits({ max_orders_month: 50 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.allowed).toBe(false)
        expect(result.current).toBe(50)
        expect(result.remaining).toBe(0)
    })

    it('blocks order when count exceeds limit', async () => {
        mockRpc.mockResolvedValue({ data: 55, error: null })
        const limits = makeLimits({ max_orders_month: 50 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.allowed).toBe(false)
        expect(result.current).toBe(55)
    })

    it('treats max_orders_month = 0 as unlimited', async () => {
        const limits = makeLimits({ max_orders_month: 0 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(Infinity)
        // RPC should NOT be called for unlimited
        expect(mockRpc).not.toHaveBeenCalled()
    })

    it('fails open on RPC error (allows order, logs error)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockRpc.mockResolvedValue({ data: null, error: { message: 'connection timeout' } })
        const limits = makeLimits({ max_orders_month: 50 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.allowed).toBe(true)
        expect(consoleSpy).toHaveBeenCalledWith(
            '[order-limits] RPC error:',
            'connection timeout'
        )
        consoleSpy.mockRestore()
    })

    it('calls RPC with correct tenant ID', async () => {
        mockRpc.mockResolvedValue({ data: 5, error: null })
        const limits = makeLimits({ max_orders_month: 50 })
        await checkOrderLimit(TENANT_ID, limits)
        expect(mockRpc).toHaveBeenCalledWith('count_tenant_orders_month', {
            p_tenant_id: TENANT_ID,
        })
    })

    it('calculates percentage correctly', async () => {
        mockRpc.mockResolvedValue({ data: 35, error: null })
        const limits = makeLimits({ max_orders_month: 50 })
        const result = await checkOrderLimit(TENANT_ID, limits)
        expect(result.percentage).toBe(70) // 35/50 * 100
    })
})
