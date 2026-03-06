import {
    createStep,
    createWorkflow,
    WorkflowResponse,
    StepResponse,
    transform,
} from "@medusajs/framework/workflows-sdk"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CancelOrderInput = {
    order_id: string
}

type CancelOrderOutput = {
    order_id: string
    inventory_restored: boolean
    notification_sent: boolean
}

// ---------------------------------------------------------------------------
// Step 1: Cancel the order in Medusa
// ---------------------------------------------------------------------------

const cancelOrderStep = createStep(
    "cancel-order",
    async ({ order_id }: CancelOrderInput, { container }) => {
        const orderModule = container.resolve("order")

        // Retrieve order before cancellation (for compensation data)
        const order = await orderModule.retrieveOrder(order_id, {
            relations: ["items"],
        })

        // Cancel via order module status update
        await orderModule.updateOrders([{
            id: order_id,
            status: "canceled",
        }])

        console.log(
            JSON.stringify({
                level: "info",
                event: "workflow.cancel_order",
                order_id,
                display_id: order.display_id,
            })
        )

        const items = (order.items ?? []).map(item => ({
            variant_id: item.variant_id ?? null,
            quantity: item.quantity,
        }))

        return new StepResponse(
            { order_id, display_id: String(order.display_id ?? ""), items },
            { order_id, items }
        )
    },
    async (compensationData) => {
        if (!compensationData) return
        console.error(
            JSON.stringify({
                level: "error",
                event: "workflow.cancel_order.compensation",
                order_id: compensationData.order_id,
                message: "Order cancellation requires manual reversal",
            })
        )
    }
)

// ---------------------------------------------------------------------------
// Step 2: Restore inventory for cancelled order items
// ---------------------------------------------------------------------------

const restoreInventoryStep = createStep(
    "restore-inventory",
    async (
        input: {
            order_id: string
            items: Array<{ variant_id: string | null; quantity: number }>
        },
        { container }
    ) => {
        const inventoryModule = container.resolve("inventory")
        const restoredItems: Array<{ variant_id: string; quantity: number }> = []

        for (const item of input.items) {
            if (!item.variant_id) continue

            try {
                const inventoryItems = await inventoryModule.listInventoryItems({
                    sku: item.variant_id,
                })

                if (inventoryItems.length > 0) {
                    const invItem = inventoryItems[0]
                    const levels = await inventoryModule.listInventoryLevels({
                        inventory_item_id: invItem.id,
                    })

                    if (levels.length > 0) {
                        await inventoryModule.adjustInventory(
                            invItem.id,
                            levels[0].location_id,
                            item.quantity
                        )
                        restoredItems.push({
                            variant_id: item.variant_id,
                            quantity: item.quantity,
                        })
                    }
                }
            } catch (err) {
                console.warn(
                    JSON.stringify({
                        level: "warn",
                        event: "workflow.restore_inventory.item_error",
                        order_id: input.order_id,
                        variant_id: item.variant_id,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )
            }
        }

        return new StepResponse(
            { restored: restoredItems.length > 0, items: restoredItems },
            { order_id: input.order_id, items: restoredItems }
        )
    },
    async (compensationData, { container }) => {
        if (!compensationData?.items?.length) return

        const inventoryModule = container.resolve("inventory")
        for (const item of compensationData.items) {
            try {
                const inventoryItems = await inventoryModule.listInventoryItems({
                    sku: item.variant_id,
                })
                if (inventoryItems.length > 0) {
                    const invItem = inventoryItems[0]
                    const levels = await inventoryModule.listInventoryLevels({
                        inventory_item_id: invItem.id,
                    })
                    if (levels.length > 0) {
                        await inventoryModule.adjustInventory(
                            invItem.id,
                            levels[0].location_id,
                            -item.quantity
                        )
                    }
                }
            } catch (err) {
                console.error(
                    JSON.stringify({
                        level: "error",
                        event: "workflow.restore_inventory.compensation_error",
                        variant_id: item.variant_id,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )
            }
        }
    }
)

// ---------------------------------------------------------------------------
// Step 3: Notify storefront about cancellation
// ---------------------------------------------------------------------------

const notifyCancellationStep = createStep(
    "notify-cancellation",
    async (input: { order_id: string; display_id: string }) => {
        const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:3000"
        const eventsSecret = process.env.MEDUSA_EVENTS_SECRET || ""

        try {
            const res = await fetch(`${storefrontUrl}/api/webhooks/medusa-events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(eventsSecret && { "x-medusa-events-secret": eventsSecret }),
                },
                body: JSON.stringify({
                    event_type: "order.cancelled",
                    data: { order_id: input.order_id, display_id: input.display_id },
                }),
                signal: AbortSignal.timeout(10000),
            })
            return new StepResponse({ sent: res.ok })
        } catch {
            return new StepResponse({ sent: false })
        }
    }
)

// ---------------------------------------------------------------------------
// Workflow: Cancel Order with Inventory Restoration
// ---------------------------------------------------------------------------

const cancelOrderWithInventoryWorkflow = createWorkflow(
    "cancel-order-with-inventory",
    (input: CancelOrderInput) => {
        const orderResult = cancelOrderStep(input)

        // Use transform to extract step result data for subsequent steps
        const inventoryInput = transform({ orderResult }, (data) => ({
            order_id: data.orderResult.order_id,
            items: data.orderResult.items,
        }))

        const inventoryResult = restoreInventoryStep(inventoryInput)

        const notifInput = transform({ orderResult }, (data) => ({
            order_id: data.orderResult.order_id,
            display_id: data.orderResult.display_id,
        }))

        const notifResult = notifyCancellationStep(notifInput)

        const result = transform(
            { orderResult, inventoryResult, notifResult },
            (data): CancelOrderOutput => ({
                order_id: data.orderResult.order_id,
                inventory_restored: data.inventoryResult.restored,
                notification_sent: data.notifResult.sent,
            })
        )

        return new WorkflowResponse(result)
    }
)

export default cancelOrderWithInventoryWorkflow
