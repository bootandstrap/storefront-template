/**
 * Chat Stats API Route — tenant-scoped
 * Returns daily usage stats and summary (owner/admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, API_GUARD } from '@/lib/security/api-rate-guard'
import { chatLogsTable, chatSettingsTable, profilesTable } from '@/lib/chat/db'

interface LogEntry {
    tokens_used?: number
    created_at: string
}

export async function GET(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, API_GUARD)
        if (rl.limited) return rl.response!

        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check owner/admin
        const { data: profile } = await profilesTable()
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get summary from chat_logs for this tenant
        const { data: logs } = await chatLogsTable()
            .select('model, tokens_used, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(1000)

        const typedLogs = (logs || []) as LogEntry[]

        const totals = typedLogs.reduce((acc, curr) => ({
            messages: acc.messages + 1,
            tokens: acc.tokens + (curr.tokens_used || 0),
            cost: 0
        }), { messages: 0, tokens: 0, cost: 0 })

        // Build daily aggregation from logs (last 30 days)
        const dailyMap: Record<string, { total_messages: number; total_tokens: number }> = {}
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        for (const log of typedLogs) {
            const date = new Date(log.created_at).toISOString().split('T')[0]
            if (new Date(date) < thirtyDaysAgo) continue
            if (!dailyMap[date]) dailyMap[date] = { total_messages: 0, total_tokens: 0 }
            dailyMap[date].total_messages++
            dailyMap[date].total_tokens += log.tokens_used || 0
        }

        const daily = Object.entries(dailyMap)
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // Get active model from settings
        const { data: modelData } = await chatSettingsTable()
            .select('value')
            .eq('tenant_id', tenantId)
            .eq('key', 'model')
            .single()

        return NextResponse.json({
            daily,
            summary: totals,
            activeModel: modelData?.value || 'gpt-4.1-nano'
        })

    } catch (error) {
        console.error('[ChatStats] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
