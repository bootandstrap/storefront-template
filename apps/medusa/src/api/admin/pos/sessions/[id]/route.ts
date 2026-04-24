import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../../modules/pos"
import type PosModuleService from "../../../../../modules/pos/service"

/**
 * GET /admin/pos/sessions/:id
 * Retrieve a single session by ID
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params
    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    try {
        const session = await service.retrievePosSession(id)
        res.json({ session })
    } catch {
        res.status(404).json({ message: `Session ${id} not found` })
    }
}

/**
 * POST /admin/pos/sessions/:id
 * Update a session (close, suspend, update balance)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params
    const body = req.body as {
        status?: "open" | "closed" | "suspended"
        closing_balance?: number
        closed_at?: string
        close_notes?: string
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    try {
        const update: Record<string, unknown> = {}
        if (body.status !== undefined) update.status = body.status
        if (body.closing_balance !== undefined) update.closing_balance = body.closing_balance
        if (body.close_notes !== undefined) update.close_notes = body.close_notes

        // Auto-set closed_at when closing
        if (body.status === "closed") {
            update.closed_at = body.closed_at ?? new Date().toISOString()
        }

        const session = await service.updatePosSessions(id, update as any)
        res.json({ session })
    } catch {
        res.status(404).json({ message: `Session ${id} not found` })
    }
}
