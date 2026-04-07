import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { notifyStorefront, dispatchToChannels, logAnalyticsEvent } from "./shared/bridge"

/**
 * Subscriber: order.return_requested
 *
 * Fires when a return/refund is requested for an order.
 * Dispatches multi-channel notifications so the owner is immediately informed.
 */
export default async function orderReturnRequestedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string; order_id?: string; return_id?: string }>) {
    try {
        const orderModule = container.resolve("order")

        // The event may include order_id directly or just the return id
        const orderId = data.order_id || data.id
        const order = await orderModule.retrieveOrder(orderId, {
            relations: ["items", "shipping_address"],
        })

        const eventData = {
            order_id: order.id,
            display_id: order.display_id,
            customer_email: order.email,
            customer_name: order.shipping_address?.first_name || order.email?.split("@")[0],
            total: order.total,
            currency: order.currency_code,
            item_count: order.items?.length ?? 0,
            return_id: data.return_id || data.id,
        }

        // Structured log
        console.log(
            JSON.stringify({
                level: "info",
                event: "order.return_requested",
                timestamp: new Date().toISOString(),
                ...eventData,
            })
        )

        // Multi-channel dispatch (webhook, whatsapp, telegram)
        await dispatchToChannels("order.return_requested", eventData)

        // Email notification via storefront bridge
        await notifyStorefront("order.return_requested", eventData, "order-return-requested")

        // Analytics
        await logAnalyticsEvent("order_return_requested", eventData)
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                event: "order.return_requested.subscriber_error",
                id: data.id,
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config: SubscriberConfig = {
    event: "order.return_requested",
}
