import { NextRequest, NextResponse } from 'next/server'

import { runBns360RrssPrimaryJourney } from '@/lib/bns-360/rrss-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'
import { createBns360RrssPrimaryClient } from './route-support'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_social_media' })
        const origin = new URL(req.url).origin
        const client = createBns360RrssPrimaryClient(tenantId, origin)
        const result = await runBns360RrssPrimaryJourney({ tenantId, client })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-rrss-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
