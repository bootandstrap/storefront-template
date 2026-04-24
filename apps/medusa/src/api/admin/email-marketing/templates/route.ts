import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_MARKETING_MODULE } from "../../../../modules/email-marketing"
import type EmailMarketingModuleService from "../../../../modules/email-marketing/service"

/**
 * GET /admin/email-marketing/templates
 * List email templates
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve(EMAIL_MARKETING_MODULE) as EmailMarketingModuleService

    const templates = await service.listEmailTemplates({}, {
        order: { updated_at: "DESC" },
        take: 100,
    })

    res.json({ templates })
}

/**
 * POST /admin/email-marketing/templates
 * Create a new email template
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        name: string
        subject_template: string
        html_body: string
        variables?: Record<string, unknown>
    }

    if (!body.name || !body.subject_template || !body.html_body) {
        return res.status(400).json({ message: "name, subject_template, and html_body are required" })
    }

    const service = req.scope.resolve(EMAIL_MARKETING_MODULE) as EmailMarketingModuleService

    const template = await service.createEmailTemplates(body as any)

    res.status(201).json({ template })
}
