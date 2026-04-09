import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_MARKETING_MODULE } from "../../../../modules/email-marketing"
import type EmailMarketingModuleService from "../../../../modules/email-marketing/service"

/**
 * GET /admin/email-marketing/campaigns
 * List email campaigns with optional status filter
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { status } = req.query as Record<string, string>
    const service = req.scope.resolve(EMAIL_MARKETING_MODULE) as EmailMarketingModuleService

    const filters: Record<string, unknown> = {}
    if (status) filters.status = status

    const campaigns = await service.listEmailCampaigns(filters, {
        order: { created_at: "DESC" },
        take: 100,
    })

    res.json({ campaigns })
}

/**
 * POST /admin/email-marketing/campaigns
 * Create a new email campaign
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        name: string
        subject: string
        template_id?: string
        segment_id?: string
        scheduled_at?: string
    }

    if (!body.name || !body.subject) {
        return res.status(400).json({ message: "name and subject are required" })
    }

    const service = req.scope.resolve(EMAIL_MARKETING_MODULE) as EmailMarketingModuleService

    const campaign = await service.createEmailCampaigns({
        ...body,
        status: "draft",
        scheduled_at: body.scheduled_at ? new Date(body.scheduled_at) : undefined,
    })

    res.status(201).json({ campaign })
}
