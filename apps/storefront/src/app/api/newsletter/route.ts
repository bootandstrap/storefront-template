import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
import { isFeatureEnabled } from '@/lib/features'
import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'

// Phase 4.2: Rate limit — 5 req / 60s per IP (same pattern as billing/returns/chat)
const newsletterRateLimiter = createSmartRateLimiter({
    limit: 5,
    windowMs: 60_000,
    name: 'newsletter',
})

// ── POST /api/newsletter — subscribe email ───────────────────────
export async function POST(req: NextRequest) {
    // Rate limit check (per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (await newsletterRateLimiter.isLimited(ip)) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429 }
        )
    }

    // Server-side feature flag enforcement
    const { featureFlags, planLimits } = await getConfig()
    if (!isFeatureEnabled(featureFlags, 'enable_newsletter')) {
        return NextResponse.json(
            { error: 'Newsletter is not enabled' },
            { status: 403 }
        )
    }

    const body = await req.json()
    const email = (body.email as string)?.trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
        )
    }

    const supabase = createAdminClient()
    const tenantId = getRequiredTenantId()

    // Enforce max_newsletter_subscribers limit
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
            .from('newsletter_subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        const limitCheck = checkLimit(planLimits, 'max_newsletter_subscribers', count ?? 0)
        if (!limitCheck.allowed) {
            return NextResponse.json(
                { error: 'Subscriber limit reached' },
                { status: 429 }
            )
        }
    } catch {
        // Fail-closed: block if we can't validate limits
        return NextResponse.json(
            { error: 'Service temporarily unavailable' },
            { status: 503 }
        )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('newsletter_subscribers')
        .upsert(
            { email, tenant_id: tenantId, subscribed_at: new Date().toISOString() },
            { onConflict: 'email' }
        )

    if (error) {
        console.error('[newsletter] Subscribe error:', error)
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        )
    }

    return NextResponse.json({ success: true })
}
