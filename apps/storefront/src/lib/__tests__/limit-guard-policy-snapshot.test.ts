import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        from: mockFrom,
    }),
}))

const { checkMultipleResourceLimits, checkResourceLimit } = await import('../enforcement/limit-guard')

describe('limit guard policy snapshot', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ count: 7 }),
        }))
    })

    it('uses the panel governance snapshot instead of re-reading plan_limits with a stateless anon client', async () => {
        const result = await checkResourceLimit('tenant-123', 'products', {
            max_products: 200,
        })

        expect(result).toMatchObject({
            allowed: true,
            current: 7,
            limit: 200,
            limitKey: 'max_products',
            percentage: 4,
        })
        expect(mockFrom).not.toHaveBeenCalled()
    })

    it('accepts plan limit keys as resource probes for module setup usage metrics', async () => {
        const result = await checkMultipleResourceLimits('tenant-123', ['max_products'] as never, {
            max_products: 200,
        })

        expect(result.max_products).toMatchObject({
            allowed: true,
            current: 7,
            limit: 200,
            limitKey: 'max_products',
            percentage: 4,
        })
        expect(mockFrom).not.toHaveBeenCalled()
    })
})
