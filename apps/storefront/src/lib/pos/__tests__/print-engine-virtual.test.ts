import { describe, expect, it } from 'vitest'

import { createPrintEngine } from '@/lib/pos/print-engine'
import { createVirtualPrinterLab } from '@/lib/pos/virtual-printer'
import type { POSSale } from '@/lib/pos/pos-config'

const sale: POSSale = {
    items: [
        {
            id: 'variant-1',
            product_id: 'product-1',
            title: 'Cafe',
            variant_title: null,
            thumbnail: null,
            sku: 'CAFE',
            unit_price: 250,
            quantity: 1,
            currency_code: 'eur',
        },
    ],
    discount: null,
    customer_id: null,
    customer_name: null,
    payment_method: 'cash',
    subtotal: 250,
    discount_amount: 0,
    tax_amount: 0,
    total: 250,
    currency_code: 'eur',
    created_at: '2026-07-10T08:00:00.000Z',
    order_id: null,
    draft_order_id: 'draft_pos_1',
}

describe('print engine virtual mode', () => {
    it('records virtual sale receipt jobs without Web Serial connection', async () => {
        const virtualLab = createVirtualPrinterLab({
            now: () => new Date('2026-07-10T08:40:00.000Z'),
            idFactory: () => 'job_engine_1',
        })
        const engine = createPrintEngine({ virtualLab })
        const events: string[] = []
        engine.on(event => events.push(event.type))

        await engine.printReceipt(sale, { name: 'Demo Store' }, {
            mode: 'virtual',
            virtualPrinterId: 'thermal-80mm',
        })

        expect(events).toEqual(['print-start', 'print-complete'])
        expect(engine.getVirtualPrintJobs()).toEqual([
            expect.objectContaining({
                id: 'job_engine_1',
                type: 'sale_receipt',
                text: expect.stringContaining('Cafe'),
            }),
        ])
        expect(engine.getState().status).toBe('disconnected')
    })

    it('clears virtual jobs through the print engine tooling API', async () => {
        const virtualLab = createVirtualPrinterLab({ idFactory: () => 'job_engine_2' })
        const engine = createPrintEngine({ virtualLab })

        await engine.printReceipt(sale, { name: 'Demo Store' }, { mode: 'virtual' })
        expect(engine.getVirtualPrintJobs()).toHaveLength(1)

        engine.clearVirtualPrintJobs()

        expect(engine.getVirtualPrintJobs()).toEqual([])
    })

    it('records virtual cash drawer pulses through the print engine tooling API', async () => {
        const virtualLab = createVirtualPrinterLab({ idFactory: () => 'job_drawer_1' })
        const engine = createPrintEngine({ virtualLab })

        const job = await engine.openVirtualCashDrawer('thermal-58mm')

        expect(job).toMatchObject({
            id: 'job_drawer_1',
            type: 'cash_drawer',
            printerId: 'thermal-58mm',
        })
        expect(engine.getVirtualPrintJobs()).toEqual([job])
    })
})
