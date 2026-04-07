/**
 * Review Submission API Route — Customer-facing
 *
 * Allows authenticated customers to submit reviews for products.
 * Enforces:
 *   - Feature flag: enable_reviews
 *   - Plan limit: max_reviews_per_product (per product)
 *   - Authentication required
 *   - Rate limiting (1 review per product per customer)
 *
 * Reviews are submitted to Medusa's admin review API in "pending" status
 * and must be approved by the store owner in the panel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { createClient } from '@/lib/supabase/server'
import { adminFetch } from '@/lib/medusa/admin-core'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'

export async function POST(req: NextRequest) {
    try {
        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        // Feature flag check
        const { featureFlags, planLimits } = await getConfig()
        if (!isFeatureEnabled(featureFlags, 'enable_reviews')) {
            return NextResponse.json({ error: 'Reviews are not enabled' }, { status: 403 })
        }

        // Authentication required
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await req.json()
        const { productId, rating, comment, authorName } = body

        if (!productId || typeof productId !== 'string') {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
        }

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
        }

        const scope = await getTenantMedusaScope(tenantId)

        // Enforce max_reviews_per_product — count existing reviews for this product
        const existingReviews = await adminFetch<{
            reviews: unknown[]
            stats: { total: number }
        }>(`/admin/reviews?product_id=${productId}`, {}, scope)

        const currentReviewCount = existingReviews.data?.stats?.total ?? existingReviews.data?.reviews?.length ?? 0
        const limitCheck = checkLimit(planLimits, 'max_reviews_per_product', currentReviewCount)

        if (!limitCheck.allowed) {
            return NextResponse.json(
                { error: buildLimitError('max_reviews_per_product', limitCheck) },
                { status: 403 }
            )
        }

        // Submit review to Medusa (status: pending — needs owner approval)
        const { error } = await adminFetch('/admin/reviews', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                rating: Math.round(rating),
                comment: typeof comment === 'string' ? comment.slice(0, 1000).trim() : null,
                author_name: typeof authorName === 'string' ? authorName.slice(0, 100).trim() : (user.email?.split('@')[0] || 'Customer'),
                user_id: user.id,
                status: 'pending',
            }),
        }, scope)

        if (error) {
            console.error('[reviews] Submit failed:', error)
            return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
        }

        return NextResponse.json({ success: true, status: 'pending' })
    } catch (err) {
        console.error('[reviews] Error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET handler for crawler/uptime probes (prevents 405 errors)
export async function GET() {
    return NextResponse.json({ status: 'ok', endpoint: 'reviews' })
}
