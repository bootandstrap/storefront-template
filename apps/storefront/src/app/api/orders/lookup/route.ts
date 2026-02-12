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

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

// Rate limiter: 5 lookups per IP per 15 minutes (distributed when Redis available)
const lookupLimiter = createSmartRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000, name: 'order-lookup' })

export async function POST(request: Request): Promise<Response> {
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
                currency_code: match.currency_code || 'usd',
            },
        })
    } catch {
        return Response.json(
            { error: 'Order lookup failed' },
            { status: 500 }
        )
    }
}
