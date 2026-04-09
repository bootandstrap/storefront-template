import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUTOMATION_MODULE } from "../../../../modules/automation"
import type AutomationModuleService from "../../../../modules/automation/service"

/**
 * GET /admin/automation/executions
 * List automation executions (audit trail)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { rule_id, status } = req.query as Record<string, string>
    const service = req.scope.resolve(AUTOMATION_MODULE) as AutomationModuleService

    const filters: Record<string, unknown> = {}
    if (rule_id) filters.rule_id = rule_id
    if (status) filters.status = status

    const executions = await service.listAutomationExecutions(filters, {
        order: { executed_at: "DESC" },
        take: 200,
    })

    res.json({ executions })
}
