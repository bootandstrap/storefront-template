/**
 * Chat Usage API Route — tenant-scoped
 * Returns current user's message count
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatUsageTable } from '@/lib/chat/db'

export async function GET() {
    try {
        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ count: 0, limit: null, authenticated: false })
        }

        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

        const { data } = await chatUsageTable()
            .select('message_count')
            .eq('tenant_id', tenantId)
            .eq('user_id', user.id)
            .eq('month', currentMonth)
            .single()

        return NextResponse.json({
            messageCount: data?.message_count || 0,
            month: currentMonth,
            authenticated: true
        })

    } catch (error) {
        console.error('[ChatUsage] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
