/**
 * POST /api/billing-portal
 *
 * Creates a Stripe Billing Portal session for the tenant owner.
 * Owner can manage subscriptions, update payment methods, view invoices.
 * Auth: withPanelGuard() — only owners/super_admins.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BSWEB_URL = process.env.BSWEB_INTERNAL_URL
    || process.env.NEXT_PUBLIC_BSWEB_URL
    || 'https://bootandstrap.com'

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get tenant_id and role from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id || !['owner', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get tenant's Stripe customer ID
        const { data: tenant } = await supabase
            .from('tenants')
            .select('stripe_customer_id')
            .eq('id', profile.tenant_id)
            .single()

        if (!tenant?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No billing account found. Contact support.' },
                { status: 404 }
            )
        }

        const locale = req.headers.get('x-locale') || 'es'
        const origin = req.nextUrl.origin

        const internalToken = process.env.BSWEB_INTERNAL_API_TOKEN
        if (!internalToken) {
            return NextResponse.json(
                { error: 'Billing portal not configured' },
                { status: 503 }
            )
        }

        // Create portal session via BSWEB
        const res = await fetch(`${BSWEB_URL}/api/billing-portal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bns-internal-token': internalToken,
            },
            body: JSON.stringify({
                stripe_customer_id: tenant.stripe_customer_id,
                return_url: `${origin}/${locale}/panel/ajustes?tab=suscripcion`,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('[billing-portal] BSWEB error:', data)
            return NextResponse.json(
                { error: data.error || 'Portal creation failed' },
                { status: res.status }
            )
        }

        const portalUrl = data.url || data.portal_url
        if (!portalUrl) {
            return NextResponse.json({ error: 'Portal URL missing' }, { status: 502 })
        }

        return NextResponse.json({ url: portalUrl })
    } catch (err) {
        console.error('[billing-portal] Unexpected error:', err)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
