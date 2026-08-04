import { moduleIntegrationTestRunner } from '@medusajs/test-utils'

import { POS_MODULE } from '..'
import PosSession from '../models/pos-session'
import PosShift from '../models/pos-shift'
import PosSyncOperation from '../models/pos-sync-operation'
import PosTransaction from '../models/pos-transaction'
import type PosModuleService from '../service'

interface POSSyncReservationInput {
    tenant_id: string
    operation_id: string
    idempotency_key: string
    client_id: string
    client_sequence: number
    known_server_sequence: number
    amount_minor: number
    payload_sha256: string
}

interface POSSyncService {
    reservePOSSyncOperation(input: POSSyncReservationInput): Promise<{
        outcome: 'reserved' | 'duplicate' | 'conflict'
        server_sequence: number
        last_client_sequence: number
        order_id: string | null
    }>
    commitPOSSyncOperation(input: POSSyncReservationInput & {
        order_id: string
        draft_order_id: string
        display_id: number
    }): Promise<{
        outcome: 'committed' | 'duplicate' | 'conflict'
        server_sequence: number
        last_client_sequence: number
        order_id: string | null
    }>
    listPosSyncOperations(filters?: Record<string, unknown>): Promise<Array<{ id: string }>>
    deletePosSyncOperations(id: string): Promise<void>
}

moduleIntegrationTestRunner<PosModuleService>({
    moduleName: POS_MODULE,
    resolve: './src/modules/pos',
    moduleModels: [PosSession, PosTransaction, PosShift, PosSyncOperation],
    dbName: 'postgres',
    schema: 'public',
    testSuite: ({ service }) => {
        it('persists and cleans up a complete local cash POS journey', async () => {
            const session = await service.createPosSessions({
                terminal_id: 'local-counter-1',
                operator: 'local-operator',
                status: 'open',
                opening_balance: 10_000,
            })
            const shift = await service.createPosShifts({
                terminal_id: 'local-counter-1',
                operator: 'local-operator',
                status: 'open',
                expected_cash: 10_000,
                transaction_count: 0,
                total_revenue: 0,
            })
            const transaction = await service.createPosTransactions({
                session_id: session.id,
                amount: 2_340,
                currency_code: 'CHF',
                payment_method: 'cash',
                receipt_number: 'LOCAL-POS-0001',
                status: 'completed',
                line_items_snapshot: {
                    items: [
                        { title: 'Local POS item', quantity: 2, unit_price: 1_300 },
                    ],
                },
                discount_percent: 10,
            })

            expect((await service.listPosSessions({ id: session.id }))[0]).toMatchObject({
                terminal_id: 'local-counter-1',
                status: 'open',
            })
            expect((await service.listPosShifts({ id: shift.id }))[0]).toMatchObject({
                operator: 'local-operator',
                status: 'open',
            })
            expect((await service.listPosTransactions({ id: transaction.id }))[0]).toMatchObject({
                session_id: session.id,
                amount: 2_340,
                currency_code: 'CHF',
                payment_method: 'cash',
                receipt_number: 'LOCAL-POS-0001',
                status: 'completed',
            })

            await service.deletePosTransactions(transaction.id)
            await service.deletePosShifts(shift.id)
            await service.deletePosSessions(session.id)

            expect(await service.listPosTransactions({ id: transaction.id })).toEqual([])
            expect(await service.listPosShifts({ id: shift.id })).toEqual([])
            expect(await service.listPosSessions({ id: session.id })).toEqual([])
        })

        it('persists an authoritative idempotent sync acknowledgement and leaves zero residue', async () => {
            const syncService = service as PosModuleService & POSSyncService
            const input: POSSyncReservationInput = {
                tenant_id: 'tenant_local_pos',
                operation_id: 'operation_local_1',
                idempotency_key: 'offline_local_1',
                client_id: 'terminal_local_1',
                client_sequence: 1,
                known_server_sequence: 0,
                amount_minor: 2_340,
                payload_sha256: 'a'.repeat(64),
            }

            const reservation = await syncService.reservePOSSyncOperation(input)
            expect(reservation).toMatchObject({
                outcome: 'reserved',
                server_sequence: 1,
                last_client_sequence: 1,
                order_id: null,
            })

            const committed = await syncService.commitPOSSyncOperation({
                ...input,
                order_id: 'order_local_1',
                draft_order_id: 'draft_local_1',
                display_id: 42,
            })
            expect(committed).toMatchObject({
                outcome: 'committed',
                server_sequence: 1,
                last_client_sequence: 1,
                order_id: 'order_local_1',
            })

            await expect(syncService.reservePOSSyncOperation(input)).resolves.toMatchObject({
                outcome: 'duplicate',
                server_sequence: 1,
                last_client_sequence: 1,
                order_id: 'order_local_1',
            })
            await expect(syncService.reservePOSSyncOperation({
                ...input,
                operation_id: 'operation_conflicting',
                payload_sha256: 'b'.repeat(64),
            })).resolves.toMatchObject({
                outcome: 'conflict',
                server_sequence: 1,
                last_client_sequence: 1,
            })

            const persisted = await syncService.listPosSyncOperations({
                tenant_id: input.tenant_id,
                idempotency_key: input.idempotency_key,
            })
            expect(persisted).toHaveLength(1)

            await syncService.deletePosSyncOperations(persisted[0].id)
            expect(await syncService.listPosSyncOperations({ tenant_id: input.tenant_id })).toEqual([])
        })
    },
})
