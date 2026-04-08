import { model } from "@medusajs/framework/utils"

/**
 * PosShift — Operator shifts with cash-drawer reconciliation.
 *
 * A shift aggregates all transactions for an operator within a time window.
 * Used for end-of-day reporting and cash drawer accountability.
 */
const PosShift = model.define("pos_shift", {
    id: model.id().primaryKey(),
    /** Operator name or email */
    operator: model.text(),
    /** Terminal identifier */
    terminal_id: model.text().nullable(),
    /** Shift status */
    status: model.enum(["open", "closed"]).default("open"),
    /** Expected cash based on transactions */
    expected_cash: model.number().default(0),
    /** Actual counted cash on close */
    actual_cash: model.number().nullable(),
    /** Discrepancy (actual - expected) */
    discrepancy: model.number().nullable(),
    /** Number of transactions in this shift */
    transaction_count: model.number().default(0),
    /** Total revenue across all transactions in this shift */
    total_revenue: model.number().default(0),
    /** ISO timestamp when shift was closed */
    closed_at: model.dateTime().nullable(),
    /** Operator notes on close */
    close_notes: model.text().nullable(),
})
    .indexes([
        { on: ["operator"], where: "deleted_at IS NULL" },
        { on: ["status"], where: "deleted_at IS NULL" },
    ])

export default PosShift
