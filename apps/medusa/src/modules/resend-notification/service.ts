/**
 * Resend Notification Provider — Service
 *
 * Implements AbstractNotificationProviderService to send transactional
 * emails via Resend from within Medusa's Notification Module.
 *
 * Usage: Medusa subscribers call notificationService.createNotifications()
 * and this provider handles the actual email delivery.
 *
 * @module modules/resend-notification
 */

import {
    AbstractNotificationProviderService,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { Resend } from "resend"

// ── Types ────────────────────────────────────────────────────────

interface ResendProviderOptions {
    api_key: string
    from: string
}

interface NotificationData {
    to: string
    subject: string
    html: string
    text?: string
    /** Reply-to address (optional) */
    reply_to?: string
    /** BCC recipients (optional) */
    bcc?: string[]
}

type InjectedDependencies = {
    logger: Logger
}

// ── Provider ─────────────────────────────────────────────────────

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "resend"

    private resend: Resend
    private from: string
    private logger: Logger

    constructor(
        { logger }: InjectedDependencies,
        options: ResendProviderOptions
    ) {
        super()
        this.logger = logger
        this.from = options.from || "noreply@bootandstrap.com"

        if (!options.api_key) {
            this.logger.warn(
                "[resend-notification] RESEND_API_KEY not set — emails will fail. " +
                "Set RESEND_API_KEY in your .env file."
            )
        }

        this.resend = new Resend(options.api_key || "re_placeholder")
    }

    /**
     * Send a notification via Resend.
     *
     * @param notification - The notification payload from Medusa
     * @returns Provider-specific response data
     */
    async send(notification: {
        to: string
        channel: string
        template?: string
        data?: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
        // Only handle email channel
        if (notification.channel !== "email") {
            this.logger.debug(`[resend-notification] Skipping non-email channel: ${notification.channel}`)
            return { sent: false, reason: "non-email channel" }
        }

        const data = notification.data as unknown as NotificationData
        if (!data?.to && !notification.to) {
            this.logger.warn("[resend-notification] No recipient — skipping")
            return { sent: false, reason: "no recipient" }
        }

        try {
            const result = await this.resend.emails.send({
                from: this.from,
                to: data?.to || notification.to,
                subject: data?.subject || "Notification",
                html: data?.html || "<p>Notification from your store</p>",
                ...(data?.text && { text: data.text }),
                ...(data?.reply_to && { replyTo: data.reply_to }),
                ...(data?.bcc?.length && { bcc: data.bcc }),
            })

            this.logger.info(
                `[resend-notification] Email sent to ${data?.to || notification.to} (${data?.subject || "no subject"})`
            )

            return { sent: true, id: result.data?.id }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            this.logger.error(`[resend-notification] Failed to send email: ${msg}`)

            // Don't throw — notification failures should not break order flows
            return { sent: false, error: msg }
        }
    }
}

export default ResendNotificationProviderService
