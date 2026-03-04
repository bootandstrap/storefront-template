import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getActiveModulesForTenant } from '../active-modules'

// ---------------------------------------------------------------------------
// Mock the supabase client
// ---------------------------------------------------------------------------

const mockIn = vi.fn()
const mockEq = vi.fn(() => ({ in: mockIn }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

const mockSupabaseClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => mockSupabaseClient),
}))

describe('Commercial Source of Truth (orders-based)', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns modules from active orders', async () => {
        // Setup: return a paid order
        mockIn.mockResolvedValue({
            data: [
                {
                    id: 'order_1',
                    status: 'paid',
                    stripe_subscription_id: 'sub_123',
                    activated_at: '2026-03-01T12:00:00Z',
                    module_order_items: [
                        {
                            module_key: 'ecommerce',
                            tier_name: 'Pro'
                        },
                        {
                            module_key: 'chatbot',
                            tier_name: null
                        }
                    ]
                }
            ],
            error: null,
        })

        const result = await getActiveModulesForTenant('tenant-123')

        expect(mockFrom).toHaveBeenCalledWith('module_orders')
        expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
        expect(mockIn).toHaveBeenCalledWith('status', ['paid', 'active', 'completed', 'confirmed'])

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
            moduleKey: 'ecommerce',
            tierKey: 'Pro',
            stripeSubscriptionId: 'sub_123',
            activatedAt: '2026-03-01T12:00:00Z'
        })
        expect(result[1].moduleKey).toBe('chatbot')
        expect(result[1].tierKey).toBeNull()
    })

    it('returns empty array on database error', async () => {
        mockIn.mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
        })

        const result = await getActiveModulesForTenant('tenant-123')
        expect(result).toEqual([])
    })

    it('handles empty orders correctly', async () => {
        mockIn.mockResolvedValue({
            data: [],
            error: null,
        })

        const result = await getActiveModulesForTenant('tenant-123')
        expect(result).toEqual([])
    })

    it('single object module_order_items (if supabase relationship returns object instead of array)', async () => {
        mockIn.mockResolvedValue({
            data: [
                {
                    id: 'order_2',
                    status: 'active',
                    paid_at: '2026-03-02T12:00:00Z',
                    module_order_items: {  // single object
                        module_key: 'seo',
                        tier_name: 'Advanced'
                    }
                }
            ],
            error: null,
        })

        const result = await getActiveModulesForTenant('tenant-123')

        expect(result).toHaveLength(1)
        expect(result[0].moduleKey).toBe('seo')
        expect(result[0].tierKey).toBe('Advanced')
        expect(result[0].activatedAt).toBe('2026-03-02T12:00:00Z')
    })
})
