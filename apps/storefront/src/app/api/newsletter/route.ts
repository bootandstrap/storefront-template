import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── POST /api/newsletter — subscribe email ───────────────────────
export async function POST(req: NextRequest) {
    const body = await req.json()
    const email = (body.email as string)?.trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
        )
    }

    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('newsletter_subscribers')
        .upsert(
            { email, subscribed_at: new Date().toISOString() },
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
