/**
 * Chat Usage Logger
 * Logs detailed metrics to the database.
 * All entries are scoped by tenant_id.
 */

import { chatLogsTable } from '@/lib/chat/db'
import { createAdminClient } from '@/lib/supabase/admin'

interface UsageParams {
    tenantId: string
    userId?: string
    model: string
    promptTokens: number
    completionTokens: number
    locale: string
}

// Pricing per 1M tokens in USD
const PRICING: Record<string, { input: number, output: number }> = {
    'gpt-4.1-nano': { input: 0.10, output: 0.40 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4.1': { input: 2.00, output: 8.00 },
}

const DEFAULT_PRICING = { input: 0.15, output: 0.60 }

/**
 * Log a chat request with token usage and estimated cost (tenant-scoped)
 */
export async function logChatRequest({
    tenantId,
    userId,
    model,
    promptTokens,
    completionTokens,
    locale
}: UsageParams): Promise<void> {
    try {
        const totalTokens = promptTokens + completionTokens
        const pricing = PRICING[model] || DEFAULT_PRICING
        const _cost = (promptTokens * pricing.input / 1_000_000) + (completionTokens * pricing.output / 1_000_000)

        // Log detailed message — using db columns from migration
        await chatLogsTable().insert({
            tenant_id: tenantId,
            user_id: userId || null,
            role: 'assistant',
            content: `[${model}] ${totalTokens} tokens`,
            model,
            tokens_used: totalTokens,
            locale,
        })

        // Increment usage count for authenticated users
        if (userId) {
            const supabase = createAdminClient()
            const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
            await (supabase as any).rpc('increment_chat_usage', {
                p_tenant_id: tenantId,
                p_user_id: userId,
                p_month: currentMonth
            })
        }

    } catch (error) {
        console.error('[UsageLogger] Failed to log usage:', error)
    }
}
