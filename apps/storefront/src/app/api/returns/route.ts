import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequiredTenantId } from '@/lib/config'

// POST /api/returns — Create a return request
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { order_id, reason, description, items } = body

        // Validate required fields
        if (!order_id || !reason) {
            return NextResponse.json(
                { error: 'order_id and reason are required' },
                { status: 400 }
            )
        }

        const validReasons = ['defective', 'wrong_item', 'changed_mind', 'other']
        if (!validReasons.includes(reason)) {
            return NextResponse.json(
                { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
                { status: 400 }
            )
        }

        const tenantId = getRequiredTenantId()

        // Check for existing pending return on this order
        const { data: existing } = await supabase
            .from('return_requests')
            .select('id, status')
            .eq('order_id', order_id)
            .eq('customer_id', user.id)
            .in('status', ['pending', 'approved'])
            .limit(1)

        if (existing && existing.length > 0) {
            return NextResponse.json(
                { error: 'A return request already exists for this order' },
                { status: 409 }
            )
        }

        const { data, error } = await supabase
            .from('return_requests')
            .insert({
                tenant_id: tenantId,
                order_id,
                customer_id: user.id,
                reason,
                description: description || null,
                items: items || [],
                status: 'pending',
            })
            .select()
            .single()

        if (error) {
            console.error('[returns] Insert error:', error)
            return NextResponse.json({ error: 'Failed to create return request' }, { status: 500 })
        }

        return NextResponse.json({ return_request: data }, { status: 201 })
    } catch (err) {
        console.error('[returns] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET /api/returns — List customer's return requests
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('return_requests')
            .select('*')
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[returns] Query error:', error)
            return NextResponse.json({ error: 'Failed to fetch return requests' }, { status: 500 })
        }

        return NextResponse.json({ return_requests: data ?? [] })
    } catch (err) {
        console.error('[returns] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
