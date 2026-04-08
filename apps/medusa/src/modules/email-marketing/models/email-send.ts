import { model } from "@medusajs/framework/utils"

const EmailSend = model.define("email_send", {
    id: model.id().primaryKey(),
    /** Campaign this send belongs to */
    campaign_id: model.text(),
    /** Recipient email */
    recipient_email: model.text(),
    /** Delivery status */
    status: model.enum(["queued", "sent", "delivered", "opened", "clicked", "bounced", "failed"]).default("queued"),
    /** When the email was actually sent */
    sent_at: model.dateTime().nullable(),
    /** When the email was opened (tracked via pixel) */
    opened_at: model.dateTime().nullable(),
    /** When a link was clicked */
    clicked_at: model.dateTime().nullable(),
    /** Error message if failed */
    error_message: model.text().nullable(),
})
    .indexes([
        { on: ["campaign_id"], where: "deleted_at IS NULL" },
        { on: ["status"], where: "deleted_at IS NULL" },
        { on: ["recipient_email"], where: "deleted_at IS NULL" },
    ])

export default EmailSend
