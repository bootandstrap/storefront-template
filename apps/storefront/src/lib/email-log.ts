import { createAdminClient } from '@/lib/supabase/admin'

export interface EmailLogEntry {
    id: string
    tenant_id: string
    email_type: string
    recipient: string
    subject: string
    status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked'
    provider: string | null
    message_id: string | null
    error_detail: string | null
    metadata: Record<string, any>
    sent_at: string
}

export async function getEmailLogs(
    tenantId: string,
    params: {
        limit: number
        offset: number
        status?: string
        q?: string
    }
): Promise<{ logs: EmailLogEntry[]; count: number }> {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from('email_log')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('sent_at', { ascending: false })

    if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status)
    }

    if (params.q) {
        query = query.or(`recipient.ilike.%${params.q}%,subject.ilike.%${params.q}%`)
    }

    if (params.limit) {
        query = query.range(params.offset, params.offset + params.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('[getEmailLogs] Error fetching email logs:', error)
        return { logs: [], count: 0 }
    }

    return { logs: data || [], count: count || 0 }
}
