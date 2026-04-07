/**
 * Shared utilities for Medusa subscribers.
 *
 * DRY extraction of duplicated patterns across:
 * - order-placed.ts
 * - order-shipped.ts
 * - low-stock-alert.ts
 *
 * These functions bridge Medusa → Storefront communication
 * and analytics event logging.
 */

import { sendWebhook, sendWhatsApp, sendTelegram } from "./channels"
import { formatNotificationMessage, type NotificationEvent } from "./message-templates"

// ---------------------------------------------------------------------------
// Storefront Bridge
// ---------------------------------------------------------------------------

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000"
const MEDUSA_EVENTS_SECRET = process.env.MEDUSA_EVENTS_SECRET || ""

/**
 * POST event data to the storefront's internal webhook endpoint.
 * The storefront has access to tenant email config (Resend/SendGrid/Console)
 * and dispatches emails accordingly.
 *
 * Non-blocking — errors are logged but never thrown.
 */
export async function notifyStorefront(
    eventType: string,
    data: Record<string, unknown>,
    callerTag = "subscriber"
): Promise<boolean> {
    try {
        const res = await fetch(`${STOREFRONT_URL}/api/webhooks/medusa-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(MEDUSA_EVENTS_SECRET && {
                    "x-medusa-events-secret": MEDUSA_EVENTS_SECRET,
                }),
            },
            body: JSON.stringify({ event_type: eventType, data }),
            signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
            console.warn(
                `[${callerTag}] Storefront notification failed: HTTP ${res.status}`
            )
            return false
        }
        return true
    } catch (err) {
        console.warn(
            `[${callerTag}] Storefront notification error: ${err instanceof Error ? err.message : String(err)
            }`
        )
        return false
    }
}

// ---------------------------------------------------------------------------
// Multi-Channel Notification Dispatcher
// ---------------------------------------------------------------------------


/** Channel configuration shape from config.notification_channels */
interface ChannelConfigs {
    webhook?: { enabled: boolean; url: string; secret: string }
    whatsapp?: { enabled: boolean; phone_number_id: string; token: string; recipient: string }
    telegram?: { enabled: boolean; bot_token: string; chat_id: string }
    email?: { enabled: boolean }
}

/** Event → channel mapping from config.notification_events */
type EventChannelMap = Record<string, string[]>

/** In-memory cache for notification config (TTL: 60s) */
let configCache: { channels: ChannelConfigs; events: EventChannelMap; ts: number } | null = null
const CONFIG_TTL = 60_000

/**
 * Read notification config from Supabase config table.
 * Uses service_role key (same pattern as logAnalyticsEvent).
 * Cached for 60s to avoid per-event DB queries.
 */
async function fetchNotificationConfig(): Promise<{
    channels: ChannelConfigs
    events: EventChannelMap
}> {
    if (configCache && Date.now() - configCache.ts < CONFIG_TTL) {
        return { channels: configCache.channels, events: configCache.events }
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const tenantId = process.env.TENANT_ID

    if (!supabaseUrl || !supabaseKey || !tenantId) {
        return { channels: {}, events: {} }
    }

    try {
        const res = await fetch(
            `${supabaseUrl}/rest/v1/config?tenant_id=eq.${tenantId}&select=notification_channels,notification_events`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
                signal: AbortSignal.timeout(5000),
            }
        )

        if (!res.ok) return { channels: {}, events: {} }

        const rows = await res.json()
        const row = rows?.[0]
        const channels = (row?.notification_channels ?? {}) as ChannelConfigs
        const events = (row?.notification_events ?? {}) as EventChannelMap

        configCache = { channels, events, ts: Date.now() }
        return { channels, events }
    } catch {
        return { channels: {}, events: {} }
    }
}

/**
 * Dispatch a notification to all configured channels for the given event.
 *
 * Non-blocking — errors per channel are logged but never thrown.
 * Email is handled separately via notifyStorefront() (already implemented).
 */
export async function dispatchToChannels(
    eventType: string,
    data: Record<string, unknown>
): Promise<void> {
    try {
        const { channels, events } = await fetchNotificationConfig()
        const activeChannelsForEvent = events[eventType]

        // No channel mapping for this event → skip
        if (!activeChannelsForEvent || activeChannelsForEvent.length === 0) return

        const dispatches: Promise<void>[] = []
        const event = eventType as NotificationEvent

        // Webhook
        if (
            activeChannelsForEvent.includes("webhook") &&
            channels.webhook?.enabled &&
            channels.webhook.url
        ) {
            const payload = formatNotificationMessage(event, data, "webhook")
            dispatches.push(
                sendWebhook(channels.webhook.url, channels.webhook.secret, payload as object)
                    .then((r) => {
                        if (!r.ok) {
                            console.warn(
                                `[dispatcher] Webhook failed: ${r.status} ${r.error ?? ""}`
                            )
                        }
                    })
            )
        }

        // WhatsApp
        if (
            activeChannelsForEvent.includes("whatsapp") &&
            channels.whatsapp?.enabled &&
            channels.whatsapp.phone_number_id &&
            channels.whatsapp.token &&
            channels.whatsapp.recipient
        ) {
            const msg = formatNotificationMessage(event, data, "whatsapp") as string
            // WhatsApp does not support HTML tags — strip them
            const plainMsg = msg.replace(/<[^>]*>/g, "")
            dispatches.push(
                sendWhatsApp(
                    channels.whatsapp.phone_number_id,
                    channels.whatsapp.token,
                    channels.whatsapp.recipient,
                    plainMsg
                ).then((r) => {
                    if (!r.ok) {
                        console.warn(`[dispatcher] WhatsApp failed: ${r.error}`)
                    }
                })
            )
        }

        // Telegram
        if (
            activeChannelsForEvent.includes("telegram") &&
            channels.telegram?.enabled &&
            channels.telegram.bot_token &&
            channels.telegram.chat_id
        ) {
            const msg = formatNotificationMessage(event, data, "telegram") as string
            dispatches.push(
                sendTelegram(
                    channels.telegram.bot_token,
                    channels.telegram.chat_id,
                    msg
                ).then((r) => {
                    if (!r.ok) {
                        console.warn(`[dispatcher] Telegram failed: ${r.error}`)
                    }
                })
            )
        }

        // Fire all in parallel — never await blocking
        if (dispatches.length > 0) {
            await Promise.allSettled(dispatches)
            console.log(
                JSON.stringify({
                    level: "info",
                    event: "notification.dispatched",
                    eventType,
                    channels: activeChannelsForEvent.filter((c: string) => c !== "email"),
                    timestamp: new Date().toISOString(),
                })
            )
        }
    } catch (err) {
        console.warn(
            `[dispatcher] Error: ${err instanceof Error ? err.message : String(err)}`
        )
    }
}

// ---------------------------------------------------------------------------
// Analytics Event Logger
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget analytics event to Supabase.
 * Uses raw REST API to avoid dependency on generated Supabase types.
 *
 * Non-blocking — errors are silently swallowed.
 */
export async function logAnalyticsEvent(
    eventType: string,
    properties: Record<string, unknown>
): Promise<void> {
    try {
        const supabaseUrl =
            process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) return

        await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                event_type: eventType,
                properties: { ...properties, source: "medusa_subscriber" },
                tenant_id: process.env.TENANT_ID || null,
            }),
            signal: AbortSignal.timeout(5000),
        })
    } catch {
        // Silent fail — analytics must never block business logic
    }
}
