import { describe, expect, it } from 'vitest'

import { createVirtualPrinterLab } from '@/lib/pos/virtual-printer'
import type { POSRefund, POSSale } from '@/lib/pos/pos-config'

const sale: POSSale = {
    items: [
        {
            id: 'variant-lamp',
            product_id: 'product-lamp',
            title: 'Lampara LED',
            variant_title: 'Blanca',
            thumbnail: null,
            sku: 'LAMP-LED',
            unit_price: 1299,
            quantity: 2,
            currency_code: 'eur',
        },
    ],
    discount: null,
    customer_id: 'cus_1',
    customer_name: 'Ada Lovelace',
    payment_method: 'cash',
    subtotal: 2598,
    discount_amount: 0,
    tax_amount: 546,
    total: 3144,
    currency_code: 'eur',
    created_at: '2026-07-10T08:00:00.000Z',
    order_id: 'order_123456',
    draft_order_id: 'draft_abcdef',
}

const refund: POSRefund = {
    id: 'refund_123456789',
    order_id: 'order_123456',
    items: [{ title: 'Lampara LED', quantity: 1, amount: 1299 }],
    reason: 'damaged',
    total_refund: 1299,
    currency_code: 'eur',
    created_at: '2026-07-10T08:10:00.000Z',
    status: 'completed',
}

const business = {
    name: 'BootandStrap Demo Store',
    address: 'Calle Prueba 1',
    nif: 'B12345678',
    phone: '+34 600 000 000',
}

describe('virtual printer lab', () => {
    it('captures sale receipts as inspectable virtual print jobs', async () => {
        const lab = createVirtualPrinterLab({
            now: () => new Date('2026-07-10T08:30:00.000Z'),
            idFactory: () => 'job_sale_1',
        })

        const job = await lab.printSaleReceipt(sale, business, {
            printerId: 'thermal-80mm',
            receiptConfig: {
                receiptHeader: 'Caja Central',
                receiptFooter: 'Gracias por comprar',
            },
        })

        expect(job).toMatchObject({
            id: 'job_sale_1',
            type: 'sale_receipt',
            printerId: 'thermal-80mm',
            printerName: 'Virtual Thermal 80mm',
            paperWidth: '80mm',
            createdAt: '2026-07-10T08:30:00.000Z',
        })
        expect(job.text).toContain('Caja Central')
        expect(job.text).toContain('2x Lampara LED')
        expect(job.text).toContain('TOTAL')
        expect(job.text).toContain('31,44')
        expect(job.text).toContain('Gracias por comprar')
        expect(lab.getJobs()).toEqual([job])
    })

    it('captures refunds and cash drawer pulses without hardware', async () => {
        const lab = createVirtualPrinterLab({
            now: () => new Date('2026-07-10T08:35:00.000Z'),
            idFactory: () => 'job_refund_1',
        })

        const refundJob = await lab.printRefundReceipt(refund, business, {
            printerId: 'thermal-58mm',
        })
        const drawerJob = await lab.openCashDrawer('thermal-58mm')

        expect(refundJob).toMatchObject({
            type: 'refund_receipt',
            printerId: 'thermal-58mm',
            paperWidth: '58mm',
        })
        expect(refundJob.text).toContain('REFUND')
        expect(refundJob.text).toContain('Lampara LED')
        expect(drawerJob).toMatchObject({
            type: 'cash_drawer',
            printerId: 'thermal-58mm',
        })
        expect(lab.getJobs()).toHaveLength(2)
    })
})
