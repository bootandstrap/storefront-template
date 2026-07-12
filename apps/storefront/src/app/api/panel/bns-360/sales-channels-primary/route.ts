import { NextRequest, NextResponse } from 'next/server'

import { runBns360SalesChannelsPrimaryJourney } from '@/lib/bns-360/sales-channels-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'
import { createBns360SalesChannelsPrimaryClient } from './route-support'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_sales_channels' })
        const client = createBns360SalesChannelsPrimaryClient(tenantId)
        const result = await runBns360SalesChannelsPrimaryJourney({ tenantId, client })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-sales-channels-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
