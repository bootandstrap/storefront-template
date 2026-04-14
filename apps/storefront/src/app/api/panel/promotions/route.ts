/**
 * POST /api/panel/promotions — Create a new promotion
 *
 * Requires panel auth. Delegates to admin-promotions.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { createPromotion } from '@/lib/medusa/admin-promotions'
import type { CreatePromotionInput } from '@/lib/medusa/admin-promotions'

export async function POST(request: NextRequest) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)
        const data: CreatePromotionInput = await request.json()

        const { promotion, error } = await createPromotion(data, scope)
        if (error) {
            return NextResponse.json({ error }, { status: 400 })
        }
        return NextResponse.json({ promotion })
    } catch (err) {
        console.error('[api/panel/promotions] POST error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
