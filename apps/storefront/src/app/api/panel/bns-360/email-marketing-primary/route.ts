import { NextRequest, NextResponse } from 'next/server'

import { runBns360EmailMarketingPrimaryJourney } from '@/lib/bns-360/email-marketing-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'
import { createBns360EmailMarketingPrimaryClient } from './route-support'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_email_notifications' })
        const client = createBns360EmailMarketingPrimaryClient(tenantId)
        const result = await runBns360EmailMarketingPrimaryJourney({ tenantId, client })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-email-marketing-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
