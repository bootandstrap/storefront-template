/**
 * Inventory Stock Update API — Panel Action
 *
 * Handles inline stock level updates from the inventory dashboard.
 * Protected by panel guard (authentication + authorization).
 *
 * Zone: 🟡 EXTEND
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { adjustStockLevel } from '@/lib/medusa/admin-inventory'

export async function POST(request: NextRequest) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const body = await request.json()
        const { inventory_item_id, location_id, stocked_quantity } = body

        if (!inventory_item_id || !location_id || typeof stocked_quantity !== 'number') {
            return NextResponse.json(
                { error: 'Missing required fields: inventory_item_id, location_id, stocked_quantity' },
                { status: 400 }
            )
        }

        const result = await adjustStockLevel(
            inventory_item_id,
            location_id,
            stocked_quantity,
            scope
        )

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[inventory-update] Error:', error)
        return NextResponse.json(
            { error: 'Failed to update stock' },
            { status: 500 }
        )
    }
}
