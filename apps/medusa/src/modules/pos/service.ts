import type { Knex } from "@medusajs/framework/mikro-orm/knex"
import { ContainerRegistrationKeys, generateEntityId, MedusaService } from "@medusajs/framework/utils"
import PosSession from "./models/pos-session"
import PosSyncOperation from "./models/pos-sync-operation"
import PosTransaction from "./models/pos-transaction"
import PosShift from "./models/pos-shift"

export interface POSSyncReservationInput {
    tenant_id: string
    operation_id: string
    idempotency_key: string
    client_id: string
    client_sequence: number
    known_server_sequence: number
    amount_minor: number
    payload_sha256: string
}

export interface POSSyncCommitInput extends POSSyncReservationInput {
    order_id: string
    draft_order_id: string
    display_id: number
}

export interface POSSyncOperationResult {
    outcome: "reserved" | "committed" | "duplicate" | "conflict"
    operation_id: string
    idempotency_key: string
    server_sequence: number
    last_client_sequence: number
    order_id: string | null
    draft_order_id: string | null
    display_id: number | null
}

interface POSSyncOperationRow {
    id: string
    tenant_id: string
    operation_id: string
    idempotency_key: string
    client_id: string
    client_sequence: number
    server_sequence: number
    amount_minor: number
    payload_sha256: string
    status: "reserved" | "committed"
    order_id: string | null
    draft_order_id: string | null
    display_id: number | null
    updated_at: Date | string
}

type PgConnection = Knex
type PosModuleDependencies = Record<string, unknown> & {
    [ContainerRegistrationKeys.PG_CONNECTION]: PgConnection
}

const SYNC_SEQUENCE_LOCK = "bootandstrap:pos-sync-server-sequence"

function requireText(value: string, field: string): void {
    if (!value?.trim()) throw new Error(`${field} must be non-empty`)
}

function validateReservation(input: POSSyncReservationInput): void {
    requireText(input.tenant_id, "tenant_id")
    requireText(input.operation_id, "operation_id")
    requireText(input.idempotency_key, "idempotency_key")
    requireText(input.client_id, "client_id")
    if (!Number.isInteger(input.client_sequence) || input.client_sequence <= 0) {
        throw new Error("client_sequence must be a positive integer")
    }
    if (!Number.isInteger(input.known_server_sequence) || input.known_server_sequence < 0) {
        throw new Error("known_server_sequence must be a non-negative integer")
    }
    if (!Number.isInteger(input.amount_minor) || input.amount_minor < 0) {
        throw new Error("amount_minor must be a non-negative integer")
    }
    if (!/^[0-9a-f]{64}$/.test(input.payload_sha256)) {
        throw new Error("payload_sha256 must be a lowercase SHA-256 digest")
    }
}

function matchesReservation(row: POSSyncOperationRow, input: POSSyncReservationInput): boolean {
    return row.operation_id === input.operation_id
        && row.client_id === input.client_id
        && row.client_sequence === input.client_sequence
        && row.amount_minor === input.amount_minor
        && row.payload_sha256 === input.payload_sha256
}

function operationResult(
    row: POSSyncOperationRow,
    outcome: POSSyncOperationResult["outcome"],
): POSSyncOperationResult {
    return {
        outcome,
        operation_id: row.operation_id,
        idempotency_key: row.idempotency_key,
        server_sequence: row.server_sequence,
        last_client_sequence: row.client_sequence,
        order_id: row.order_id,
        draft_order_id: row.draft_order_id,
        display_id: row.display_id,
    }
}

/**
 * PosModuleService
 *
 * Extends MedusaService factory to auto-generate CRUD for:
 *   - PosSession: listPosSessions, createPosSessions, etc.
 *   - PosTransaction: listPosTransactions, createPosTransactions, etc.
 *   - PosShift: listPosShifts, createPosShifts, etc.
 *
 * Custom business methods will be added as the POS module matures:
 *   - openShift(operator, terminalId, openingBalance)
 *   - closeShift(shiftId, actualCash, notes)
 *   - processTransaction(sessionId, items, paymentMethod)
 *   - getShiftSummary(shiftId)
 */
class PosModuleService extends MedusaService({
    PosSession,
    PosSyncOperation,
    PosTransaction,
    PosShift,
}) {
    private readonly pgConnection_: PgConnection

    constructor(container: PosModuleDependencies) {
        super(container)
        this.pgConnection_ = container[ContainerRegistrationKeys.PG_CONNECTION]
    }

    async reservePOSSyncOperation(input: POSSyncReservationInput): Promise<POSSyncOperationResult> {
        validateReservation(input)
        return this.pgConnection_.transaction(async (transaction) => {
            await transaction.raw("select pg_advisory_xact_lock(hashtext(?))", [SYNC_SEQUENCE_LOCK])
            const existing = await transaction<POSSyncOperationRow>("pos_sync_operation")
                .where({ tenant_id: input.tenant_id, idempotency_key: input.idempotency_key })
                .whereNull("deleted_at")
                .first()
                .forUpdate()

            if (existing) {
                const outcome = matchesReservation(existing, input) && existing.status === "committed"
                    ? "duplicate"
                    : "conflict"
                return operationResult(existing, outcome)
            }

            const current = await transaction<POSSyncOperationRow>("pos_sync_operation")
                .whereNull("deleted_at")
                .max<{ server_sequence: string | number | null }>("server_sequence as server_sequence")
                .first()
            const currentServerSequence = Number(current?.server_sequence ?? 0)
            if (input.known_server_sequence > currentServerSequence) {
                return {
                    outcome: "conflict",
                    operation_id: input.operation_id,
                    idempotency_key: input.idempotency_key,
                    server_sequence: currentServerSequence,
                    last_client_sequence: input.client_sequence,
                    order_id: null,
                    draft_order_id: null,
                    display_id: null,
                }
            }

            const [created] = await transaction<POSSyncOperationRow>("pos_sync_operation")
                .insert({
                    id: generateEntityId(undefined, "possync"),
                    tenant_id: input.tenant_id,
                    operation_id: input.operation_id,
                    idempotency_key: input.idempotency_key,
                    client_id: input.client_id,
                    client_sequence: input.client_sequence,
                    server_sequence: currentServerSequence + 1,
                    amount_minor: input.amount_minor,
                    payload_sha256: input.payload_sha256,
                    status: "reserved",
                })
                .returning("*")
            return operationResult(created, "reserved")
        })
    }

    async commitPOSSyncOperation(input: POSSyncCommitInput): Promise<POSSyncOperationResult> {
        validateReservation(input)
        requireText(input.order_id, "order_id")
        requireText(input.draft_order_id, "draft_order_id")
        if (!Number.isInteger(input.display_id) || input.display_id <= 0) {
            throw new Error("display_id must be a positive integer")
        }

        return this.pgConnection_.transaction(async (transaction) => {
            const existing = await transaction<POSSyncOperationRow>("pos_sync_operation")
                .where({ tenant_id: input.tenant_id, idempotency_key: input.idempotency_key })
                .whereNull("deleted_at")
                .first()
                .forUpdate()
            if (!existing) throw new Error("POS sync reservation is missing")
            if (!matchesReservation(existing, input)) return operationResult(existing, "conflict")
            if (existing.status === "committed") {
                const outcome = existing.order_id === input.order_id ? "duplicate" : "conflict"
                return operationResult(existing, outcome)
            }

            const [committed] = await transaction<POSSyncOperationRow>("pos_sync_operation")
                .where({ id: existing.id, status: "reserved" })
                .update({
                    status: "committed",
                    order_id: input.order_id,
                    draft_order_id: input.draft_order_id,
                    display_id: input.display_id,
                    updated_at: transaction.fn.now(),
                })
                .returning("*")
            if (!committed) throw new Error("POS sync reservation could not be committed")
            return operationResult(committed, "committed")
        })
    }
}

export default PosModuleService
