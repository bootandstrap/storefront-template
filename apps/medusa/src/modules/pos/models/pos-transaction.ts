import { model } from "@medusajs/framework/utils"

/**
 * PosTransaction — Individual POS sale records.
 *
 * Maps to a Medusa Order but adds POS-specific metadata
 * (payment method type, terminal, operator, receipt number).
 * The order_id links back to the Medusa order via Link Module.
 */
const PosTransaction = model.define("pos_transaction", {
    id: model.id().primaryKey(),
    /** Linked Medusa order ID */
    order_id: model.text().nullable(),
    /** POS session this transaction belongs to */
    session_id: model.text(),
    /** Payment method used at the terminal */
    payment_method: model.enum(["cash", "card", "mixed", "voucher", "other"]).default("cash"),
    /** Total amount in cents */
    amount: model.number(),
    /** Currency code */
    currency_code: model.text().default("CHF"),
    /** Cash tendered (for cash payments — enables change calculation) */
    cash_tendered: model.number().nullable(),
    /** Sequential receipt number for this terminal */
    receipt_number: model.text().nullable(),
    /** Customer name or identifier (optional) */
    customer_name: model.text().nullable(),
    /** Transaction status */
    status: model.enum(["completed", "refunded", "voided"]).default("completed"),
    /** Line items snapshot (denormalized for receipt printing) */
    line_items_snapshot: model.json().nullable(),
    /** Discount applied (percentage, 0-100) */
    discount_percent: model.number().nullable(),
    /** Notes */
    notes: model.text().nullable(),
})
    .indexes([
        { on: ["session_id"], where: "deleted_at IS NULL" },
        { on: ["order_id"], where: "deleted_at IS NULL" },
        { on: ["status"], where: "deleted_at IS NULL" },
    ])

export default PosTransaction
