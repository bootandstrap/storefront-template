import { model } from "@medusajs/framework/utils"

/**
 * CrmInteraction — Customer interaction log.
 *
 * Records every touchpoint: orders, support, emails, calls, notes.
 * Powers the CRM timeline view in the Owner Panel.
 */
const CrmInteraction = model.define("crm_interaction", {
    id: model.id().primaryKey(),
    /** Contact this interaction belongs to */
    contact_id: model.text(),
    /** Type of interaction */
    type: model.enum(["order", "email", "call", "note", "support", "visit", "other"]).default("note"),
    /** Brief summary */
    summary: model.text(),
    /** Detailed content (email body, call notes, etc.) */
    content: model.text().nullable(),
    /** Associated entity (e.g., order_id, email_campaign_id) */
    reference_id: model.text().nullable(),
    /** Reference type for polymorphic linking */
    reference_type: model.text().nullable(),
    /** Who initiated: system, operator, or the contact themselves */
    initiated_by: model.enum(["system", "operator", "contact"]).default("system"),
    /** Operator name (if initiated by operator) */
    operator_name: model.text().nullable(),
})
    .indexes([
        { on: ["contact_id"], where: "deleted_at IS NULL" },
        { on: ["type"], where: "deleted_at IS NULL" },
    ])

export default CrmInteraction
