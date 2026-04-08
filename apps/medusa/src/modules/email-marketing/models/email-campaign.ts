import { model } from "@medusajs/framework/utils"

const EmailCampaign = model.define("email_campaign", {
    id: model.id().primaryKey(),
    name: model.text(),
    subject: model.text(),
    /** Template ID to use for rendering */
    template_id: model.text().nullable(),
    /** Target segment ID (CRM segment) */
    segment_id: model.text().nullable(),
    status: model.enum(["draft", "scheduled", "sending", "sent", "paused", "failed"]).default("draft"),
    /** Scheduled send date */
    scheduled_at: model.dateTime().nullable(),
    /** Actual send date */
    sent_at: model.dateTime().nullable(),
    /** Recipient count */
    recipient_count: model.number().default(0),
    /** Open tracking */
    open_count: model.number().default(0),
    /** Click tracking */
    click_count: model.number().default(0),
    /** Bounce count */
    bounce_count: model.number().default(0),
    /** Campaign type */
    type: model.enum(["campaign", "abandoned_cart", "order_follow_up", "review_request", "newsletter"]).default("campaign"),
})
    .indexes([
        { on: ["status"], where: "deleted_at IS NULL" },
        { on: ["type"], where: "deleted_at IS NULL" },
    ])

export default EmailCampaign
