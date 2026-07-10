import { NextRequest, NextResponse } from 'next/server'

import { runBns360I18nPrimaryJourney } from '@/lib/bns-360/i18n-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'
import { createBns360I18nPrimaryClient } from './route-support'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_multi_language' })
        const origin = new URL(req.url).origin
        const client = createBns360I18nPrimaryClient(tenantId, origin)
        const result = await runBns360I18nPrimaryJourney({ tenantId, client })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-i18n-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
