/**
 * Chat API Route
 * Handles chat messages and returns LLM responses grounded in documentation.
 * All operations are tenant-scoped via TENANT_ID env var.
 *
 * Security: tier and userId are resolved SERVER-SIDE from the Supabase session.
 * The client CANNOT escalate privileges by sending a fake tier/userId.
 * Quota is enforced BEFORE calling the LLM.
 */

import { NextRequest, NextResponse } from 'next/server'
import { CHAT_CONFIG } from '@/lib/chat/config'
import { loadDocumentContext } from '@/lib/chat/context-loader'
import { getChatSettings } from '@/lib/chat/settings-loader'
import { logChatRequest } from '@/lib/chat/usage-logger'
import { parseChatRequest } from '@/lib/chat/request-schema'
import { getConfig } from '@/lib/config'
import { CHAT_TIERS, type ChatTier } from '@/lib/chat/client-config'
import { createClient } from '@/lib/supabase/server'
import { chatUsageTable } from '@/lib/chat/db'
import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'
import { getClientIP } from '@/lib/security/rate-limiter'

// ── Server-side rate limiter for chat (10 requests per minute per IP+tenant) ──
const chatRateLimiter = createSmartRateLimiter({
    limit: 10,
    windowMs: 60_000,
    name: 'chat',
})

// ── Server-side visitor quota tracking (in-memory, per IP hash + tenant) ──
const visitorQuotaStore = new Map<string, { count: number; month: string }>()

interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

/**
 * Resolve the chat tier from the authenticated session (server-side only).
 * Mirrors the logic in ShopLayout for consistency.
 */
async function resolveSessionTier(): Promise<{ userId: string | null; tier: ChatTier }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { userId: null, tier: 'visitor' }

        // Check if paying customer (has active subscriptions)
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)

        const tier: ChatTier = (subs && subs.length > 0) ? 'premium' : 'customer'
        return { userId: user.id, tier }
    } catch {
        return { userId: null, tier: 'visitor' }
    }
}

/**
 * Check server-side chat quota for authenticated users.
 * Returns true if the user is within their message limit.
 */
async function checkChatQuota(
    tenantId: string,
    userId: string | null,
    tier: ChatTier,
    planMessageLimit: number | null,
    clientIp: string
): Promise<{ allowed: boolean; remaining: number }> {
    const tierConfig = CHAT_TIERS[tier]
    const limit = tier === 'premium'
        ? (planMessageLimit ?? 1000)
        : (tierConfig.messageLimit ?? 10)

    if (!userId || tier === 'visitor') {
        // Server-side visitor quota tracking via IP hash + tenant
        const currentMonth = new Date().toISOString().slice(0, 7)
        const key = `${tenantId}:${clientIp}:${currentMonth}`
        const entry = visitorQuotaStore.get(key)

        if (!entry || entry.month !== currentMonth) {
            visitorQuotaStore.set(key, { count: 1, month: currentMonth })
            return { allowed: true, remaining: limit - 1 }
        }

        if (entry.count >= limit) {
            return { allowed: false, remaining: 0 }
        }

        entry.count++
        return { allowed: true, remaining: Math.max(0, limit - entry.count) }
    }

    try {
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

        const { data } = await chatUsageTable()
            .select('message_count')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .eq('month', currentMonth)
            .single()

        const used = data?.message_count || 0
        return { allowed: used < limit, remaining: Math.max(0, limit - used) }
    } catch {
        // Fail-closed: degrade gracefully instead of risking unlimited LLM spend
        return { allowed: false, remaining: 0 }
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        // ── Server-side rate limit: 10 req/min per IP+tenant ──
        const clientIp = getClientIP(request)
        const rateLimitKey = `${tenantId}:${clientIp}`
        if (await chatRateLimiter.isLimited(rateLimitKey)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment.' },
                { status: 429 }
            )
        }

        const body = await request.json()
        // Only accept message, history, locale from client (NO tier, NO userId)
        const { message, history, locale } = parseChatRequest(body)

        // Resolve tier and userId from server-side session (NOT from client body)
        const { userId, tier } = await resolveSessionTier()

        // Check API key
        if (!CHAT_CONFIG.apiKey) {
            console.error('[ChatBot] CHAT_LLM_API_KEY not configured')
            return NextResponse.json({ error: 'Chat service not configured' }, { status: 500 })
        }

        // Check if chatbot is enabled via feature flags
        const { featureFlags, planLimits } = await getConfig()
        if (!featureFlags.enable_chatbot) {
            return NextResponse.json({ error: 'Chat service disabled' }, { status: 503 })
        }

        // Load tenant-specific settings from database
        const settings = await getChatSettings(tenantId)
        if (!settings.enabled) {
            return NextResponse.json({ error: 'Chat service temporarily disabled' }, { status: 503 })
        }

        // Enforce chat quota BEFORE calling the LLM
        const quota = await checkChatQuota(
            tenantId, userId, tier,
            planLimits.max_chatbot_messages_month ?? null,
            clientIp
        )
        if (!quota.allowed) {
            return NextResponse.json({
                error: 'Message limit reached',
                remaining: 0,
                tier,
            }, { status: 429 })
        }

        // Load documentation context — tier-based doc limit
        const tierConfig = CHAT_TIERS[tier]
        const context = await loadDocumentContext(tenantId, locale, tierConfig.maxDocs)

        // Get tenant business name for prompt personalization
        const { config } = await getConfig()
        const businessName = config.business_name || 'our business'

        // Build system prompt
        const localizedPrompt = CHAT_CONFIG.systemPrompts[locale as keyof typeof CHAT_CONFIG.systemPrompts]
            || CHAT_CONFIG.systemPrompts.es
        const basePrompt = settings.systemPrompt || localizedPrompt
        const systemPrompt = basePrompt
            .replace(/\{context\}/g, context)
            .replace(/\{business_name\}/g, businessName)

        // Build messages array
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10),
            { role: 'user', content: message }
        ]

        // Map custom models to actual OpenAI models
        const modelMapping: Record<string, string> = {
            'gpt-4.1-nano': 'gpt-4.1-nano',
            'gpt-4.1-mini': 'gpt-4.1-mini',
            'gpt-4.1': 'gpt-4.1'
        }
        const actualModel = modelMapping[settings.model] || settings.model

        // Call LLM API
        const response = await fetch(`${CHAT_CONFIG.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHAT_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: actualModel,
                messages,
                max_tokens: settings.maxResponseTokens,
                temperature: settings.temperature
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[ChatBot] LLM API error (${response.status}):`, errorText)
            return NextResponse.json({ error: `Failed to generate response: ${response.status}` }, { status: 500 })
        }

        const data = await response.json()
        const reply = data.choices?.[0]?.message?.content || 'No response generated.'
        const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 }

        // Log usage (non-blocking, tenant-scoped)
        logChatRequest({
            tenantId,
            userId: userId ?? undefined,
            model: settings.model,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            locale
        }).catch(() => { })

        return NextResponse.json({
            reply,
            isOffTopic: false,
            remaining: quota.remaining - 1,
            tier,
        })

    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json({ error: 'Invalid chat payload' }, { status: 400 })
        }

        console.error('[ChatBot] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
