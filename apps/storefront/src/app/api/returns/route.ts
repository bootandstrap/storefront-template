import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { createClient } from '@/lib/supabase/server'
import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'
import { getClientIp } from '@/lib/security/get-client-ip'
import { logger } from '@/lib/logger'

// ── Rate limiter: 10 return requests per minute per IP ──
const returnsRateLimiter = createSmartRateLimiter({
    limit: 10,
    windowMs: 60_000,
    name: 'returns',
})

// POST /api/returns — Create a return request via Medusa Store API
export async function POST(request: NextRequest) {
    try {
        // Rate limit
        const clientIp = getClientIp(request)
        if (await returnsRateLimiter.isLimited(clientIp)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment.' },
                { status: 429 }
            )
        }

        // Auth check — require authenticated user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Feature flag check
        const { featureFlags } = await getConfig()
        if (!isFeatureEnabled(featureFlags, 'enable_self_service_returns')) {
            return NextResponse.json({ error: 'Returns are not enabled' }, { status: 403 })
        }

        const body = await request.json()
        const { order_id, items } = body

        // Validate required fields
        if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'order_id and items[] are required' },
                { status: 400 }
            )
        }

        // Validate each item has item_id and quantity
        for (const item of items) {
            if (!item.item_id || !item.quantity || item.quantity < 1) {
                return NextResponse.json(
                    { error: 'Each item must have item_id and quantity >= 1' },
                    { status: 400 }
                )
            }
        }

        // 1. Get user profile to map to Medusa Customer ID and get Tenant ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('medusa_customer_id, tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
        }

        // 2. Validate order ownership (Optional: verify via Medusa Store API if the order belongs to this customer)
        // For SOTA Pre-Validation layer, we record the request to Supabase directly
        const { data: returnRequest, error } = await supabase
            .from('return_requests')
            .insert({
                tenant_id: profile.tenant_id,
                order_id,
                customer_id: profile.medusa_customer_id,
                status: 'pending',
                items,
                reason: body.reason || null,
                customer_note: body.note || null
            })
            .select('*')
            .single()

        if (error) {
            logger.error('[returns] Supabase insert error:', error)
            throw new Error('Failed to save return request')
        }

        return NextResponse.json({ return: returnRequest }, { status: 201 })
    } catch (err) {
        logger.error('[returns] Create error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to create return' },
            { status: 500 }
        )
    }
}

// GET /api/returns — List returns for an order via Medusa Store API
export async function GET(request: NextRequest) {
    try {
        // Rate limit
        const clientIp = getClientIp(request)
        if (await returnsRateLimiter.isLimited(clientIp)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment.' },
                { status: 429 }
            )
        }

        // Auth check — require authenticated user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Feature flag check
        const { featureFlags } = await getConfig()
        if (!isFeatureEnabled(featureFlags, 'enable_self_service_returns')) {
            return NextResponse.json({ error: 'Returns are not enabled' }, { status: 403 })
        }

        // 1. Get user profile to map to Medusa Customer ID and get Tenant ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('medusa_customer_id, tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
        }

        const orderId = request.nextUrl.searchParams.get('order_id') || undefined
        
        let query = supabase
            .from('return_requests')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            
        if (orderId) {
            query = query.eq('order_id', orderId)
        } else {
            // If they didn't specify an order, they should only see their own returns
            if (profile.medusa_customer_id) {
                query = query.eq('customer_id', profile.medusa_customer_id)
            } else {
                return NextResponse.json({ returns: [] })
            }
        }
        
        const { data: returns, error } = await query.order('created_at', { ascending: false })
            
        if (error) {
            logger.error('[returns] Supabase fetch error:', error)
            throw new Error('Failed to fetch returns')
        }
        
        return NextResponse.json({ returns })
    } catch (err) {
        logger.error('[returns] List error:', err)
        return NextResponse.json(
            { error: 'Failed to fetch returns' },
            { status: 500 }
        )
    }
}
