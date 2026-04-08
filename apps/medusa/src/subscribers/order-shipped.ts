import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { notifyStorefront, dispatchToChannels } from "./shared/bridge"
import { withGovernanceGate } from "./shared/governance-gate"

/**
 * Subscriber: order.fulfillment_created
 *
 * Fires when fulfillment is created for an order (i.e., items shipped).
 * Logs structured shipment data and dispatches shipping notification email
 * via the storefront's internal API.
 *
 * GOVERNANCE: Gated on `enable_ecommerce` — skipped if ecommerce module is disabled.
 */
export default withGovernanceGate("enable_ecommerce", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string; fulfillment_id: string; order_id: string }>) => {
    try {
        const fulfillmentModule = container.resolve("fulfillment")
        const orderModule = container.resolve("order")

        const fulfillment = await fulfillmentModule.retrieveFulfillment(
            data.fulfillment_id || data.id,
            { relations: ["items", "labels"] }
        )

        // Try to get order context for richer logging + email
        let orderInfo: { display_id?: number; email?: string; first_name?: string } = {}
        if (data.order_id) {
            try {
                const order = await orderModule.retrieveOrder(data.order_id, {
                    relations: ["shipping_address"],
                })
                orderInfo = {
                    display_id: order.display_id,
                    email: order.email,
                    first_name: order.shipping_address?.first_name,
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

        // ── Multi-channel dispatch (webhook, whatsapp, telegram) ──
        await dispatchToChannels("order.fulfillment_created", {
            display_id: orderInfo.display_id,
            customer_email: orderInfo.email,
            customer_name: orderInfo.first_name || orderInfo.email?.split("@")[0],
            tracking_numbers: trackingNumbers,
            item_count: fulfillment.items?.length ?? 0,
        })

        // ── Email notification via storefront bridge ──
        if (orderInfo.email) {
            await notifyStorefront("order.shipped", {
                customer_email: orderInfo.email,
                customer_name: orderInfo.first_name || orderInfo.email.split("@")[0],
                display_id: orderInfo.display_id,
                tracking_numbers: trackingNumbers,
            }, "order-shipped")
        }
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
})

export const config: SubscriberConfig = {
    event: "order.fulfillment_created",
}
