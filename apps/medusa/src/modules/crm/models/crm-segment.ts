import { model } from "@medusajs/framework/utils"

/**
 * CrmSegment — Customer segmentation rules.
 *
 * Defines groups of contacts based on criteria
 * (e.g., "VIP customers with >5 orders", "Leads from social").
 * Segments are evaluated dynamically against contacts.
 */
const CrmSegment = model.define("crm_segment", {
    id: model.id().primaryKey(),
    /** Segment display name */
    name: model.text(),
    /** Description of what this segment contains */
    description: model.text().nullable(),
    /** Color for UI display (hex) */
    color: model.text().default("#6366f1"),
    /** Filter rules as JSON (e.g., { "stage": "vip", "order_count_gte": 5 }) */
    rules: model.json(),
    /** Whether this is a system-managed segment */
    is_system: model.boolean().default(false),
    /** Cached contact count (updated periodically) */
    contact_count: model.number().default(0),
    /** Last time the segment was evaluated */
    last_evaluated_at: model.dateTime().nullable(),
})
    .indexes([
        { on: ["name"], where: "deleted_at IS NULL" },
    ])

export default CrmSegment
