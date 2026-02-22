import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getRequiredTenantId } from '@/lib/config'

/**
 * POST /api/billing/create-checkout
 *
 * Creates a Stripe Checkout session for tenant plan upgrade.
 * Owner clicks "Upgrade" → redirected to Stripe → completes payment → returns.
 *
 * Body: { plan: 'starter' | 'pro' | 'enterprise', returnUrl: string }
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
        const { plan, returnUrl } = body as { plan: string; returnUrl: string }

        // Map plan to Stripe price
        const priceMap: Record<string, string | undefined> = {
            starter: process.env.STRIPE_PRICE_STARTER,
            pro: process.env.STRIPE_PRICE_PRO,
            enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
        }

        const priceId = priceMap[plan]
        if (!priceId) {
            return NextResponse.json({ error: `No price configured for plan: ${plan}` }, { status: 400 })
        }

        // Check if tenant already has a Stripe customer
        const { data: tenant } = await supabase
            .from('tenants')
            .select('stripe_customer_id')
            .eq('id', tenantId)
            .single()

        const stripe = new Stripe(secretKey, { apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion })

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${returnUrl}?success=true`,
            cancel_url: `${returnUrl}?canceled=true`,
            metadata: {
                tenant_id: tenantId,
                plan_tier: plan,
                source: 'bootandstrap_saas',
            },
            subscription_data: {
                metadata: {
                    tenant_id: tenantId,
                    plan_tier: plan,
                    source: 'bootandstrap_saas',
                },
            },
        }

        // Attach existing customer if available
        if (tenant?.stripe_customer_id) {
            sessionParams.customer = tenant.stripe_customer_id
        } else {
            sessionParams.customer_email = user.email
        }

        const session = await stripe.checkout.sessions.create(sessionParams)

        return NextResponse.json({ url: session.url })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout creation failed'
        console.error('[billing/create-checkout]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
