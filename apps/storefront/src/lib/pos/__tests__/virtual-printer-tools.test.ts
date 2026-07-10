import { describe, expect, it } from 'vitest'

import { createPrintEngine } from '@/lib/pos/print-engine'
import { runPOSVirtualPrinterSelfTest } from '@/lib/pos/virtual-printer-tools'
import { createVirtualPrinterLab } from '@/lib/pos/virtual-printer'

describe('POS virtual printer tools', () => {
    it('runs a complete virtual receipt and drawer self-test through the print engine', async () => {
        let sequence = 0
        const engine = createPrintEngine({
            virtualLab: createVirtualPrinterLab({
                idFactory: () => {
                    sequence += 1
                    return `job_tool_${sequence}`
                },
            }),
        })

        const result = await runPOSVirtualPrinterSelfTest(engine, {
            printerId: 'thermal-58mm',
            paperWidth: '58mm',
            openCashDrawer: true,
            businessName: 'Tooling Store',
        })

        expect(result.printer.id).toBe('thermal-58mm')
        expect(result.jobs).toHaveLength(2)
        expect(result.jobs[0]).toMatchObject({
            id: 'job_tool_1',
            type: 'sale_receipt',
            printerId: 'thermal-58mm',
        })
        expect(result.jobs[0].text).toContain('Tooling Store')
        expect(result.jobs[1]).toMatchObject({
            id: 'job_tool_2',
            type: 'cash_drawer',
            printerId: 'thermal-58mm',
        })
    })
})
