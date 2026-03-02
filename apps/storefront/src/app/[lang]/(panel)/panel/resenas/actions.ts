'use server'

import { adminFetch } from '@/lib/medusa/admin-core'
import { requirePanelAuth } from '@/lib/panel-auth'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { revalidatePath } from 'next/cache'

// ─── Fetch all reviews ────────────────────────────────────────
export async function getReviews(statusFilter?: string) {
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)
    const query = statusFilter ? `?status=${statusFilter}` : ''
    const { data, error } = await adminFetch<{
        reviews: Array<{
            id: string
            product_id: string
            author_name: string
            rating: number
            comment: string | null
            status: string
            created_at: string
        }>
        stats: {
            total: number
            pending: number
            approved: number
            rejected: number
        }
    }>(`/admin/reviews${query}`, {}, scope)

    if (error || !data) {
        console.error('[reviews] fetch failed:', error)
        return { reviews: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0 } }
    }

    return data
}

// ─── Moderate review (approve/reject) ─────────────────────────
export async function moderateReviewAction(reviewId: string, status: 'approved' | 'rejected') {
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)

    const { error } = await adminFetch('/admin/reviews', {
        method: 'PUT',
        body: JSON.stringify({ id: reviewId, status }),
    }, scope)

    if (error) {
        console.error('[reviews] moderate failed:', error)
        return { success: false, error: 'Failed to moderate review' }
    }

    revalidatePath('/[lang]/panel/resenas', 'page')
    return { success: true }
}

// ─── Delete review ────────────────────────────────────────────
export async function deleteReviewAction(reviewId: string) {
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)

    const { error } = await adminFetch('/admin/reviews', {
        method: 'DELETE',
        body: JSON.stringify({ id: reviewId }),
    }, scope)

    if (error) {
        console.error('[reviews] delete failed:', error)
        return { success: false, error: 'Failed to delete review' }
    }

    revalidatePath('/[lang]/panel/resenas', 'page')
    return { success: true }
}
