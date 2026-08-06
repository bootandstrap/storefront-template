import type { Knex } from "@medusajs/framework/mikro-orm/knex"
import { ContainerRegistrationKeys, generateEntityId, MedusaService } from "@medusajs/framework/utils"
import PosSession from "./models/pos-session"
import PosRefundOperation from "./models/pos-refund-operation"
import PosSyncOperation from "./models/pos-sync-operation"
import PosTransaction from "./models/pos-transaction"
import PosShift from "./models/pos-shift"
import type { POSRefundItemReservation, POSRefundOperationInput, POSRefundOperationResult } from "./refund-coordinator"

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

interface POSRefundOperationRow {
    id: string
    tenant_id: string
    order_id: string
    operation_id: string
    idempotency_key: string
    payload_sha256: string
    amount_minor: number
    items: POSRefundItemReservation[] | string
    status: "pending" | "acknowledged" | "failed"
    refund_id: string | null
    failure_code: string | null
    updated_at: Date | string
}

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

function normalizedRefundItems(items: POSRefundItemReservation[]): POSRefundItemReservation[] {
    if (!Array.isArray(items) || items.length === 0) throw new Error("refund items must be non-empty")
    const seen = new Set<string>()
    return items.map((item) => {
        requireText(item.item_id, "item_id")
        if (seen.has(item.item_id)) throw new Error("refund item_id must be unique")
        seen.add(item.item_id)
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("refund quantity must be positive")
        if (!Number.isInteger(item.ordered_quantity) || item.ordered_quantity <= 0 || item.quantity > item.ordered_quantity) {
            throw new Error("refund ordered_quantity is invalid")
        }
        return { ...item }
    }).sort((left, right) => left.item_id.localeCompare(right.item_id))
}

function validateRefundReservation(input: POSRefundOperationInput): POSRefundItemReservation[] {
    requireText(input.tenant_id, "tenant_id")
    requireText(input.order_id, "order_id")
    requireText(input.operation_id, "operation_id")
    requireText(input.idempotency_key, "idempotency_key")
    if (!/^[0-9a-f]{64}$/.test(input.payload_sha256)) throw new Error("payload_sha256 must be a lowercase SHA-256 digest")
    if (!Number.isSafeInteger(input.amount_minor) || input.amount_minor <= 0) throw new Error("amount_minor must be positive integer minor units")
    return normalizedRefundItems(input.items)
}

function rowItems(row: POSRefundOperationRow): POSRefundItemReservation[] {
    return typeof row.items === "string" ? JSON.parse(row.items) as POSRefundItemReservation[] : row.items
}

function matchesRefundReservation(row: POSRefundOperationRow, input: POSRefundOperationInput, items: POSRefundItemReservation[]): boolean {
    return row.order_id === input.order_id
        && row.operation_id === input.operation_id
        && row.amount_minor === input.amount_minor
        && row.payload_sha256 === input.payload_sha256
        && JSON.stringify(rowItems(row)) === JSON.stringify(items)
}

function refundOperationResult(row: POSRefundOperationRow, outcome: string): POSRefundOperationResult {
    return {
        outcome,
        status: row.status,
        refund_id: row.refund_id,
        failure_code: row.failure_code,
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
    PosRefundOperation,
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

    async reservePOSRefundOperation(
        input: POSRefundOperationInput,
        fault: { beforeCommit?: () => void } = {},
    ): Promise<POSRefundOperationResult> {
        const items = validateRefundReservation(input)
        const lockKey = `bootandstrap:pos-refund:${input.tenant_id}:${input.order_id}`
        return this.pgConnection_.transaction(async (transaction) => {
            await transaction.raw("select pg_advisory_xact_lock(hashtext(?))", [lockKey])
            const byKey = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ tenant_id: input.tenant_id, idempotency_key: input.idempotency_key })
                .whereNull("deleted_at").first().forUpdate()
            const existing = byKey ?? await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ tenant_id: input.tenant_id, operation_id: input.operation_id })
                .whereNull("deleted_at").first().forUpdate()
            if (existing) {
                if (!matchesRefundReservation(existing, input, items)) return refundOperationResult(existing, "conflict")
                return refundOperationResult(existing, `replay_${existing.status}`)
            }

            const active = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ tenant_id: input.tenant_id, order_id: input.order_id })
                .whereIn("status", ["pending", "acknowledged"])
                .whereNull("deleted_at")
            const used = new Map<string, number>()
            for (const row of active) {
                for (const item of rowItems(row)) used.set(item.item_id, (used.get(item.item_id) ?? 0) + item.quantity)
            }
            if (items.some((item) => (used.get(item.item_id) ?? 0) + item.quantity > item.ordered_quantity)) {
                return { outcome: "over_refund", status: "failed", refund_id: null, failure_code: "quantity_exceeded" }
            }

            const [created] = await transaction<POSRefundOperationRow>("pos_refund_operation").insert({
                id: generateEntityId(undefined, "posrefundop"),
                tenant_id: input.tenant_id,
                order_id: input.order_id,
                operation_id: input.operation_id,
                idempotency_key: input.idempotency_key,
                payload_sha256: input.payload_sha256,
                amount_minor: input.amount_minor,
                items: JSON.stringify(items),
                status: "pending",
            }).returning("*")
            fault.beforeCommit?.()
            return refundOperationResult(created, "reserved")
        })
    }

    async acknowledgePOSRefundOperation(input: POSRefundOperationInput, refundId: string): Promise<POSRefundOperationResult> {
        const items = validateRefundReservation(input)
        requireText(refundId, "refund_id")
        return this.pgConnection_.transaction(async (transaction) => {
            const existing = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ tenant_id: input.tenant_id, idempotency_key: input.idempotency_key })
                .whereNull("deleted_at").first().forUpdate()
            if (!existing) throw new Error("POS refund reservation is missing")
            if (!matchesRefundReservation(existing, input, items)) return refundOperationResult(existing, "conflict")
            if (existing.status === "acknowledged") {
                return refundOperationResult(existing, existing.refund_id === refundId ? "replay_acknowledged" : "conflict")
            }
            if (existing.status === "failed") return refundOperationResult(existing, "conflict")
            const [acknowledged] = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ id: existing.id, status: "pending" })
                .update({ status: "acknowledged", refund_id: refundId, failure_code: null, updated_at: transaction.fn.now() })
                .returning("*")
            if (!acknowledged) throw new Error("POS refund reservation could not be acknowledged")
            return refundOperationResult(acknowledged, "acknowledged")
        })
    }

    async failPOSRefundOperation(input: POSRefundOperationInput, failureCode: string): Promise<POSRefundOperationResult> {
        const items = validateRefundReservation(input)
        requireText(failureCode, "failure_code")
        return this.pgConnection_.transaction(async (transaction) => {
            const existing = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ tenant_id: input.tenant_id, idempotency_key: input.idempotency_key })
                .whereNull("deleted_at").first().forUpdate()
            if (!existing) throw new Error("POS refund reservation is missing")
            if (!matchesRefundReservation(existing, input, items) || existing.status === "acknowledged") {
                return refundOperationResult(existing, "conflict")
            }
            if (existing.status === "failed") return refundOperationResult(existing, "replay_failed")
            const [failed] = await transaction<POSRefundOperationRow>("pos_refund_operation")
                .where({ id: existing.id, status: "pending" })
                .update({ status: "failed", failure_code: failureCode, updated_at: transaction.fn.now() })
                .returning("*")
            return refundOperationResult(failed, "failed")
        })
    }
}

export default PosModuleService
