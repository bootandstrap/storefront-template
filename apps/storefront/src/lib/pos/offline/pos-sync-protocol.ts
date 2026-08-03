export type POSSyncState =
    | 'queued'
    | 'acknowledged'
    | 'retryable_error'
    | 'rejected'
    | 'conflicted'

export type POSSyncRetryClassification = 'none' | 'retryable' | 'permanent'

export type POSSyncOutcome =
    | 'committed'
    | 'duplicate'
    | 'conflict'
    | 'tenant_mismatch'
    | 'auth_lost'
    | 'timeout'

export interface POSSyncOperation {
    tenantId: string
    operationId: string
    idempotencyKey: string
    clientId: string
    clientSequence: number
    createdAt: string
    amountMinor: number
    payload: Record<string, unknown>
}

export interface POSSyncCommitRequest {
    operation: POSSyncOperation
    knownServerSequence: number
}

export interface POSSyncCommitResponse {
    outcome: 'committed' | 'duplicate' | 'conflict'
    serverSequence: number
    lastClientSequence: number
}

export interface POSSyncTransport {
    commit(request: POSSyncCommitRequest): Promise<POSSyncCommitResponse>
}

export interface POSSyncResult {
    state: POSSyncState
    outcome: POSSyncOutcome
    serverSequence: number
    lastClientSequence?: number
    retryClassification: POSSyncRetryClassification
}

export class POSSyncTransportError extends Error {
    constructor(
        readonly code: 'auth_lost' | 'timeout',
        readonly classification: Exclude<POSSyncRetryClassification, 'none'>,
        readonly barrier?: 'beforeCommit' | 'afterCommit' | 'beforeAck',
    ) {
        super(code)
        this.name = 'POSSyncTransportError'
    }
}

function requireNonEmpty(value: string, field: string): void {
    if (!value.trim()) throw new Error(`${field} must be non-empty`)
}

export function createPOSSyncOperation(operation: POSSyncOperation): POSSyncOperation {
    requireNonEmpty(operation.tenantId, 'tenantId')
    requireNonEmpty(operation.operationId, 'operationId')
    requireNonEmpty(operation.idempotencyKey, 'idempotencyKey')
    requireNonEmpty(operation.clientId, 'clientId')
    if (!Number.isInteger(operation.clientSequence) || operation.clientSequence <= 0) {
        throw new Error('clientSequence must be a positive integer')
    }
    if (!Number.isInteger(operation.amountMinor) || operation.amountMinor < 0) {
        throw new Error('amountMinor must use non-negative integer minor units')
    }
    if (!Number.isFinite(Date.parse(operation.createdAt))) {
        throw new Error('createdAt must be an ISO timestamp')
    }
    if (!operation.payload || typeof operation.payload !== 'object' || Array.isArray(operation.payload)) {
        throw new Error('payload must be an object')
    }
    return { ...operation, payload: { ...operation.payload } }
}

export function resolvePOSSyncConflict(
    operation: POSSyncOperation,
    lastClientSequence: number,
): POSSyncOperation {
    if (!Number.isInteger(lastClientSequence) || lastClientSequence < 0) {
        throw new Error('lastClientSequence must be a non-negative integer')
    }
    return {
        ...operation,
        clientSequence: lastClientSequence + 1,
    }
}

export function retryDelayMs(attempt: number): number {
    if (!Number.isInteger(attempt) || attempt <= 0) {
        throw new Error('attempt must be a positive integer')
    }
    return Math.min(250 * (2 ** (attempt - 1)), 8000)
}

export async function synchronizePOSOperation(
    input: {
        operation: POSSyncOperation
        expectedTenantId: string
        knownServerSequence: number
    },
    transport: POSSyncTransport,
): Promise<POSSyncResult> {
    const operation = createPOSSyncOperation(input.operation)
    requireNonEmpty(input.expectedTenantId, 'expectedTenantId')
    if (!Number.isInteger(input.knownServerSequence) || input.knownServerSequence < 0) {
        throw new Error('knownServerSequence must be a non-negative integer')
    }
    if (operation.tenantId !== input.expectedTenantId) {
        return {
            state: 'rejected',
            outcome: 'tenant_mismatch',
            serverSequence: input.knownServerSequence,
            retryClassification: 'permanent',
        }
    }

    try {
        const response = await transport.commit({
            operation,
            knownServerSequence: input.knownServerSequence,
        })
        if (response.outcome === 'conflict') {
            return {
                state: 'conflicted',
                outcome: 'conflict',
                serverSequence: response.serverSequence,
                lastClientSequence: response.lastClientSequence,
                retryClassification: 'permanent',
            }
        }
        return {
            state: 'acknowledged',
            outcome: response.outcome,
            serverSequence: response.serverSequence,
            lastClientSequence: response.lastClientSequence,
            retryClassification: 'none',
        }
    } catch (error) {
        if (error instanceof POSSyncTransportError) {
            return {
                state: error.classification === 'retryable' ? 'retryable_error' : 'rejected',
                outcome: error.code,
                serverSequence: input.knownServerSequence,
                retryClassification: error.classification,
            }
        }
        throw error
    }
}
