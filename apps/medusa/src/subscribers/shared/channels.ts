/**
 * Notification Channel Senders
 *
 * Zero dependencies — all channels use native fetch().
 * Each function is fire-and-forget safe (returns success/error, never throws).
 *
 * Channels:
 * - Webhook:  POST JSON to any URL with HMAC signing
 * - WhatsApp: Meta Cloud API (Business Account required)
 * - Telegram: Bot API sendMessage
 */

import * as crypto from "crypto"

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export interface WebhookResult {
    ok: boolean
    status?: number
    error?: string
}

/**
 * POST JSON payload to a webhook URL with optional HMAC-SHA256 signing.
 */
export async function sendWebhook(
    url: string,
    secret: string,
    payload: object
): Promise<WebhookResult> {
    try {
        const body = JSON.stringify(payload)
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }

        // Sign payload if secret is provided
        if (secret) {
            const signature = crypto
                .createHmac("sha256", secret)
                .update(body)
                .digest("hex")
            headers["x-webhook-signature"] = `sha256=${signature}`
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(10000),
        })

        return { ok: res.ok, status: res.status }
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

// ---------------------------------------------------------------------------
// WhatsApp (Meta Cloud API)
// ---------------------------------------------------------------------------

export interface WhatsAppResult {
    ok: boolean
    error?: string
}

/**
 * Send a text message via WhatsApp Business Cloud API.
 *
 * Requires:
 * - phoneNumberId: from Meta Business dashboard
 * - token: permanent access token
 * - to: recipient phone number (international format, e.g., +41791234567)
 * - message: plain text body
 */
export async function sendWhatsApp(
    phoneNumberId: string,
    token: string,
    to: string,
    message: string
): Promise<WhatsAppResult> {
    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: to.replace(/[^+\d]/g, ""), // sanitize to digits+plus
                    type: "text",
                    text: { body: message },
                }),
                signal: AbortSignal.timeout(10000),
            }
        )

        if (!res.ok) {
            const errBody = await res.text().catch(() => "")
            return { ok: false, error: `HTTP ${res.status}: ${errBody}` }
        }
        return { ok: true }
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

// ---------------------------------------------------------------------------
// Telegram (Bot API)
// ---------------------------------------------------------------------------

export interface TelegramResult {
    ok: boolean
    error?: string
}

/**
 * Send a message via Telegram Bot API.
 *
 * Requires:
 * - botToken: from @BotFather (format: 123456:ABC-DEF...)
 * - chatId: target chat/group/channel ID
 * - message: text with optional HTML formatting
 */
export async function sendTelegram(
    botToken: string,
    chatId: string,
    message: string
): Promise<TelegramResult> {
    try {
        const res = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }),
                signal: AbortSignal.timeout(10000),
            }
        )

        if (!res.ok) {
            const errBody = await res.text().catch(() => "")
            return { ok: false, error: `HTTP ${res.status}: ${errBody}` }
        }
        return { ok: true }
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}
