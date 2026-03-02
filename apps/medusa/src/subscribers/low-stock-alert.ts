import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"

/**
 * Default threshold — below this stock level, a warning is emitted.
 * Can be overridden per-tenant via config in the future.
 */
const LOW_STOCK_THRESHOLD = 5

/**
 * Subscriber: inventory-item.updated
 *
 * Fires when inventory stock levels change (sales, manual adjustments).
 * Checks if stock has fallen below the low-stock threshold and emits
 * a structured warning log. Extension point for owner notifications.
 */
export default async function lowStockAlertHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    try {
        const inventoryModule = container.resolve("inventory")

        const inventoryItem = await inventoryModule.retrieveInventoryItem(data.id)

        // Get stock levels across all locations
        const [levels] = await inventoryModule.listInventoryLevels(
            { inventory_item_id: data.id },
            { take: 50 }
        )

        // Calculate total available stock across all locations
        const totalStocked = levels.reduce(
            (sum: number, level: { stocked_quantity?: number }) =>
                sum + (level.stocked_quantity ?? 0),
            0
        )
        const totalReserved = levels.reduce(
            (sum: number, level: { reserved_quantity?: number }) =>
                sum + (level.reserved_quantity ?? 0),
            0
        )
        const availableStock = totalStocked - totalReserved

        if (availableStock <= LOW_STOCK_THRESHOLD) {
            console.log(
                JSON.stringify({
                    level: availableStock <= 0 ? "warn" : "info",
                    event: "inventory.low_stock",
                    timestamp: new Date().toISOString(),
                    inventory_item_id: inventoryItem.id,
                    sku: inventoryItem.sku,
                    title: inventoryItem.title,
                    available_stock: availableStock,
                    stocked_quantity: totalStocked,
                    reserved_quantity: totalReserved,
                    threshold: LOW_STOCK_THRESHOLD,
                    out_of_stock: availableStock <= 0,
                })
            )

            // --- Extension point: Owner notification ---
            // When notification system is available:
            //
            // if (availableStock <= 0) {
            //   const notificationModule = container.resolve("notification")
            //   await notificationModule.createNotifications({
            //     to: "owner",
            //     channel: "email",
            //     template: "out-of-stock-alert",
            //     data: { sku: inventoryItem.sku, title: inventoryItem.title },
            //   })
            // }
        }
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                event: "inventory.low_stock.subscriber_error",
                inventory_item_id: data.id,
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config: SubscriberConfig = {
    event: "inventory-item.updated",
}
