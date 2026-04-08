import { model } from "@medusajs/framework/utils"

/**
 * AutomationExecution — Audit trail for rule executions.
 *
 * Every time a rule fires, an execution record is created.
 * Used for debugging, analytics, and rate limiting.
 */
const AutomationExecution = model.define("automation_execution", {
    id: model.id().primaryKey(),
    /** Rule that was executed */
    rule_id: model.text(),
    /** The event that triggered execution */
    trigger_event: model.text(),
    /** Event payload snapshot (for debugging) */
    event_payload: model.json().nullable(),
    /** Execution outcome */
    status: model.enum(["success", "failed", "skipped"]).default("success"),
    /** Error message if failed */
    error_message: model.text().nullable(),
    /** Action result data */
    result_data: model.json().nullable(),
    /** Execution duration in ms */
    duration_ms: model.number().nullable(),
})
    .indexes([
        { on: ["rule_id"], where: "deleted_at IS NULL" },
        { on: ["status"], where: "deleted_at IS NULL" },
    ])

export default AutomationExecution
