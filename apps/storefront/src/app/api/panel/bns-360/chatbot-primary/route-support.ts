import 'server-only'

import {
    clearCachedConfig,
    getConfigForTenant,
    type StoreConfig,
} from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
    Bns360ChatbotConfig,
    Bns360ChatbotConfigUpdate,
    Bns360ChatbotPrimaryClient,
} from '@/lib/bns-360/chatbot-primary-journey'

export function createBns360ChatbotPrimaryClient(tenantId: string): Bns360ChatbotPrimaryClient {
    return {
        async readConfig() {
            const appConfig = await getConfigForTenant(tenantId)
            return normalizeChatbotConfig(appConfig.config, appConfig.planLimits.max_chatbot_messages_month ?? null)
        },

        async updateConfig(updates) {
            await updateChatbotConfig(tenantId, updates)
        },
    }
}

function normalizeChatbotConfig(config: StoreConfig, limit: number | null): Bns360ChatbotConfig {
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
    const admin = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcError } = await (admin as any).rpc(
        'update_owner_config',
        { p_tenant_id: tenantId, p_updates: payload }
    )

    if (!rpcError && (rpcResult === true || rpcResult === 1 || rpcResult === 'OK')) {
        clearCachedConfig()
        return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
        .from('config')
        .update(payload)
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
