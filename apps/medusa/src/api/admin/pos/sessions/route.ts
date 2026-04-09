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
    const { terminal_id, cashier_name, opening_cash } = req.body as {
        terminal_id: string
        cashier_name: string
        opening_cash?: number
    }

    if (!terminal_id || !cashier_name) {
        return res.status(400).json({ message: "terminal_id and cashier_name are required" })
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const session = await service.createPosSessions({
        terminal_id,
        cashier_name,
        status: "open",
        opening_cash: opening_cash ?? 0,
        opened_at: new Date(),
    })

    res.status(201).json({ session })
}
