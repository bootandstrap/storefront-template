import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { notifyStorefront, dispatchToChannels, logAnalyticsEvent } from "./shared/bridge"

/**
 * Subscriber: order.placed
 *
 * Fires when a new order is created. Logs structured order data for
 * observability and dispatches email notification via the storefront's
 * internal API (which has access to tenant email config).
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

        // ── Multi-channel dispatch (webhook, whatsapp, telegram) ──
        await dispatchToChannels("order.placed", {
            customer_email: order.email,
            customer_name: order.shipping_address?.first_name || order.email?.split("@")[0],
            display_id: order.display_id,
            total: order.total,
            currency: order.currency_code,
            item_count: order.items?.length ?? 0,
        })

        // ── Email notification via storefront bridge ──
        // The storefront has access to tenant email config (Resend/SendGrid/Console).
        // We POST the event data there and it handles email dispatch.
        await notifyStorefront("order.placed", {
            customer_email: order.email,
            customer_name: order.shipping_address?.first_name || order.email?.split("@")[0],
            display_id: order.display_id,
            total: order.total,
            currency: order.currency_code,
            item_count: order.items?.length ?? 0,
        }, "order-placed")

        // ── Analytics ──
        // Fire-and-forget analytics event (if Supabase URL is available)
        await logAnalyticsEvent("order_placed", {
            order_id: order.id,
            display_id: order.display_id,
            total: order.total,
            currency: order.currency_code,
            item_count: order.items?.length ?? 0,
        })
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
