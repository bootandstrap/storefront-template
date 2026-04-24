/**
 * GET /api/products/[id] — Fetch a single product by Medusa ID
 *
 * Public endpoint with rate limiting (API_GUARD: 60 req/min).
 * Validates product ID format (prod_XXX) to prevent SSRF/path traversal.
 * Proxies to Medusa Store API with publishable key auth.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, API_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'

// Medusa product IDs: prod_XXXX (alphanumeric + underscores)
const VALID_PRODUCT_ID = /^prod_[a-zA-Z0-9]+$/

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rl = await withRateLimit(request, API_GUARD)
        if (rl.limited) return rl.response!

        const { id } = await params

        // S7: Validate ID format to prevent SSRF/path traversal
        if (!VALID_PRODUCT_ID.test(id)) {
            return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
        }

        const medusaUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
        const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (publishableKey) {
            headers['x-publishable-api-key'] = publishableKey
        }

        const res = await fetch(
            `${medusaUrl}/store/products/${id}?fields=*variants,*variants.calculated_price,+variants.inventory_quantity,*categories`,
            { headers, next: { revalidate: 60 } }
        )

        if (!res.ok) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const data = await res.json()
        return NextResponse.json({ product: data.product })
    } catch (error) {
        logger.error('[Products API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
