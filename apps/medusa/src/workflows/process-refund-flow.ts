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

type RefundInput = {
    order_id: string
    amount?: number // If not specified, refund full order total
    reason?: string
}

type RefundOutput = {
    order_id: string
    refund_id: string | null
    amount_refunded: number
    notification_sent: boolean
}

// ---------------------------------------------------------------------------
// Step 1: Process refund via payment provider
// ---------------------------------------------------------------------------

const processRefundStep = createStep(
    "process-stripe-refund",
    async (input: RefundInput, { container }) => {
        const orderModule = container.resolve("order")
        const paymentModule = container.resolve("payment")

        // Retrieve order with payment collections relation for scoped refund
        const order = await orderModule.retrieveOrder(input.order_id, {
            relations: ["payment_collections"],
        })

        const refundAmount = input.amount ?? Number(order.total ?? 0)
        if (refundAmount <= 0) {
            throw new Error(`Invalid refund amount ${refundAmount} for order ${input.order_id}`)
        }

        // C2 FIX: Scope payments to order's payment collections (not global listPayments)
        let refundId: string | null = null
        const paymentCollections = (order as unknown as { payment_collections?: Array<{ id: string }> }).payment_collections ?? []

        for (const collection of paymentCollections) {
            try {
                const payments = await paymentModule.listPayments({
                    payment_collection_id: collection.id,
                } as Record<string, unknown>)

                for (const payment of payments) {
                    if (payment.captured_at) {
                        try {
                            const refund = await paymentModule.refundPayment({
                                payment_id: payment.id,
                                amount: refundAmount,
                            })
                            refundId = refund.id
                            break
                        } catch {
                            continue
                        }
                    }
                }
                if (refundId) break
            } catch (err) {
                console.warn(
                    JSON.stringify({
                        level: "warn",
                        event: "workflow.refund.collection_error",
                        order_id: input.order_id,
                        collection_id: collection.id,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )
            }
        }

        if (!refundId) {
            throw new Error(
                `No captured payment found for order ${input.order_id} — cannot refund`
            )
        }

        console.log(
            JSON.stringify({
                level: "info",
                event: "workflow.refund.processed",
                order_id: input.order_id,
                refund_id: refundId,
                amount: refundAmount,
            })
        )

        return new StepResponse(
            {
                refund_id: refundId,
                amount_refunded: refundAmount,
                display_id: String(order.display_id ?? ""),
                customer_email: order.email ?? null,
            },
            { refund_id: refundId, order_id: input.order_id }
        )
    }
    // No compensation: Stripe refunds cannot be reversed programmatically
)

// ---------------------------------------------------------------------------
// Step 2: Log the refund on the order
// ---------------------------------------------------------------------------

const logRefundStep = createStep(
    "log-refund-on-order",
    async (input: { order_id: string; refund_id: string | null }) => {
        console.log(
            JSON.stringify({
                level: "info",
                event: "workflow.refund.order_logged",
                order_id: input.order_id,
                refund_id: input.refund_id,
            })
        )
        return new StepResponse({ logged: true })
    }
)

// ---------------------------------------------------------------------------
// Step 3: Notify customer about refund
// ---------------------------------------------------------------------------

const notifyRefundStep = createStep(
    "notify-refund",
    async (input: {
        order_id: string
        display_id: string
        customer_email: string | null
        amount_refunded: number
    }) => {
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
                    event_type: "order.refunded",
                    data: {
                        order_id: input.order_id,
                        display_id: input.display_id,
                        customer_email: input.customer_email,
                        amount_refunded: input.amount_refunded,
                    },
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
// Workflow: Process Refund Flow
// ---------------------------------------------------------------------------

const processRefundFlowWorkflow = createWorkflow(
    "process-refund-flow",
    (input: RefundInput) => {
        const refundResult = processRefundStep(input)

        // Use transform to extract step result data
        const logInput = transform({ refundResult, input }, (data) => ({
            order_id: data.input.order_id,
            refund_id: data.refundResult.refund_id,
        }))

        logRefundStep(logInput)

        const notifInput = transform({ refundResult, input }, (data) => ({
            order_id: data.input.order_id,
            display_id: data.refundResult.display_id,
            customer_email: data.refundResult.customer_email,
            amount_refunded: data.refundResult.amount_refunded,
        }))

        const notifResult = notifyRefundStep(notifInput)

        const result = transform(
            { refundResult, notifResult, input },
            (data): RefundOutput => ({
                order_id: data.input.order_id,
                refund_id: data.refundResult.refund_id,
                amount_refunded: data.refundResult.amount_refunded,
                notification_sent: data.notifResult.sent,
            })
        )

        return new WorkflowResponse(result)
    }
)

export default processRefundFlowWorkflow
