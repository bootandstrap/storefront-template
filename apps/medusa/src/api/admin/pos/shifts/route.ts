import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../modules/pos"
import type PosModuleService from "../../../../modules/pos/service"

/**
 * GET /admin/pos/shifts
 * List POS shifts with optional filters (status, operator, terminal)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { status, operator, terminal_id } = req.query as Record<string, string>
    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const filters: Record<string, unknown> = {}
    if (status) filters.status = status
    if (operator) filters.operator = operator
    if (terminal_id) filters.terminal_id = terminal_id

    const shifts = await service.listPosShifts(filters, {
        order: { created_at: "DESC" },
        take: 100,
    })

    res.json({ shifts })
}

/**
 * POST /admin/pos/shifts
 * Open a new POS shift
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { operator, terminal_id, expected_cash } = req.body as {
        operator: string
        terminal_id?: string
        expected_cash?: number
    }

    if (!operator) {
        return res.status(400).json({ message: "operator is required" })
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    // Ensure no other open shift for this operator
    const existing = await service.listPosShifts(
        { operator, status: "open" },
        { take: 1 }
    )
    if (existing.length > 0) {
        return res.status(409).json({
            message: "Operator already has an open shift",
            existing_shift_id: existing[0].id,
        })
    }

    const shift = await service.createPosShifts({
        operator,
        terminal_id: terminal_id ?? null,
        status: "open",
        expected_cash: expected_cash ?? 0,
        transaction_count: 0,
        total_revenue: 0,
    } as any)

    res.status(201).json({ shift })
}
