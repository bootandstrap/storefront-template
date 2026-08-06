import { createHash } from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

import { POS_MODULE } from "../../../../modules/pos"
import {
    executePOSRefundOperation,
    POSRefundExecutionError,
    type POSRefundOperationInput,
} from "../../../../modules/pos/refund-coordinator"
import type PosModuleService from "../../../../modules/pos/service"

const REFUND_SCHEMA = "bootandstrap.pos-refund-operation/v1"

const requestSchema = z.object({
    order_id: z.string().trim().min(1),
    operation_id: z.string().trim().min(1),
    idempotency_key: z.string().trim().min(1),
    items: z.array(z.object({
        item_id: z.string().trim().min(1),
        quantity: z.number().int().positive(),
    })).min(1),
    reason: z.enum(["damaged", "wrong_item", "dissatisfied", "other"]),
    reason_note: z.string().trim().max(500).optional(),
})

type RefundMetadata = {
    schema?: unknown
    operation_id?: unknown
    idempotency_key?: unknown
    payload_sha256?: unknown
}

type RefundRecord = {
    id: string
    amount?: number
    metadata?: RefundMetadata | null
}

type PaymentRecord = {
    id: string
    amount: number
    captured_at?: Date | string | null
    refunds?: RefundRecord[]
}

type PaymentService = {
    listPayments(
        filters: Record<string, unknown>,
        config?: Record<string, unknown>,
    ): Promise<PaymentRecord[]>
    refundPayment(input: Record<string, unknown>): Promise<PaymentRecord>
}

type OrderRecord = {
    id: string
    sales_channel_id?: string | null
    items?: Array<{ id: string; title?: string; quantity: number; unit_price: number }>
    payment_collections?: Array<{ id: string }>
}

type OrderService = {
    retrieveOrder(id: string, config?: Record<string, unknown>): Promise<OrderRecord>
}

class RequestFailure extends Error {
    constructor(readonly status: number, readonly code: string) {
        super(code)
    }
}

function oneHeader(value: string | string[] | undefined): string {
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

function exactRefund(refunds: RefundRecord[] | undefined, input: POSRefundOperationInput): RefundRecord | null {
    return refunds?.find((refund) => {
        const metadata = refund.metadata
        return metadata?.schema === REFUND_SCHEMA
            && metadata.operation_id === input.operation_id
            && metadata.idempotency_key === input.idempotency_key
            && metadata.payload_sha256 === input.payload_sha256
    }) ?? null
}

function safeInteger(value: unknown): number {
    const numeric = Number(value)
    if (!Number.isSafeInteger(numeric) || numeric < 0) throw new RequestFailure(422, "invalid_order_amount")
    return numeric
}

function operationStatus(outcome: string, status: string): number {
    if (status === "acknowledged") return 200
    if (outcome === "conflict") return 409
    if (outcome === "over_refund") return 422
    if (status === "failed") return 422
    return 202
}

function authorizedRuntime(req: MedusaRequest):
    | { tenantId: string; salesChannelId: string }
    | { status: number; errorCode: string } {
    const tenantId = process.env.TENANT_ID?.trim() ?? ""
    const requestedTenantId = oneHeader(req.headers["x-tenant-id"])
    const salesChannelId = oneHeader(req.headers["x-medusa-sales-channel-id"])
    if (!tenantId) return { status: 503, errorCode: "tenant_runtime_unavailable" }
    if (!requestedTenantId || requestedTenantId !== tenantId) return { status: 403, errorCode: "tenant_mismatch" }
    if (!salesChannelId) return { status: 403, errorCode: "sales_channel_scope_missing" }
    return { tenantId, salesChannelId }
}

async function requireScopedOrder(req: MedusaRequest, orderId: string, salesChannelId: string): Promise<OrderRecord> {
    const orderService = req.scope.resolve(Modules.ORDER) as OrderService
    const order = await orderService.retrieveOrder(orderId, { relations: ["items", "payment_collections"] })
    if (order.sales_channel_id !== salesChannelId) throw new RequestFailure(403, "order_scope_mismatch")
    return order
}

/** Return quantities reserved by pending or acknowledged POS refund operations. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const runtime = authorizedRuntime(req)
    if ("errorCode" in runtime) return res.status(runtime.status).json({ error_code: runtime.errorCode })
    const orderId = typeof req.query.order_id === "string" ? req.query.order_id.trim() : ""
    if (!orderId) return res.status(400).json({ error_code: "order_id_required" })

    try {
        await requireScopedOrder(req, orderId, runtime.salesChannelId)
        const ledger = req.scope.resolve(POS_MODULE) as PosModuleService
        const rows = await ledger.listPosRefundOperations({ tenant_id: runtime.tenantId, order_id: orderId }) as Array<{
            status: string
            items: unknown
        }>
        const refundedQuantities: Record<string, number> = {}
        for (const row of rows) {
            if (row.status !== "pending" && row.status !== "acknowledged") continue
            const items = (typeof row.items === "string" ? JSON.parse(row.items) : row.items) as Array<{
                item_id: string
                quantity: number
            }>
            if (!Array.isArray(items)) throw new Error("invalid_refund_ledger_items")
            for (const item of items) {
                if (!item.item_id || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
                    throw new Error("invalid_refund_ledger_item")
                }
                refundedQuantities[item.item_id] = (refundedQuantities[item.item_id] ?? 0) + item.quantity
            }
        }
        return res.status(200).json({ refunded_quantities: refundedQuantities })
    } catch (error) {
        if (error instanceof RequestFailure) return res.status(error.status).json({ error_code: error.code })
        return res.status(503).json({ error_code: "pos_refund_runtime_unavailable" })
    }
}

/** Medusa remains economic authority; the POS ledger adds replay and line quantities. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const runtime = authorizedRuntime(req)
    if ("errorCode" in runtime) return res.status(runtime.status).json({ error_code: runtime.errorCode })

    const parsed = requestSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error_code: "invalid_refund_request" })

    try {
        const paymentService = req.scope.resolve(Modules.PAYMENT) as unknown as PaymentService
        const ledger = req.scope.resolve(POS_MODULE) as PosModuleService
        const order = await requireScopedOrder(req, parsed.data.order_id, runtime.salesChannelId)

        const orderItems = new Map((order.items ?? []).map((item) => [item.id, item]))
        const seen = new Set<string>()
        let amountMinor = 0
        const items = parsed.data.items.map((selected) => {
            if (seen.has(selected.item_id)) throw new RequestFailure(400, "duplicate_refund_item")
            seen.add(selected.item_id)
            const authoritative = orderItems.get(selected.item_id)
            if (!authoritative) throw new RequestFailure(422, "refund_item_not_in_order")
            const orderedQuantity = safeInteger(authoritative.quantity)
            if (selected.quantity > orderedQuantity) throw new RequestFailure(422, "refund_quantity_exceeded")
            const unitPrice = safeInteger(authoritative.unit_price)
            const lineAmount = unitPrice * selected.quantity
            if (!Number.isSafeInteger(lineAmount)) throw new RequestFailure(422, "invalid_order_amount")
            amountMinor += lineAmount
            return { item_id: selected.item_id, quantity: selected.quantity, ordered_quantity: orderedQuantity }
        }).sort((left, right) => left.item_id.localeCompare(right.item_id))
        if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
            throw new RequestFailure(422, "invalid_refund_amount")
        }

        const canonicalPayload = JSON.stringify({
            schema: REFUND_SCHEMA,
            tenant_id: runtime.tenantId,
            order_id: parsed.data.order_id,
            operation_id: parsed.data.operation_id,
            idempotency_key: parsed.data.idempotency_key,
            items,
            amount_minor: amountMinor,
            reason: parsed.data.reason,
            reason_note: parsed.data.reason_note ?? null,
        })
        const operation: POSRefundOperationInput = {
            tenant_id: runtime.tenantId,
            order_id: parsed.data.order_id,
            operation_id: parsed.data.operation_id,
            idempotency_key: parsed.data.idempotency_key,
            payload_sha256: createHash("sha256").update(canonicalPayload).digest("hex"),
            amount_minor: amountMinor,
            items,
        }
        const collections = order.payment_collections ?? []
        const listScopedPayments = async () => {
            const scoped = await Promise.all(collections.map((collection) => paymentService.listPayments(
                { payment_collection_id: collection.id },
                { relations: ["refunds"] },
            )))
            return scoped.flat()
        }
        const metadata = {
            schema: REFUND_SCHEMA,
            tenant_id: runtime.tenantId,
            order_id: operation.order_id,
            operation_id: operation.operation_id,
            idempotency_key: operation.idempotency_key,
            payload_sha256: operation.payload_sha256,
        }
        const result = await executePOSRefundOperation(operation, {
            ledger: {
                reserve: (input) => ledger.reservePOSRefundOperation(input),
                acknowledge: (input, refundId) => ledger.acknowledgePOSRefundOperation(input, refundId),
                fail: (input, code) => ledger.failPOSRefundOperation(input, code),
            },
            payment: {
                findCommittedRefund: async (input) => {
                    for (const payment of await listScopedPayments()) {
                        const refund = exactRefund(payment.refunds, input)
                        if (refund) return { refund_id: refund.id }
                    }
                    return null
                },
                refund: async (input) => {
                    const payments = await listScopedPayments()
                    const selected = payments.find((payment) => {
                        if (!payment.captured_at) return false
                        const refunded = (payment.refunds ?? []).reduce((sum, refund) => sum + safeInteger(refund.amount ?? 0), 0)
                        return safeInteger(payment.amount) - refunded >= input.amount_minor
                    })
                    if (!selected) throw new POSRefundExecutionError("captured_amount_unavailable", true)
                    let updated: PaymentRecord
                    try {
                        updated = await paymentService.refundPayment({
                            payment_id: selected.id,
                            amount: input.amount_minor,
                            created_by: (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id,
                            note: parsed.data.reason_note,
                            metadata,
                        })
                    } catch {
                        // Provider errors are ambiguous: Medusa may have committed before
                        // the response was lost. Preserve pending for metadata reconciliation.
                        throw new POSRefundExecutionError("provider_outcome_unknown", false)
                    }
                    const refund = exactRefund(updated.refunds, input)
                    if (!refund) throw new POSRefundExecutionError("refund_acknowledgement_missing", false)
                    return { refund_id: refund.id }
                },
            },
        })
        return res.status(operationStatus(result.outcome, result.status)).json({ operation: result })
    } catch (error) {
        if (error instanceof RequestFailure) return res.status(error.status).json({ error_code: error.code })
        if (error instanceof POSRefundExecutionError) return res.status(503).json({ error_code: error.code })
        return res.status(503).json({ error_code: "pos_refund_runtime_unavailable" })
    }
}
