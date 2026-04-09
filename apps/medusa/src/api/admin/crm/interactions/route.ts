import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CRM_MODULE } from "../../../../modules/crm"
import type CrmModuleService from "../../../../modules/crm/service"

/**
 * GET /admin/crm/interactions
 * List interactions, optionally filtered by contact_id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { contact_id, type } = req.query as Record<string, string>
    const service = req.scope.resolve(CRM_MODULE) as CrmModuleService

    const filters: Record<string, unknown> = {}
    if (contact_id) filters.contact_id = contact_id
    if (type) filters.type = type

    const interactions = await service.listCrmInteractions(filters, {
        order: { occurred_at: "DESC" },
        take: 200,
    })

    res.json({ interactions })
}

/**
 * POST /admin/crm/interactions
 * Log a new CRM interaction
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        contact_id: string
        type: string
        subject?: string
        notes?: string
        channel?: string
    }

    if (!body.contact_id || !body.type) {
        return res.status(400).json({ message: "contact_id and type are required" })
    }

    const service = req.scope.resolve(CRM_MODULE) as CrmModuleService

    const interaction = await service.createCrmInteractions({
        ...body,
        channel: body.channel ?? "manual",
        occurred_at: new Date(),
    })

    res.status(201).json({ interaction })
}
