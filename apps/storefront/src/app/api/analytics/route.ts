/**
 * Analytics API route — server-side proxy
 *
 * Replaces direct client-side Supabase inserts with a validated server endpoint.
 * Benefits:
 *   - tenant_id injected server-side (trusted, not from client)
 *   - event_type whitelisted
 *   - payload size limited
 *   - basic rate-limiting by IP
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/get-client-ip'
import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALLOWED_EVENTS = new Set([
    'page_view',
    'product_view',
    'add_to_cart',
    'remove_from_cart',
    'checkout_start',
    'order_placed',
    'search',
    'category_view',
    'whatsapp_click',
])

const MAX_PROPERTIES_SIZE = 4096 // bytes
const analyticsLimiter = createSmartRateLimiter({
    limit: 60,
    windowMs: 60_000,
    name: 'api-analytics',
})

// ---------------------------------------------------------------------------
// POST /api/analytics
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = getClientIp(request)

        if (await analyticsLimiter.isLimited(ip)) {
            return NextResponse.json(
                { error: 'rate_limited' },
                { status: 429 }
            )
        }

        // Parse body
        const body = await request.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { error: 'invalid_body' },
                { status: 400 }
            )
        }

        const { event_type, properties, page_url, referrer } = body

        // Validate event_type
        if (!event_type || !ALLOWED_EVENTS.has(event_type)) {
            return NextResponse.json(
                { error: 'invalid_event_type' },
                { status: 400 }
            )
        }

        // Validate properties size
        const propsStr = properties ? JSON.stringify(properties) : '{}'
        if (propsStr.length > MAX_PROPERTIES_SIZE) {
            return NextResponse.json(
                { error: 'properties_too_large' },
                { status: 400 }
            )
        }

        // Server-side tenant_id injection (trusted)
        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json(
                { error: 'analytics_unavailable' },
                { status: 503 }
            )
        }

        // Use service-role client for trusted insert.
        const supabase = createAdminClient()

        const { error: insertError } = await supabase.from('analytics_events').insert({
            event_type,
            properties: properties || {},
            page_url: typeof page_url === 'string' ? page_url.slice(0, 2048) : null,
            referrer: typeof referrer === 'string' ? referrer.slice(0, 2048) : null,
            tenant_id: tenantId,
        } as never)

        if (insertError) {
            console.error('[analytics] insert failed:', insertError.message)
            return NextResponse.json(
                { error: 'analytics_insert_failed' },
                { status: 500 }
            )
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[analytics] request failed:', err)
        return NextResponse.json(
            { error: 'analytics_unavailable' },
            { status: 503 }
        )
    }
}

// Support GET for telemetry health/probe checks (avoid 405)
export async function GET() {
    return NextResponse.json({ status: 'analytics_endpoint_ready' })
}
