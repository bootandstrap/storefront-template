import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockAdminFetch = vi.fn()
const mockLogOwnerAction = vi.fn()
const mockRevalidatePath = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin-core', () => ({
    adminFetch: mockAdminFetch,
}))

vi.mock('@/lib/panel/log-owner-action', () => ({
    logOwnerAction: mockLogOwnerAction,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
    },
}))

const scope = { tenantId: 'tenant_123', medusaSalesChannelId: 'sc_1' }

describe('/[lang]/panel/resenas server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue(scope)
        mockAdminFetch.mockResolvedValue({
            data: {
                reviews: [{ id: 'rev_1', product_id: 'prod_1', author_name: 'Ada', rating: 5, comment: 'Good', status: 'pending', created_at: '2026-01-01' }],
                stats: { total: 1, pending: 1, approved: 0, rejected: 0 },
            },
            error: null,
        })
    })

    it('lists reviews with status filter through tenant-scoped Medusa admin API', async () => {
        const { getReviews } = await import('../actions')

        await expect(getReviews('pending')).resolves.toEqual({
            reviews: [{ id: 'rev_1', product_id: 'prod_1', author_name: 'Ada', rating: 5, comment: 'Good', status: 'pending', created_at: '2026-01-01' }],
            stats: { total: 1, pending: 1, approved: 0, rejected: 0 },
        })

        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_reviews' })
        expect(mockGetTenantMedusaScope).toHaveBeenCalledWith('tenant_123')
        expect(mockAdminFetch).toHaveBeenCalledWith('/admin/reviews?status=pending', {}, scope)
    })

    it('moderates reviews and emits owner audit evidence', async () => {
        mockAdminFetch.mockResolvedValueOnce({ data: {}, error: null })
        const { moderateReviewAction } = await import('../actions')

        await expect(moderateReviewAction('rev_1', 'approved')).resolves.toEqual({ success: true })

        expect(mockAdminFetch).toHaveBeenCalledWith('/admin/reviews', {
            method: 'PUT',
            body: JSON.stringify({ id: 'rev_1', status: 'approved' }),
        }, scope)
        expect(mockRevalidatePath).toHaveBeenCalledWith('/[lang]/panel/resenas', 'page')
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'review.moderate', {
            reviewId: 'rev_1',
            status: 'approved',
        })
    })

    it('deletes reviews through tenant-scoped Medusa admin API', async () => {
        mockAdminFetch.mockResolvedValueOnce({ data: {}, error: null })
        const { deleteReviewAction } = await import('../actions')

        await expect(deleteReviewAction('rev_1')).resolves.toEqual({ success: true })

        expect(mockAdminFetch).toHaveBeenCalledWith('/admin/reviews', {
            method: 'DELETE',
            body: JSON.stringify({ id: 'rev_1' }),
        }, scope)
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'review.delete', { reviewId: 'rev_1' })
    })

    it('returns empty review evidence when Medusa read fails', async () => {
        mockAdminFetch.mockResolvedValueOnce({ data: null, error: 'offline' })
        const { getReviews } = await import('../actions')

        await expect(getReviews()).resolves.toEqual({
            reviews: [],
            stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
        })
    })
})
