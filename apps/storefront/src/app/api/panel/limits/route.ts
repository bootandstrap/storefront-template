import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { checkResourceLimit, checkMultipleResourceLimits, getResourceKeys, type ResourceKey } from '@/lib/enforcement/limit-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'

/**
 * GET /api/panel/limits?resource=products
 * GET /api/panel/limits?resources=products,categories,badges
 *
 * Returns current usage vs plan limits for the authenticated tenant.
 * Used by LimitReachedModal hook and dashboard usage overview.
 */
export async function GET(req: NextRequest) {
    try {
        // Rate limit check
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId, appConfig } = await withPanelGuard()
        const { searchParams } = new URL(req.url)

        const singleResource = searchParams.get('resource') as ResourceKey | null
        const multiResources = searchParams.get('resources')

        if (singleResource) {
            const result = await checkResourceLimit(tenantId, singleResource, appConfig.planLimits)
            return NextResponse.json(result)
        }

        if (multiResources) {
            const keys = multiResources.split(',').filter(Boolean) as ResourceKey[]
            const results = await checkMultipleResourceLimits(tenantId, keys, appConfig.planLimits)
            return NextResponse.json(results)
        }

        // No resource specified → return all
        const allKeys = getResourceKeys()
        const results = await checkMultipleResourceLimits(tenantId, allKeys, appConfig.planLimits)
        return NextResponse.json(results)
    } catch (error) {
        logger.error('[limits] Error:', error)
        return toPanelErrorResponse(error)
    }
}
