import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Shared guard — rejects if wishlist feature flag is disabled
// ---------------------------------------------------------------------------
async function assertWishlistEnabled() {
    const { featureFlags } = await getConfig()
    return isFeatureEnabled(featureFlags, 'enable_wishlist')
}

// ── GET /api/wishlist — fetch user's wishlisted product IDs ──────
export async function GET() {
    if (!(await assertWishlistEnabled())) {
        return NextResponse.json({ items: [] })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ items: [] })
    }

    const { data, error } = await supabase
        .from('product_wishlists')
        .select('product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        logger.error('[wishlist] GET error:', error)
        return NextResponse.json({ items: [] })
    }

    return NextResponse.json({
        items: (data || []).map(d => d.product_id),
    })
}

// ── POST /api/wishlist — add product to wishlist ─────────────────
export async function POST(req: NextRequest) {
    if (!(await assertWishlistEnabled())) {
        return NextResponse.json(
            { error: 'Wishlist is not enabled' },
            { status: 403 }
        )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        )
    }

    const body = await req.json()
    const productId = body.productId as string

    if (!productId) {
        return NextResponse.json(
            { error: 'productId is required' },
            { status: 400 }
        )
    }

    // Enforce max_wishlist_items plan limit
    const { planLimits } = await getConfig()
    if (planLimits.max_wishlist_items > 0) {
        const { count: currentCount } = await supabase
            .from('product_wishlists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if ((currentCount ?? 0) >= planLimits.max_wishlist_items) {
            return NextResponse.json(
                { error: 'Wishlist limit reached' },
                { status: 403 }
            )
        }
    }

    const { error } = await supabase
        .from('product_wishlists')
        .upsert(
            { user_id: user.id, product_id: productId },
            { onConflict: 'user_id,product_id' }
        )

    if (error) {
        logger.error('[wishlist] POST error:', error)
        return NextResponse.json(
            { error: 'Failed to add to wishlist' },
            { status: 500 }
        )
    }

    return NextResponse.json({ success: true })
}

// ── DELETE /api/wishlist — remove product from wishlist ───────────
export async function DELETE(req: NextRequest) {
    if (!(await assertWishlistEnabled())) {
        return NextResponse.json(
            { error: 'Wishlist is not enabled' },
            { status: 403 }
        )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        )
    }

    const body = await req.json()
    const productId = body.productId as string

    if (!productId) {
        return NextResponse.json(
            { error: 'productId is required' },
            { status: 400 }
        )
    }

    const { error } = await supabase
        .from('product_wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

    if (error) {
        logger.error('[wishlist] DELETE error:', error)
        return NextResponse.json(
            { error: 'Failed to remove from wishlist' },
            { status: 500 }
        )
    }

    return NextResponse.json({ success: true })
}
