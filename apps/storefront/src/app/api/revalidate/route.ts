import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getConfig } from '@/lib/config'

// ---------------------------------------------------------------------------
// Admin revalidation endpoint
// POST /api/revalidate
// Body: { path?: string, secret: string }
// ---------------------------------------------------------------------------

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET

export async function POST(request: NextRequest) {
    try {
        // Feature flag gate: admin API access must be enabled
        const { featureFlags } = await getConfig()
        if (!featureFlags.enable_admin_api) {
            return NextResponse.json(
                { error: 'Admin API access is disabled for this tenant' },
                { status: 403 }
            )
        }

        // If no secret is configured, the endpoint is disabled
        if (!REVALIDATION_SECRET) {
            return NextResponse.json(
                { error: 'Revalidation endpoint not configured — set REVALIDATION_SECRET' },
                { status: 503 }
            )
        }

        const body = await request.json()
        const { secret, path } = body as { secret?: string; path?: string }

        // Validate secret token
        if (secret !== REVALIDATION_SECRET) {
            return NextResponse.json(
                { error: 'Invalid revalidation secret' },
                { status: 401 }
            )
        }

        // Revalidate specific path or entire layout
        if (path) {
            revalidatePath(path)
        } else {
            revalidatePath('/', 'layout')
        }

        // Also clear in-memory config cache
        const { revalidateConfig } = await import('@/lib/config')
        await revalidateConfig()

        return NextResponse.json({
            revalidated: true,
            path: path || '/',
            timestamp: new Date().toISOString(),
        })
    } catch (err) {
        console.error('[revalidate] Error:', err)
        return NextResponse.json(
            { error: 'Revalidation failed' },
            { status: 500 }
        )
    }
}
