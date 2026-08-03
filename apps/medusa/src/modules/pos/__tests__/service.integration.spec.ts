import { moduleIntegrationTestRunner } from '@medusajs/test-utils'

import { POS_MODULE } from '..'
import PosSession from '../models/pos-session'
import PosShift from '../models/pos-shift'
import PosTransaction from '../models/pos-transaction'
import type PosModuleService from '../service'

moduleIntegrationTestRunner<PosModuleService>({
    moduleName: POS_MODULE,
    resolve: './src/modules/pos',
    moduleModels: [PosSession, PosTransaction, PosShift],
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
    },
})
