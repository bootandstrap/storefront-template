import { NextRequest, NextResponse } from 'next/server'
import { createStoreReturn, getStoreReturns } from '@/lib/medusa/client'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'

// POST /api/returns — Create a return request via Medusa Store API
export async function POST(request: NextRequest) {
    try {
        const { featureFlags } = await getConfig()
        if (!isFeatureEnabled(featureFlags, 'enable_self_service_returns')) {
            return NextResponse.json({ error: 'Returns are not enabled' }, { status: 403 })
        }

        const body = await request.json()
        const { order_id, items } = body

        // Validate required fields
        if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'order_id and items[] are required' },
                { status: 400 }
            )
        }

        // Validate each item has item_id and quantity
        for (const item of items) {
            if (!item.item_id || !item.quantity || item.quantity < 1) {
                return NextResponse.json(
                    { error: 'Each item must have item_id and quantity >= 1' },
                    { status: 400 }
                )
            }
        }

        const returnRequest = await createStoreReturn(order_id, items)
        return NextResponse.json({ return: returnRequest }, { status: 201 })
    } catch (err) {
        console.error('[returns] Create error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to create return' },
            { status: 500 }
        )
    }
}

// GET /api/returns — List returns for an order via Medusa Store API
export async function GET(request: NextRequest) {
    try {
        const { featureFlags } = await getConfig()
        if (!isFeatureEnabled(featureFlags, 'enable_self_service_returns')) {
            return NextResponse.json({ error: 'Returns are not enabled' }, { status: 403 })
        }

        const orderId = request.nextUrl.searchParams.get('order_id') || undefined
        const returns = await getStoreReturns(orderId)
        return NextResponse.json({ returns })
    } catch (err) {
        console.error('[returns] List error:', err)
        return NextResponse.json(
            { error: 'Failed to fetch returns' },
            { status: 500 }
        )
    }
}
