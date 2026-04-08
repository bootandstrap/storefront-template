import { model } from "@medusajs/framework/utils"

/**
 * CrmContact — Extended customer profiles for CRM.
 *
 * Enriches the Medusa Customer entity with CRM-specific fields.
 * Connected to Customer via Link Module (customer-crm-contact.ts).
 */
const CrmContact = model.define("crm_contact", {
    id: model.id().primaryKey(),
    /** Email (primary identifier, synced from Medusa Customer) */
    email: model.text(),
    /** Full name */
    full_name: model.text().nullable(),
    /** Phone number */
    phone: model.text().nullable(),
    /** Company/Organization */
    company: model.text().nullable(),
    /** Lead source (how they found us) */
    source: model.enum(["organic", "referral", "social", "ads", "direct", "other"]).default("direct"),
    /** Contact stage in the pipeline */
    stage: model.enum(["lead", "prospect", "customer", "churned", "vip"]).default("lead"),
    /** Lifetime value in cents */
    lifetime_value: model.number().default(0),
    /** Total orders count */
    order_count: model.number().default(0),
    /** Last interaction date */
    last_interaction_at: model.dateTime().nullable(),
    /** Custom tags (JSON array of strings) */
    tags: model.json().nullable(),
    /** Free-form notes */
    notes: model.text().nullable(),
})
    .indexes([
        { on: ["email"], where: "deleted_at IS NULL" },
        { on: ["stage"], where: "deleted_at IS NULL" },
        { on: ["source"], where: "deleted_at IS NULL" },
    ])

export default CrmContact
