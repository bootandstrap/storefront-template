import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { checkResourceLimit, checkMultipleResourceLimits, getResourceKeys, type ResourceKey } from '@/lib/enforcement/limit-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'

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

        const { tenantId } = await withPanelGuard()
        const { searchParams } = new URL(req.url)

        const singleResource = searchParams.get('resource') as ResourceKey | null
        const multiResources = searchParams.get('resources')

        if (singleResource) {
            const result = await checkResourceLimit(tenantId, singleResource)
            return NextResponse.json(result)
        }

        if (multiResources) {
            const keys = multiResources.split(',').filter(Boolean) as ResourceKey[]
            const results = await checkMultipleResourceLimits(tenantId, keys)
            return NextResponse.json(results)
        }

        // No resource specified → return all
        const allKeys = getResourceKeys()
        const results = await checkMultipleResourceLimits(tenantId, allKeys)
        return NextResponse.json(results)
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        console.error('[limits] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
