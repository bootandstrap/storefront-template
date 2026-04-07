/**
 * POST /api/orders/lookup — Secure guest order lookup
 *
 * Moves order lookup from client-side Medusa calls to a server-side endpoint.
 * Validates email + display_id, calls Medusa server-side with deterministic
 * display_id filtering, and returns only minimal order info.
 * Email mismatch returns 404 to prevent enumeration.
 * Rate-limited: 5 attempts per IP per 15 minutes.
 */

import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'
import { getClientIp } from '@/lib/security/get-client-ip'
import { getConfig } from '@/lib/config'

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

// Rate limiter: 5 lookups per IP per 15 minutes (distributed when Redis available)
const lookupLimiter = createSmartRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000, name: 'order-lookup' })

export async function POST(request: Request): Promise<Response> {
    // Governance: guest order lookup gated by order tracking feature flag
    const { featureFlags, config } = await getConfig()
    if (!featureFlags.enable_order_tracking) {
        return Response.json(
            { error: 'Order tracking is disabled for this tenant' },
            { status: 403 }
        )
    }

    // Rate limit check
    const clientIp = getClientIp(request)

    // Parse body early so we can build compound rate-limit key
    let body: { email?: string; display_id?: string }
    try {
        body = await request.json()
    } catch {
        return Response.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
        )
    }

    const email = body.email?.trim()?.toLowerCase()
    const displayId = body.display_id?.toString()?.trim()

    // Rate limit with compound key (ip:email) — prevents cross-email enumeration
    const rateLimitKey = `${clientIp}:${email || 'unknown'}`
    if (await lookupLimiter.isLimited(rateLimitKey)) {
        return Response.json(
            { error: 'Too many lookup attempts. Please try again later.' },
            { status: 429 }
        )
    }

    if (!email || !displayId) {
        return Response.json(
            { error: 'Both email and display_id are required' },
            { status: 400 }
        )
    }

    // Validate display_id is numeric
    if (!/^\d+$/.test(displayId)) {
        return Response.json(
            { error: 'display_id must be numeric' },
            { status: 400 }
        )
    }

    try {
        // Query Medusa server-side — filter deterministically by display_id
        const params = new URLSearchParams({
            q: displayId,
            fields: 'id,display_id,email,status,created_at,total,currency_code',
            limit: '20',
            offset: '0',
        })

        const medusaRes = await fetch(
            `${MEDUSA_BACKEND_URL}/store/orders?${params.toString()}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
                },
            }
        )

        if (!medusaRes.ok) {
            return Response.json(
                { error: 'Order lookup service unavailable' },
                { status: 502 }
            )
        }

        const data = await medusaRes.json()
        const orders = data.orders ?? []

        // Find order matching display_id deterministically
        const match = orders.find(
            (o: { display_id: number; email?: string }) =>
                String(o.display_id) === displayId
        )

        if (!match) {
            return Response.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        // Verify email matches — prevents order enumeration
        const orderEmail = (match.email || '').toLowerCase().trim()
        if (orderEmail !== email) {
            // Return same 404 to avoid leaking that order ID exists
            return Response.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        // Return minimal fields only — no addresses, items, or IDs
        return Response.json({
            order: {
                display_id: match.display_id,
                status: match.status || 'pending',
                created_at: match.created_at,
                total: match.total ?? 0,
                currency_code: match.currency_code || config.default_currency,
            },
        })
    } catch {
        return Response.json(
            { error: 'Order lookup failed' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/orders/lookup — Administrative order polling
 * 
 * Used by the Owner Panel (OrderNotifications.tsx) to check for new orders.
 * Uses since query parameter to filter by created_at.
 * Restricted to authenticated owners only.
 * 
 * Uses Medusa ADMIN API (JWT auth) — NOT store API (which requires customer auth).
 */
import { withPanelGuard } from '@/lib/panel-guard'
import { adminFetch } from '@/lib/medusa/admin-core'

interface AdminOrder {
    id: string
    display_id?: number
    email?: string
    total?: number
    currency_code?: string
    created_at?: string
    status?: string
}

export async function GET(request: Request): Promise<Response> {
    try {
        // Auth: Restricted to authenticated owners
        await withPanelGuard()

        const { searchParams } = new URL(request.url)
        const since = searchParams.get('since')

        // Query Medusa Admin API for recent orders (JWT auth handled by adminFetch)
        const { data, error } = await adminFetch<{ orders: AdminOrder[]; count: number }>(
            '/admin/orders?limit=10&offset=0&order=-created_at&fields=id,display_id,email,total,currency_code,created_at,status'
        )

        if (error || !data) {
            return Response.json(
                { error: error || 'Medusa service unavailable' },
                { status: 502 }
            )
        }

        let orders = data.orders ?? []

        // If 'since' provided, filter for only newer orders
        if (since) {
            const sinceDate = new Date(since).getTime()
            orders = orders.filter((o) => new Date(o.created_at || 0).getTime() > sinceDate)
        }

        return Response.json({ orders })
    } catch (error) {
        // withPanelGuard throws if unauthorized
        return Response.json(
            { error: error instanceof Error ? error.message : 'Unauthorized' },
            { status: 401 }
        )
    }
}
