import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

import { POS_MODULE } from "../../../../modules/pos"
import type PosModuleService from "../../../../modules/pos/service"

const reservationSchema = z.object({
    tenant_id: z.string().trim().min(1),
    operation_id: z.string().trim().min(1),
    idempotency_key: z.string().trim().min(1),
    client_id: z.string().trim().min(1),
    client_sequence: z.number().int().positive(),
    known_server_sequence: z.number().int().nonnegative(),
    amount_minor: z.number().int().nonnegative(),
    payload_sha256: z.string().regex(/^[0-9a-f]{64}$/),
})

const requestSchema = z.discriminatedUnion("phase", [
    z.object({
        phase: z.literal("reserve"),
        sync: reservationSchema,
    }),
    z.object({
        phase: z.literal("commit"),
        sync: reservationSchema.extend({
            order_id: z.string().trim().min(1),
            draft_order_id: z.string().trim().min(1),
            display_id: z.number().int().positive(),
        }),
    }),
])

/** Reserve or finalize an offline POS operation in the authoritative database. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const parsed = requestSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid POS sync operation" })
    }

    const service = req.scope.resolve(POS_MODULE) as PosModuleService
    if (parsed.data.phase === "reserve") {
        const operation = await service.reservePOSSyncOperation(parsed.data.sync)
        return res.status(operation.outcome === "reserved" ? 201 : 200).json({ operation })
    }

    const operation = await service.commitPOSSyncOperation(parsed.data.sync)
    return res.status(200).json({ operation })
}
