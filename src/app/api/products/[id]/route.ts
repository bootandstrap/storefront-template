import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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
        console.error('[Products API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
