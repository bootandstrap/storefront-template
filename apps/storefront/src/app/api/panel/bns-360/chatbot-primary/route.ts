import { NextRequest, NextResponse } from 'next/server'

import { runBns360ChatbotPrimaryJourney } from '@/lib/bns-360/chatbot-primary-journey'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'
import { createBns360ChatbotPrimaryClient } from './route-support'

export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_chatbot' })
        const client = createBns360ChatbotPrimaryClient(tenantId)
        const result = await runBns360ChatbotPrimaryJourney({ tenantId, client })

        return NextResponse.json(result, {
            status: result.status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[bns-360-chatbot-primary] Error:', error)
        return toPanelErrorResponse(error)
    }
}
