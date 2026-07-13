import { NextRequest, NextResponse } from 'next/server'

import { runBns360CheckoutPrimaryJourney } from '@/lib/bns-360/full-system-journeys'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const result = await runBns360CheckoutPrimaryJourney({ tenantId })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-checkout-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
