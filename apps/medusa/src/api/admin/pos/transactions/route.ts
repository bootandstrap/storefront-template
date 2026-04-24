import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../modules/pos"
import type PosModuleService from "../../../../modules/pos/service"

/**
 * GET /admin/pos/transactions
 * List POS transactions with optional session filter
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { session_id, payment_method } = req.query as Record<string, string>
    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const filters: Record<string, unknown> = {}
    if (session_id) filters.session_id = session_id
    if (payment_method) filters.payment_method = payment_method

    const transactions = await service.listPosTransactions(filters, {
        order: { created_at: "DESC" },
        take: 200,
    })

    res.json({ transactions })
}

/**
 * POST /admin/pos/transactions
 * Record a new POS transaction
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
        session_id: string
        order_id?: string
        amount: number
        currency_code: string
        payment_method: string
        receipt_number?: string
    }

    if (!body.session_id || !body.amount || !body.currency_code || !body.payment_method) {
        return res.status(400).json({ message: "session_id, amount, currency_code, payment_method required" })
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService

    const transaction = await service.createPosTransactions({
        ...body,
        status: "completed",
    } as any)

    res.status(201).json({ transaction })
}
