import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getRequiredTenantId } from '@/lib/config'

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the tenant owner
 * to manage their subscription (update payment, view invoices, cancel).
 *
 * Body: { returnUrl: string }
 */
export async function POST(req: Request) {
    try {
        const secretKey = process.env.STRIPE_SECRET_KEY
        if (!secretKey) {
            return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
        }

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Verify role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile || !['owner', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const tenantId = profile.tenant_id || getRequiredTenantId()
        const body = await req.json()
        const { returnUrl } = body as { returnUrl: string }

        // Get tenant's Stripe customer ID
        const { data: tenant } = await supabase
            .from('tenants')
            .select('stripe_customer_id')
            .eq('id', tenantId)
            .single()

        if (!tenant?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No billing account found. Contact support.' },
                { status: 404 }
            )
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion })

        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: returnUrl,
        })

        return NextResponse.json({ url: session.url })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Portal session failed'
        console.error('[billing/portal]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
