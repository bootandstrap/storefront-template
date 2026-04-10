/**
 * POST /api/module-purchase
 *
 * Proxies a module checkout request to BSWEB's /api/module-checkout.
 * This keeps the purchase flow in-panel (Option A) — the owner clicks
 * "Contratar", we create a Stripe Checkout Session via BSWEB, and redirect.
 *
 * Body: { module_key: string, tier_id?: string }
 * Returns: { url: string } on success, { error: string } on failure
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveModulesForTenant } from '@/lib/active-modules'
import contract from '@/lib/governance/governance-contract.json'

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

        const body = await req.json()
        const { module_key, tier_id } = body

        if (!module_key || typeof module_key !== 'string') {
            return NextResponse.json({ error: 'module_key is required' }, { status: 400 })
        }

        // Validate module dependencies (v2.0 POS/Kiosk governance)
        const targetModule = contract.modules.catalog.find(m => m.key === module_key)
        if (!targetModule) {
            return NextResponse.json({ error: 'Invalid module_key' }, { status: 400 })
        }

        if (targetModule.requires && targetModule.requires.length > 0) {
            const activeModules = await getActiveModulesForTenant(profile.tenant_id)
            const activeModuleKeys = new Set(activeModules.map(m => m.moduleKey))
            
            const missingDependencies = targetModule.requires.filter(req => !activeModuleKeys.has(req))
            if (missingDependencies.length > 0) {
                return NextResponse.json({ 
                    error: 'Dependencies not met', 
                    missing_dependencies: missingDependencies 
                }, { status: 400 })
            }
        }

        // Determine locale for return URLs
        const locale = req.headers.get('x-locale') || 'es'
        const origin = req.nextUrl.origin

        const internalToken = process.env.BSWEB_INTERNAL_API_TOKEN
        if (!internalToken) {
            return NextResponse.json(
                { error: 'Storefront internal checkout token is not configured' },
                { status: 503 }
            )
        }

        // Forward to BSWEB module-checkout endpoint
        const res = await fetch(`${BSWEB_URL}/api/module-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bns-internal-token': internalToken,
            },
            body: JSON.stringify({
                tenant_id: profile.tenant_id,
                module_key,
                tier_id: tier_id || undefined,
                success_url: `${origin}/${locale}/panel/ajustes?tab=suscripcion&module_purchased=${encodeURIComponent(module_key)}`,
                cancel_url: `${origin}/${locale}/panel/ajustes?tab=suscripcion`,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('[module-purchase] BSWEB error:', data)
            return NextResponse.json(
                { error: data.error || 'Checkout creation failed' },
                { status: res.status }
            )
        }

        const checkoutUrl = data.checkout_url || data.url
        if (!checkoutUrl) {
            return NextResponse.json({ error: 'Checkout URL missing in response' }, { status: 502 })
        }

        return NextResponse.json({ url: checkoutUrl })
    } catch (err) {
        console.error('[module-purchase] Unexpected error:', err)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
