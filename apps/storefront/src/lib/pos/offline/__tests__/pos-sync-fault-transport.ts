import {
    POSSyncTransportError,
    type POSSyncCommitRequest,
    type POSSyncCommitResponse,
    type POSSyncTransport,
} from '../pos-sync-protocol'

export type FaultBarrier = 'beforeCommit' | 'afterCommit' | 'beforeAck'
export type FaultEffect = 'timeout' | 'auth_lost'

export interface InjectedFault {
    attempt: number
    barrier: FaultBarrier
    effect: FaultEffect
}

export interface POSSyncServerMutations {
    acceptDuplicateAsNew?: boolean
    invertSequenceComparison?: boolean
}

interface CommittedOperation {
    serverSequence: number
    clientSequence: number
}

export class POSSyncFaultTransport implements POSSyncTransport {
    readonly visitedBarriers: Array<{ attempt: number; barrier: FaultBarrier }> = []
    readonly committed = new Map<string, CommittedOperation>()
    committedCount = 0
    calls = 0
    serverSequence: number
    lastClientSequence: number

    constructor(
        readonly tenantId: string,
        initialServerSequence: number,
        initialLastClientSequence: number,
        private readonly faults: InjectedFault[],
        private readonly mutations: POSSyncServerMutations = {},
    ) {
        this.serverSequence = initialServerSequence
        this.lastClientSequence = initialLastClientSequence
    }

    private crossBarrier(attempt: number, barrier: FaultBarrier): void {
        this.visitedBarriers.push({ attempt, barrier })
        const fault = this.faults.find((entry) =>
            entry.attempt === attempt && entry.barrier === barrier,
        )
        if (!fault) return
        if (fault.effect === 'auth_lost') {
            throw new POSSyncTransportError('auth_lost', 'permanent', barrier)
        }
        throw new POSSyncTransportError('timeout', 'retryable', barrier)
    }

    async commit(request: POSSyncCommitRequest): Promise<POSSyncCommitResponse> {
        this.calls += 1
        const attempt = this.calls
        this.crossBarrier(attempt, 'beforeCommit')

        const existing = this.committed.get(request.operation.idempotencyKey)
        if (existing && !this.mutations.acceptDuplicateAsNew) {
            this.crossBarrier(attempt, 'beforeAck')
            return {
                outcome: 'duplicate',
                serverSequence: existing.serverSequence,
                lastClientSequence: existing.clientSequence,
            }
        }

        const hasSequenceConflict = this.mutations.invertSequenceComparison
            ? request.operation.clientSequence > this.lastClientSequence
            : request.operation.clientSequence <= this.lastClientSequence
        if (hasSequenceConflict && !(existing && this.mutations.acceptDuplicateAsNew)) {
            return {
                outcome: 'conflict',
                serverSequence: this.serverSequence,
                lastClientSequence: this.lastClientSequence,
            }
        }

        this.serverSequence += 1
        this.committedCount += 1
        this.lastClientSequence = request.operation.clientSequence
        this.committed.set(request.operation.idempotencyKey, {
            serverSequence: this.serverSequence,
            clientSequence: request.operation.clientSequence,
        })
        this.crossBarrier(attempt, 'afterCommit')
        this.crossBarrier(attempt, 'beforeAck')
        return {
            outcome: 'committed',
            serverSequence: this.serverSequence,
            lastClientSequence: this.lastClientSequence,
        }
    }
}
