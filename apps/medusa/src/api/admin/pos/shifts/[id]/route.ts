import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../../modules/pos"
import type PosModuleService from "../../../../../modules/pos/service"

/**
 * GET /admin/pos/shifts/:id
 * Retrieve a single shift by ID
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params
    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    try {
        const shift = await service.retrievePosShift(id)
        res.json({ shift })
    } catch {
        res.status(404).json({ message: `Shift ${id} not found` })
    }
}

/**
 * POST /admin/pos/shifts/:id
 * Update a shift (close, reconcile, update totals)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params
    const body = req.body as {
        status?: "open" | "closed"
        actual_cash?: number
        discrepancy?: number
        transaction_count?: number
        total_revenue?: number
        expected_cash?: number
        closed_at?: string
        close_notes?: string
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    try {
        // Build update payload — only include provided fields
        const update: Record<string, unknown> = {}
        if (body.status !== undefined) update.status = body.status
        if (body.actual_cash !== undefined) update.actual_cash = body.actual_cash
        if (body.discrepancy !== undefined) update.discrepancy = body.discrepancy
        if (body.transaction_count !== undefined) update.transaction_count = body.transaction_count
        if (body.total_revenue !== undefined) update.total_revenue = body.total_revenue
        if (body.expected_cash !== undefined) update.expected_cash = body.expected_cash
        if (body.close_notes !== undefined) update.close_notes = body.close_notes

        // Auto-set closed_at when closing
        if (body.status === "closed") {
            update.closed_at = body.closed_at ?? new Date().toISOString()
            // Calculate discrepancy if actual_cash is provided and not already set
            if (body.actual_cash !== undefined && body.discrepancy === undefined) {
                const current = await service.retrievePosShift(id)
                update.discrepancy = body.actual_cash - (current.expected_cash ?? 0)
            }
        }

        const shift = await service.updatePosShifts(id, update as any)
        res.json({ shift })
    } catch {
        res.status(404).json({ message: `Shift ${id} not found` })
    }
}
