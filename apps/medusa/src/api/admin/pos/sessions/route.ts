import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../modules/pos"
import type PosModuleService from "../../../../modules/pos/service"

/**
 * GET /admin/pos/sessions
 * List POS sessions with optional status filter
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { status, terminal_id } = req.query as Record<string, string>
    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const filters: Record<string, unknown> = {}
    if (status) filters.status = status
    if (terminal_id) filters.terminal_id = terminal_id

    const sessions = await service.listPosSessions(filters, {
        order: { created_at: "DESC" },
        take: 100,
    })

    res.json({ sessions })
}

/**
 * POST /admin/pos/sessions
 * Create a new POS session (open terminal)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { terminal_id, operator, opening_balance } = req.body as {
        terminal_id: string
        operator: string
        opening_balance?: number
    }

    if (!operator) {
        return res.status(400).json({ message: "operator is required" })
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const session = await service.createPosSessions({
        terminal_id: terminal_id ?? null,
        operator,
        status: "open",
        opening_balance: opening_balance ?? 0,
    } as any)

    res.status(201).json({ session })
}
