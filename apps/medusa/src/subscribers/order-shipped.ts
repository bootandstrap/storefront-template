import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"

/**
 * Subscriber: order.fulfillment_created
 *
 * Fires when fulfillment is created for an order (i.e., items shipped).
 * Logs structured shipment data for observability. Extension point for
 * shipping notification emails.
 */
export default async function orderShippedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string; fulfillment_id: string; order_id: string }>) {
    try {
        const fulfillmentModule = container.resolve("fulfillment")
        const orderModule = container.resolve("order")

        const fulfillment = await fulfillmentModule.retrieveFulfillment(
            data.fulfillment_id || data.id,
            { relations: ["items", "labels"] }
        )

        // Try to get order context for richer logging
        let orderInfo: { display_id?: number; email?: string } = {}
        if (data.order_id) {
            try {
                const order = await orderModule.retrieveOrder(data.order_id)
                orderInfo = {
                    display_id: order.display_id,
                    email: order.email,
                }
            } catch {
                // order_id may not be directly on the event in all Medusa versions
            }
        }

        // Extract tracking info from fulfillment labels
        const trackingNumbers = fulfillment.labels
            ?.map((l: { tracking_number?: string }) => l.tracking_number)
            .filter(Boolean) ?? []

        console.log(
            JSON.stringify({
                level: "info",
                event: "order.shipped",
                timestamp: new Date().toISOString(),
                fulfillment_id: fulfillment.id,
                order_id: data.order_id,
                display_id: orderInfo.display_id,
                customer_email: orderInfo.email,
                item_count: fulfillment.items?.length ?? 0,
                tracking_numbers: trackingNumbers,
                provider_id: fulfillment.provider_id,
            })
        )

        // --- Extension point: Shipping notification email ---
        // const notificationModule = container.resolve("notification")
        // await notificationModule.createNotifications({
        //   to: orderInfo.email,
        //   channel: "email",
        //   template: "order-shipped",
        //   data: { fulfillment, tracking_numbers: trackingNumbers },
        // })
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                event: "order.shipped.subscriber_error",
                fulfillment_id: data.fulfillment_id || data.id,
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config: SubscriberConfig = {
    event: "order.fulfillment_created",
}
