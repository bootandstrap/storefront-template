import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"

/**
 * Subscriber: order.placed
 *
 * Fires when a new order is created. Currently logs structured order data
 * for observability (visible in Dokploy container logs). Designed as an
 * extension point for future email notifications and analytics.
 */
export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    try {
        const orderModule = container.resolve("order")
        const order = await orderModule.retrieveOrder(data.id, {
            relations: ["items", "shipping_address"],
        })

        // Structured log — parseable by log aggregators (Dokploy, Grafana, etc.)
        console.log(
            JSON.stringify({
                level: "info",
                event: "order.placed",
                timestamp: new Date().toISOString(),
                order_id: order.id,
                display_id: order.display_id,
                total: order.total,
                currency: order.currency_code,
                item_count: order.items?.length ?? 0,
                customer_email: order.email,
                shipping_city: order.shipping_address?.city,
                shipping_country: order.shipping_address?.country_code,
            })
        )

        // --- Extension point: Email notification ---
        // When email config is available (P2.6), dispatch order confirmation:
        //
        // const notificationModule = container.resolve("notification")
        // await notificationModule.createNotifications({
        //   to: order.email,
        //   channel: "email",
        //   template: "order-confirmation",
        //   data: { order },
        // })

        // --- Extension point: Analytics ---
        // Fire-and-forget analytics event to Supabase:
        //
        // const analyticsService = container.resolve("analytics")
        // await analyticsService.trackEvent("order_placed", {
        //   order_id: order.id,
        //   total: order.total,
        // })
    } catch (error) {
        // Subscriber errors must not break the order flow
        console.error(
            JSON.stringify({
                level: "error",
                event: "order.placed.subscriber_error",
                order_id: data.id,
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
