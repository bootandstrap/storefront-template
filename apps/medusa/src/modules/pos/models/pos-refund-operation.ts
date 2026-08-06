import { model } from "@medusajs/framework/utils"

/** Replay and line-quantity ledger for POS-initiated Medusa refunds. */
const PosRefundOperation = model.define("pos_refund_operation", {
    id: model.id().primaryKey(),
    tenant_id: model.text(),
    order_id: model.text(),
    operation_id: model.text(),
    idempotency_key: model.text(),
    payload_sha256: model.text(),
    amount_minor: model.number(),
    items: model.json(),
    status: model.enum(["pending", "acknowledged", "failed"]).default("pending"),
    refund_id: model.text().nullable(),
    failure_code: model.text().nullable(),
})
    .indexes([
        { on: ["tenant_id", "idempotency_key"], unique: true, where: "deleted_at IS NULL" },
        { on: ["tenant_id", "operation_id"], unique: true, where: "deleted_at IS NULL" },
        { on: ["tenant_id", "order_id", "status"], where: "deleted_at IS NULL" },
        { on: ["refund_id"], where: "deleted_at IS NULL" },
    ])

export default PosRefundOperation
