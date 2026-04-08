import { model } from "@medusajs/framework/utils"

/**
 * AutomationRule — Event-driven automation rules.
 *
 * Defines triggers (Medusa events) + conditions (filters) + actions.
 * Example: "When order.placed && total > 100 → send VIP welcome email"
 */
const AutomationRule = model.define("automation_rule", {
    id: model.id().primaryKey(),
    name: model.text(),
    description: model.text().nullable(),
    /** Whether this rule is active */
    is_active: model.boolean().default(true),
    /** Medusa event that triggers this rule */
    trigger_event: model.text(),
    /** Condition filter as JSON (evaluated against event data) */
    conditions: model.json().nullable(),
    /** Action to execute */
    action_type: model.enum([
        "send_email",
        "send_webhook",
        "update_crm",
        "add_tag",
        "create_note",
        "notify_owner",
        "custom",
    ]).default("notify_owner"),
    /** Action configuration (email template, webhook URL, etc.) */
    action_config: model.json(),
    /** How many times this rule has fired */
    execution_count: model.number().default(0),
    /** Last time this rule fired */
    last_executed_at: model.dateTime().nullable(),
    /** Priority (lower = higher priority) */
    priority: model.number().default(100),
})
    .indexes([
        { on: ["trigger_event"], where: "deleted_at IS NULL" },
        { on: ["is_active"], where: "deleted_at IS NULL" },
    ])

export default AutomationRule
