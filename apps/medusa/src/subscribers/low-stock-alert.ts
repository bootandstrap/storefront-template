import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { notifyStorefront } from "./shared/bridge"
import { withGovernanceGate } from "./shared/governance-gate"

/**
 * Default threshold — below this stock level, a warning is emitted.
 * Can be overridden per-tenant via config in the future.
 */
const LOW_STOCK_THRESHOLD = 5

/**
 * Subscriber: inventory-item.updated
 *
 * Fires when inventory stock levels change (sales, manual adjustments).
 * Checks if stock has fallen below the low-stock threshold and dispatches
 * an alert email to the store owner via the storefront bridge.
 *
 * GOVERNANCE: Gated on `enable_ecommerce` — low stock monitoring is
 * an implicit sub-feature of the ecommerce module.
 */
export default withGovernanceGate("enable_ecommerce", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) => {
        try {
            const inventoryModule = container.resolve("inventory")

            const inventoryItem = await inventoryModule.retrieveInventoryItem(data.id)

            // Get stock levels across all locations
            const levelResults = await inventoryModule.listInventoryLevels(
                { inventory_item_id: data.id },
                { take: 50 }
            )
            // listInventoryLevels returns [items, count] or just items depending on version
            const levels = Array.isArray(levelResults) && Array.isArray(levelResults[0])
                ? levelResults[0] as Array<Record<string, unknown>>
                : levelResults as unknown as Array<Record<string, unknown>>

            // Calculate total available stock across all locations
            const totalStocked = levels.reduce(
                (sum: number, level: Record<string, unknown>) =>
                    sum + (typeof level.stocked_quantity === 'number' ? level.stocked_quantity : 0),
                0
            )
            const totalReserved = levels.reduce(
                (sum: number, level: Record<string, unknown>) =>
                    sum + (typeof level.reserved_quantity === 'number' ? level.reserved_quantity : 0),
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

                // ── Owner notification via storefront bridge ──
                await notifyStorefront("inventory.low_stock", {
                    sku: inventoryItem.sku,
                    title: inventoryItem.title,
                    available_stock: availableStock,
                    out_of_stock: availableStock <= 0,
                    threshold: LOW_STOCK_THRESHOLD,
                    owner_email: process.env.STORE_OWNER_EMAIL || "",
                }, "low-stock-alert")
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
)

export const config: SubscriberConfig = {
    event: "inventory-item.updated",
}
