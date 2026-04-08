import { model } from "@medusajs/framework/utils"

/**
 * PosSession — Tracks open POS terminal sessions.
 *
 * A session represents a period where a cashier is actively using the POS.
 * Sessions are opened on login and closed on logout or shift end.
 * Each tenant runs their own Medusa — no tenant_id needed.
 */
const PosSession = model.define("pos_session", {
    id: model.id().primaryKey(),
    /** Operator name or email */
    operator: model.text(),
    /** Terminal identifier (e.g. "counter-1", "tablet-A") */
    terminal_id: model.text().nullable(),
    /** Session status */
    status: model.enum(["open", "closed", "suspended"]).default("open"),
    /** Opening cash balance in cents */
    opening_balance: model.number().default(0),
    /** Closing cash balance in cents (set on close) */
    closing_balance: model.number().nullable(),
    /** ISO timestamp when session was closed */
    closed_at: model.dateTime().nullable(),
    /** Notes left by operator on close */
    close_notes: model.text().nullable(),
})
    .indexes([
        { on: ["status"], where: "deleted_at IS NULL" },
        { on: ["operator"], where: "deleted_at IS NULL" },
    ])

export default PosSession
