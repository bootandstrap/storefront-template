/**
 * Chat Settings Loader
 * Fetches per-tenant chat settings from database with caching.
 * Settings are scoped by tenant_id stored in the chat_settings table.
 */

import { chatSettingsTable } from '@/lib/chat/db'
import { CHAT_CONFIG } from './config'

interface ChatSettings {
    anonymousMessageLimit: number
    registeredMessageLimit: number
    payingMessageLimit: number
    model: string
    maxResponseTokens: number
    temperature: number
    enabled: boolean
    systemPrompt: string
}

// Cache settings per tenant for 60 seconds
const settingsCache: Map<string, { settings: ChatSettings; timestamp: number }> = new Map()
const CACHE_TTL = 60 * 1000

/**
 * Get chat settings for a specific tenant from database (with fallback to config file)
 */
export async function getChatSettings(tenantId: string): Promise<ChatSettings> {
    const now = Date.now()

    // Return cached if fresh
    const cached = settingsCache.get(tenantId)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.settings
    }

    try {
        // Try tenant-scoped query first
        let data: Array<{ key: string; value: string }> | null = null

        const result = await chatSettingsTable()
            .select('key, value')
            .eq('tenant_id', tenantId)

        if (result.error?.code === '42703') {
            // Column tenant_id doesn't exist yet — fall back to global key-value
            const fallback = await chatSettingsTable()
                .select('key, value')
            data = fallback.data
        } else {
            data = result.data
        }

        if (!data || data.length === 0) {
            console.warn('[ChatSettings] Using file defaults for tenant:', tenantId)
            return getDefaultSettings()
        }

        // Convert to settings object
        const settingsMap: Record<string, string> = {}
        data.forEach((row: { key: string; value: string }) => {
            settingsMap[row.key] = row.value
        })

        const settings: ChatSettings = {
            anonymousMessageLimit: parseInt(settingsMap.anonymous_message_limit) || CHAT_CONFIG.anonymousMessageLimit,
            registeredMessageLimit: parseInt(settingsMap.registered_message_limit) || CHAT_CONFIG.registeredMessageLimit,
            payingMessageLimit: parseInt(settingsMap.paying_message_limit) || CHAT_CONFIG.payingMessageLimit,
            model: settingsMap.model || CHAT_CONFIG.model,
            maxResponseTokens: parseInt(settingsMap.max_response_tokens) || CHAT_CONFIG.maxResponseTokens,
            temperature: parseFloat(settingsMap.temperature) || CHAT_CONFIG.temperature,
            enabled: settingsMap.enabled !== 'false',
            systemPrompt: settingsMap.system_prompt || ''
        }
        settingsCache.set(tenantId, { settings, timestamp: now })

        return settings

    } catch (error) {
        console.error('[ChatSettings] Error loading:', error)
        return getDefaultSettings()
    }
}

function getDefaultSettings(): ChatSettings {
    return {
        anonymousMessageLimit: CHAT_CONFIG.anonymousMessageLimit,
        registeredMessageLimit: CHAT_CONFIG.registeredMessageLimit,
        payingMessageLimit: CHAT_CONFIG.payingMessageLimit,
        model: CHAT_CONFIG.model,
        maxResponseTokens: CHAT_CONFIG.maxResponseTokens,
        temperature: CHAT_CONFIG.temperature,
        enabled: true,
        systemPrompt: ''
    }
}

/**
 * Clear the settings cache for a tenant (call after updates)
 */
export function clearSettingsCache(tenantId?: string): void {
    if (tenantId) {
        settingsCache.delete(tenantId)
    } else {
        settingsCache.clear()
    }
}
