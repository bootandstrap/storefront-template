import { model } from "@medusajs/framework/utils"

/** Durable server-authoritative reservation for one offline POS operation. */
const PosSyncOperation = model.define("pos_sync_operation", {
    id: model.id().primaryKey(),
    tenant_id: model.text(),
    operation_id: model.text(),
    idempotency_key: model.text(),
    client_id: model.text(),
    client_sequence: model.number(),
    server_sequence: model.number(),
    amount_minor: model.number(),
    payload_sha256: model.text(),
    status: model.enum(["reserved", "committed"]).default("reserved"),
    order_id: model.text().nullable(),
    draft_order_id: model.text().nullable(),
    display_id: model.number().nullable(),
})
    .indexes([
        {
            on: ["tenant_id", "idempotency_key"],
            unique: true,
            where: "deleted_at IS NULL",
        },
        {
            on: ["tenant_id", "operation_id"],
            unique: true,
            where: "deleted_at IS NULL",
        },
        { on: ["tenant_id", "server_sequence"], where: "deleted_at IS NULL" },
        { on: ["status"], where: "deleted_at IS NULL" },
    ])

export default PosSyncOperation
