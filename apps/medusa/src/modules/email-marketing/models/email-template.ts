import { model } from "@medusajs/framework/utils"

const EmailTemplate = model.define("email_template", {
    id: model.id().primaryKey(),
    name: model.text(),
    /** Template type */
    type: model.enum(["marketing", "transactional", "system"]).default("marketing"),
    /** Email subject template (supports {{variables}}) */
    subject_template: model.text(),
    /** HTML body template */
    html_body: model.text(),
    /** Plain text fallback */
    text_body: model.text().nullable(),
    /** Template variables schema (JSON — what data the template expects) */
    variables_schema: model.json().nullable(),
    /** Whether this is a system template (non-deletable) */
    is_system: model.boolean().default(false),
    /** Preview text */
    preview_text: model.text().nullable(),
})
    .indexes([
        { on: ["type"], where: "deleted_at IS NULL" },
    ])

export default EmailTemplate
