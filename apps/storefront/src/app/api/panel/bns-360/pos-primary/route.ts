import { NextRequest, NextResponse } from 'next/server'

import { runBns360POSPrimaryJourney } from '@/lib/bns-360/pos-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_pos' })
        const result = await runBns360POSPrimaryJourney({
            tenantId,
            featureFlags: appConfig.featureFlags,
            planLimits: appConfig.planLimits,
            businessName: appConfig.config.business_name,
        })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-pos-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
