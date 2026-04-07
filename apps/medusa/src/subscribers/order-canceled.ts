import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { notifyStorefront, dispatchToChannels, logAnalyticsEvent } from "./shared/bridge"

/**
 * Subscriber: order.canceled
 *
 * Fires when an order is canceled. Dispatches multi-channel notifications
 * and logs structured event data for observability.
 */
export default async function orderCanceledHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    try {
        const orderModule = container.resolve("order")
        const order = await orderModule.retrieveOrder(data.id, {
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
        }

        // Structured log
        console.log(
            JSON.stringify({
                level: "info",
                event: "order.canceled",
                timestamp: new Date().toISOString(),
                ...eventData,
            })
        )

        // Multi-channel dispatch (webhook, whatsapp, telegram)
        await dispatchToChannels("order.canceled", eventData)

        // Email notification via storefront bridge
        await notifyStorefront("order.canceled", eventData, "order-canceled")

        // Analytics
        await logAnalyticsEvent("order_canceled", eventData)
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                event: "order.canceled.subscriber_error",
                order_id: data.id,
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config: SubscriberConfig = {
    event: "order.canceled",
}
