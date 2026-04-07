import { NextRequest, NextResponse } from 'next/server'
import { requireFlag, policyErrorResponse, PolicyError } from '@/lib/policy-engine'

// ---------------------------------------------------------------------------
// POST /api/cart/promotions — Apply a promo code to a cart
// DELETE /api/cart/promotions — Remove a promo code from a cart
// Proxies to Medusa Store API: POST /store/carts/:id/promotions
// P0-5: Server-side enforcement of enable_promotions flag
// ---------------------------------------------------------------------------

// Medusa cart IDs: cart_XXXX (alphanumeric + underscores)
const VALID_CART_ID = /^cart_[a-zA-Z0-9]+$/

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

function medusaHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
    }
}

export async function POST(request: NextRequest) {
    try {
        // P0-5: Enforce feature flag server-side
        await requireFlag('enable_promotions')
        const { cartId, code } = await request.json()

        if (!cartId || !code) {
            return NextResponse.json(
                { error: 'cartId and code are required' },
                { status: 400 }
            )
        }

        // Validate cartId format to prevent SSRF/path traversal
        if (!VALID_CART_ID.test(cartId)) {
            return NextResponse.json(
                { error: 'Invalid cart ID format' },
                { status: 400 }
            )
        }

        // Medusa v2 Store API: Add promotion to cart
        const res = await fetch(
            `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`,
            {
                method: 'POST',
                headers: medusaHeaders(),
                body: JSON.stringify({ promo_codes: [code] }),
            }
        )

        if (!res.ok) {
            const text = await res.text()
            console.error(`[promotions] Medusa error ${res.status}:`, text)
            return NextResponse.json(
                { error: 'Invalid promotion code' },
                { status: 400 }
            )
        }

        const data = await res.json()
        return NextResponse.json({ cart: data.cart })
    } catch (err) {
        if (err instanceof PolicyError) return policyErrorResponse(err)
        console.error('[promotions] Error applying code:', err)
        return NextResponse.json(
            { error: 'Failed to apply promotion code' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // P0-5: Enforce feature flag server-side
        await requireFlag('enable_promotions')
        const { cartId, code } = await request.json()

        if (!cartId || !code) {
            return NextResponse.json(
                { error: 'cartId and code are required' },
                { status: 400 }
            )
        }

        // Validate cartId format to prevent SSRF/path traversal
        if (!VALID_CART_ID.test(cartId)) {
            return NextResponse.json(
                { error: 'Invalid cart ID format' },
                { status: 400 }
            )
        }

        // Medusa v2 Store API: Remove promotion from cart
        const res = await fetch(
            `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`,
            {
                method: 'DELETE',
                headers: medusaHeaders(),
                body: JSON.stringify({ promo_codes: [code] }),
            }
        )

        if (!res.ok) {
            const text = await res.text()
            console.error(`[promotions] Medusa error ${res.status}:`, text)
            return NextResponse.json(
                { error: 'Failed to remove code' },
                { status: 400 }
            )
        }

        const data = await res.json()
        return NextResponse.json({ cart: data.cart })
    } catch (err) {
        if (err instanceof PolicyError) return policyErrorResponse(err)
        console.error('[promotions] Error removing code:', err)
        return NextResponse.json(
            { error: 'Failed to remove promotion code' },
            { status: 500 }
        )
    }
}
