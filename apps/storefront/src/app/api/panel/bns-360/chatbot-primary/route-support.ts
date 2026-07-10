import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360ChatbotConfig,
    Bns360ChatbotConfigUpdate,
    Bns360ChatbotPrimaryClient,
} from '@/lib/bns-360/chatbot-primary-journey'

interface ChatbotConfigRow {
    chatbot_name: string | null
    chatbot_welcome_message: string | null
    chatbot_auto_open_delay: number | null
    chatbot_tone: string | null
    chatbot_knowledge_scope: string | null
}

interface ChatbotPlanLimitsRow {
    max_chatbot_messages_month: number | null
}

export function createBns360ChatbotPrimaryClient(tenantId: string): Bns360ChatbotPrimaryClient {
    return {
        async readConfig() {
            return readChatbotConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateChatbotConfig(tenantId, updates)
        },
    }
}

async function readChatbotConfig(tenantId: string): Promise<Bns360ChatbotConfig> {
    const supabase = await createClient()

    const [configResult, limitsResult] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('config')
            .select('chatbot_name,chatbot_welcome_message,chatbot_auto_open_delay,chatbot_tone,chatbot_knowledge_scope')
            .eq('tenant_id', tenantId)
            .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('plan_limits')
            .select('max_chatbot_messages_month')
            .eq('tenant_id', tenantId)
            .single(),
    ])

    if (configResult.error) {
        throw new Error(`Chatbot config read failed: ${configResult.error.message}`)
    }
    if (limitsResult.error) {
        throw new Error(`Chatbot plan limits read failed: ${limitsResult.error.message}`)
    }

    return normalizeChatbotConfig(
        configResult.data as ChatbotConfigRow,
        (limitsResult.data as ChatbotPlanLimitsRow).max_chatbot_messages_month ?? null
    )
}

function normalizeChatbotConfig(config: ChatbotConfigRow, limit: number | null): Bns360ChatbotConfig {
    return {
        chatbotName: config.chatbot_name ?? null,
        chatbotWelcomeMessage: config.chatbot_welcome_message ?? null,
        chatbotAutoOpenDelay: config.chatbot_auto_open_delay ?? null,
        chatbotTone: config.chatbot_tone ?? null,
        chatbotKnowledgeScope: config.chatbot_knowledge_scope ?? null,
        maxChatbotMessagesMonth: limit,
    }
}

async function updateChatbotConfig(
    tenantId: string,
    updates: Bns360ChatbotConfigUpdate
): Promise<void> {
    const payload = toConfigPayload(updates)
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: existingError } = await (supabase as any)
        .from('config')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single()

    if (existingError) {
        throw new Error(`Chatbot config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('Chatbot config lookup returned no row')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .update(payload)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .select('tenant_id')

    if (error) {
        throw new Error(error.message)
    }
    if (!data || data.length === 0) {
        throw new Error('Chatbot config update affected zero rows')
    }

    clearCachedConfig()
}

function toConfigPayload(updates: Bns360ChatbotConfigUpdate): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if ('chatbotName' in updates) payload.chatbot_name = updates.chatbotName ?? null
    if ('chatbotWelcomeMessage' in updates) payload.chatbot_welcome_message = updates.chatbotWelcomeMessage ?? null
    if ('chatbotAutoOpenDelay' in updates) payload.chatbot_auto_open_delay = updates.chatbotAutoOpenDelay ?? null
    return payload
}
