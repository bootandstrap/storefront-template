import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CRM_MODULE } from "../../../../modules/crm"
import type CrmModuleService from "../../../../modules/crm/service"

/**
 * GET /admin/crm/contacts
 * List CRM contacts with optional filters
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { stage, source } = req.query as Record<string, string>
    const service = req.scope.resolve(CRM_MODULE) as CrmModuleService

    const filters: Record<string, unknown> = {}
    if (stage) filters.stage = stage
    if (source) filters.source = source

    const contacts = await service.listCrmContacts(filters, {
        order: { created_at: "DESC" },
        take: 200,
    })

    res.json({ contacts })
}

/**
 * POST /admin/crm/contacts
 * Create a new CRM contact
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        first_name: string
        last_name: string
        email?: string
        phone?: string
        company?: string
        source?: string
        stage?: string
        tags?: string[]
    }

    if (!body.first_name || !body.last_name) {
        return res.status(400).json({ message: "first_name and last_name are required" })
    }

    const service = req.scope.resolve(CRM_MODULE) as CrmModuleService

    const contact = await service.createCrmContacts({
        ...body,
        stage: body.stage ?? "lead",
        source: body.source ?? "manual",
    })

    res.status(201).json({ contact })
}
