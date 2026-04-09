import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { withGovernanceGate } from "./shared/governance-gate"
import { EMAIL_MARKETING_MODULE } from "../modules/email-marketing"
import type EmailMarketingModuleService from "../modules/email-marketing/service"

/**
 * Subscriber: order.placed → Email Marketing send tracking
 *
 * When an order is placed, logs the event for email campaign analytics
 * (e.g., post-purchase follow-ups, abandoned cart recovery metrics).
 *
 * GOVERNANCE: Gated on `enable_email_marketing` — skipped if Email module is disabled.
 */
export default withGovernanceGate("enable_email_marketing", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) => {
    try {
        const orderModule = container.resolve("order")
        const order = await orderModule.retrieveOrder(data.id)

        if (!order.email) return

        console.log(JSON.stringify({
            level: "info",
            event: "email_marketing.order_event",
            email: order.email,
            order_id: order.id,
            total: order.total,
            currency: order.currency_code,
            message: "Order event tracked for email marketing campaigns",
        }))

        // Future: trigger post-purchase email campaigns here
        // const emailService = container.resolve(EMAIL_MARKETING_MODULE) as EmailMarketingModuleService
        // await emailService.createEmailSends({ ... })
    } catch (err) {
        console.error(JSON.stringify({
            level: "error",
            event: "email_marketing.tracking_failed",
            order_id: data.id,
            error: err instanceof Error ? err.message : String(err),
        }))
    }
})

export const config: SubscriberConfig = {
    event: "order.placed",
}
