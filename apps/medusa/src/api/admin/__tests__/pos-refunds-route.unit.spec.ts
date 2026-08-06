import { Modules } from "@medusajs/framework/utils"

import { GET as getPOSRefundQuantities, POST as postPOSRefund } from "../pos/refunds/route"
import { POS_MODULE } from "../../../modules/pos"

type MockResponse = {
    status: jest.Mock
    json: jest.Mock
    statusCode?: number
}

function response(): MockResponse {
    const result: MockResponse = { status: jest.fn(), json: jest.fn() }
    result.status.mockImplementation((code: number) => {
        result.statusCode = code
        return result
    })
    result.json.mockReturnValue(result)
    return result
}

function request(services: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    return {
        body: {
            order_id: "order-1",
            operation_id: "operation-1",
            idempotency_key: "idempotency-1",
            items: [{ item_id: "line-1", quantity: 1 }],
            reason: "damaged",
        },
        headers: {
            "x-tenant-id": "tenant-1",
            "x-medusa-sales-channel-id": "sales-channel-1",
        },
        auth_context: { actor_id: "user-1" },
        scope: {
            resolve: jest.fn((key: string) => services[key]),
        },
        ...overrides,
    } as any
}

function services() {
    const ledger = {
        reservePOSRefundOperation: jest.fn().mockResolvedValue({
            outcome: "reserved", status: "pending", refund_id: null,
        }),
        acknowledgePOSRefundOperation: jest.fn().mockResolvedValue({
            outcome: "acknowledged", status: "acknowledged", refund_id: "refund-1",
        }),
        failPOSRefundOperation: jest.fn().mockResolvedValue({
            outcome: "failed", status: "failed", refund_id: null,
        }),
        listPosRefundOperations: jest.fn().mockResolvedValue([]),
    }
    const order = {
        retrieveOrder: jest.fn().mockResolvedValue({
            id: "order-1",
            sales_channel_id: "sales-channel-1",
            items: [{ id: "line-1", title: "Widget", quantity: 2, unit_price: 1_000 }],
            payment_collections: [{ id: "collection-1" }],
        }),
    }
    const payment = {
        listPayments: jest.fn().mockResolvedValue([{
            id: "payment-1",
            amount: 2_000,
            captured_at: new Date("2026-08-06T00:00:00.000Z"),
            refunds: [],
        }]),
        refundPayment: jest.fn(async (input: { metadata: Record<string, unknown> }) => ({
            id: "payment-1",
            refunds: [{ id: "refund-1", metadata: input.metadata, amount: 1_000 }],
        })),
    }
    return {
        container: { [POS_MODULE]: ledger, [Modules.ORDER]: order, [Modules.PAYMENT]: payment },
        ledger,
        order,
        payment,
    }
}

describe("POST /admin/pos/refunds authority boundary", () => {
    const previousTenant = process.env.TENANT_ID

    beforeEach(() => {
        process.env.TENANT_ID = "tenant-1"
    })

    afterAll(() => {
        if (previousTenant === undefined) delete process.env.TENANT_ID
        else process.env.TENANT_ID = previousTenant
    })

    it("fails closed on a missing or mismatched instance tenant before resolving services", async () => {
        const runtime = services()
        delete process.env.TENANT_ID
        const missing = response()
        const missingRequest = request(runtime.container)
        await postPOSRefund(missingRequest, missing as any)
        expect(missing.statusCode).toBe(503)
        expect(missingRequest.scope.resolve).not.toHaveBeenCalled()

        process.env.TENANT_ID = "tenant-other"
        const mismatch = response()
        const mismatchRequest = request(runtime.container)
        await postPOSRefund(mismatchRequest, mismatch as any)
        expect(mismatch.statusCode).toBe(403)
        expect(mismatchRequest.scope.resolve).not.toHaveBeenCalled()
    })

    it("rejects an order outside the authorized sales channel before any refund", async () => {
        const runtime = services()
        runtime.order.retrieveOrder.mockResolvedValue({
            id: "order-1", sales_channel_id: "sales-channel-other", items: [], payment_collections: [],
        })
        const res = response()

        await postPOSRefund(request(runtime.container), res as any)

        expect(res.statusCode).toBe(403)
        expect(runtime.ledger.reservePOSRefundOperation).not.toHaveBeenCalled()
        expect(runtime.payment.refundPayment).not.toHaveBeenCalled()
    })

    it("recomputes amount and ordered quantities from Medusa and acknowledges its refund id", async () => {
        const runtime = services()
        const res = response()

        await postPOSRefund(request(runtime.container), res as any)

        const operation = runtime.ledger.reservePOSRefundOperation.mock.calls[0][0]
        expect(operation).toMatchObject({
            tenant_id: "tenant-1",
            order_id: "order-1",
            operation_id: "operation-1",
            idempotency_key: "idempotency-1",
            amount_minor: 1_000,
            items: [{ item_id: "line-1", quantity: 1, ordered_quantity: 2 }],
        })
        expect(operation.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(runtime.payment.refundPayment).toHaveBeenCalledWith(expect.objectContaining({
            payment_id: "payment-1",
            amount: 1_000,
            created_by: "user-1",
            metadata: expect.objectContaining({
                schema: "bootandstrap.pos-refund-operation/v1",
                operation_id: "operation-1",
                idempotency_key: "idempotency-1",
                payload_sha256: operation.payload_sha256,
            }),
        }))
        expect(runtime.ledger.acknowledgePOSRefundOperation).toHaveBeenCalledWith(operation, "refund-1")
        expect(res.statusCode).toBe(200)
        expect(res.json).toHaveBeenCalledWith({
            operation: expect.objectContaining({ status: "acknowledged", refund_id: "refund-1" }),
        })
    })

    it("reconciles a pending replay from Medusa metadata without a second mutation", async () => {
        const runtime = services()
        runtime.ledger.reservePOSRefundOperation.mockResolvedValue({
            outcome: "replay_pending", status: "pending", refund_id: null,
        })
        runtime.payment.listPayments.mockImplementation(async () => [{
            id: "payment-1",
            amount: 2_000,
            captured_at: new Date("2026-08-06T00:00:00.000Z"),
            refunds: [{
                id: "refund-committed",
                amount: 1_000,
                metadata: {
                    schema: "bootandstrap.pos-refund-operation/v1",
                    operation_id: "operation-1",
                    idempotency_key: "idempotency-1",
                    payload_sha256: runtime.ledger.reservePOSRefundOperation.mock.calls[0][0].payload_sha256,
                },
            }],
        }])
        runtime.ledger.acknowledgePOSRefundOperation.mockResolvedValue({
            outcome: "acknowledged", status: "acknowledged", refund_id: "refund-committed",
        })
        const res = response()

        await postPOSRefund(request(runtime.container), res as any)

        expect(runtime.payment.refundPayment).not.toHaveBeenCalled()
        expect(runtime.ledger.acknowledgePOSRefundOperation).toHaveBeenCalledWith(
            expect.objectContaining({ operation_id: "operation-1" }),
            "refund-committed",
        )
        expect(res.statusCode).toBe(200)
    })

    it("GET derives cumulative unavailable quantities from pending and acknowledged ledger rows", async () => {
        const runtime = services()
        runtime.ledger.listPosRefundOperations.mockResolvedValue([
            { status: "acknowledged", items: [{ item_id: "line-1", quantity: 1, ordered_quantity: 2 }] },
            { status: "pending", items: JSON.stringify([{ item_id: "line-1", quantity: 1, ordered_quantity: 2 }]) },
            { status: "failed", items: [{ item_id: "line-1", quantity: 9, ordered_quantity: 2 }] },
        ])
        const res = response()
        const req = request(runtime.container, { query: { order_id: "order-1" } })

        await getPOSRefundQuantities(req, res as any)

        expect(runtime.ledger.listPosRefundOperations).toHaveBeenCalledWith({
            tenant_id: "tenant-1",
            order_id: "order-1",
        })
        expect(res.json).toHaveBeenCalledWith({ refunded_quantities: { "line-1": 2 } })
    })
})
