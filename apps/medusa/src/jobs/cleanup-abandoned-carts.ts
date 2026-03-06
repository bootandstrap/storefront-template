import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Scheduled Job: Cleanup Abandoned Carts
 *
 * Runs daily at 3:00 AM UTC.
 * Removes carts older than 7 days that were never completed (no order created).
 *
 * This prevents unbounded DB growth in the Medusa PostgreSQL database.
 * Respects completed carts (with completed_at set).
 */
export default async function cleanupAbandonedCarts(
    container: MedusaContainer
) {
    const cartModule = container.resolve("cart")

    try {
        // Fetch carts older than 7 days without completion
        const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const [carts, count] = await cartModule.listAndCountCarts(
            {
                created_at: { $lt: cutoffDate.toISOString() },
            },
            {
                select: ["id", "created_at"],
                take: 500, // Process in batches to avoid OOM
            }
        )

        if (count === 0) {
            console.log(
                JSON.stringify({
                    level: "info",
                    event: "cart_cleanup",
                    timestamp: new Date().toISOString(),
                    message: "No abandoned carts to clean up",
                    total_found: 0,
                })
            )
            return
        }

        // Delete abandoned carts
        let deleted = 0
        let errors = 0

        for (const cart of carts) {
            try {
                await cartModule.deleteCarts([cart.id])
                deleted++
            } catch (err) {
                errors++
                console.warn(
                    JSON.stringify({
                        level: "warn",
                        event: "cart_cleanup.delete_error",
                        cart_id: cart.id,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )
            }
        }

        console.log(
            JSON.stringify({
                level: "info",
                event: "cart_cleanup",
                timestamp: new Date().toISOString(),
                total_found: count,
                deleted,
                errors,
                cutoff_date: cutoffDate.toISOString(),
            })
        )
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                event: "cart_cleanup.fatal",
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
            })
        )
    }
}

export const config = {
    name: "cleanup-abandoned-carts",
    schedule: "0 3 * * *", // Every day at 3:00 AM UTC
}
