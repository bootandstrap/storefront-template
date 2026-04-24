import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUTOMATION_MODULE } from "../../../../modules/automation"
import type AutomationModuleService from "../../../../modules/automation/service"

/**
 * GET /admin/automation/rules
 * List automation rules with optional filters
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { status, trigger_event } = req.query as Record<string, string>
    const service = req.scope.resolve(AUTOMATION_MODULE) as AutomationModuleService

    const filters: Record<string, unknown> = {}
    if (status) filters.is_active = status === "active"
    if (trigger_event) filters.trigger_event = trigger_event

    const rules = await service.listAutomationRules(filters, {
        order: { created_at: "DESC" },
        take: 100,
    })

    res.json({ rules })
}

/**
 * POST /admin/automation/rules
 * Create a new automation rule
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        name: string
        trigger_event: string
        conditions?: Record<string, unknown>
        actions: Record<string, unknown>[]
    }

    if (!body.name || !body.trigger_event || !body.actions?.length) {
        return res.status(400).json({ message: "name, trigger_event, and actions are required" })
    }

    const service = req.scope.resolve(AUTOMATION_MODULE) as AutomationModuleService

    const rule = await service.createAutomationRules({
        ...body,
        is_active: true,
    } as any)

    res.status(201).json({ rule })
}
