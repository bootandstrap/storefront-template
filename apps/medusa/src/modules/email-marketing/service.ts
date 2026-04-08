import { MedusaService } from "@medusajs/framework/utils"
import EmailCampaign from "./models/email-campaign"
import EmailTemplate from "./models/email-template"
import EmailSend from "./models/email-send"

/**
 * EmailMarketingModuleService
 *
 * Planned custom methods:
 *   - createCampaign(name, subject, templateId, segmentId)
 *   - scheduleSend(campaignId, scheduledAt)
 *   - trackOpen(sendId) / trackClick(sendId)
 *   - getCampaignStats(campaignId)
 *   - renderTemplate(templateId, variables)
 */
class EmailMarketingModuleService extends MedusaService({
    EmailCampaign,
    EmailTemplate,
    EmailSend,
}) { }

export default EmailMarketingModuleService
