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
import { createClient } from '@supabase/supabase-js'

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
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 60 // max events per IP per window

// Simple in-memory rate limiter (per process)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return false
    }

    entry.count++
    return entry.count > RATE_LIMIT_MAX
}

// Clean up stale entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) rateLimitMap.delete(ip)
    }
}, 5 * 60_000)

// ---------------------------------------------------------------------------
// POST /api/analytics
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown'

        if (isRateLimited(ip)) {
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
            // No tenant configured — silently drop
            return NextResponse.json({ ok: true })
        }

        // Use service role for server-side insert (bypasses RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )

        await supabase.from('analytics_events').insert({
            event_type,
            properties: properties || {},
            page_url: typeof page_url === 'string' ? page_url.slice(0, 2048) : null,
            referrer: typeof referrer === 'string' ? referrer.slice(0, 2048) : null,
            tenant_id: tenantId,
        })

        return NextResponse.json({ ok: true })
    } catch {
        // Silent fail — never block analytics callers
        return NextResponse.json({ ok: true })
    }
}
