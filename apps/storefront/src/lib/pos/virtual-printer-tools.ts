import type { BusinessInfo, PrintEngine } from '@/lib/pos/print-engine'
import type { POSSale } from '@/lib/pos/pos-config'
import type { VirtualPrintJob, VirtualPrinterId, VirtualPrinterProfile } from '@/lib/pos/virtual-printer'

export interface POSVirtualPrinterSelfTestOptions {
    printerId?: VirtualPrinterId | string
    paperWidth?: '80mm' | '58mm'
    openCashDrawer?: boolean
    businessName?: string
    business?: Partial<BusinessInfo>
}

export interface POSVirtualPrinterSelfTestResult {
    printer: VirtualPrinterProfile
    jobs: VirtualPrintJob[]
}

export async function runPOSVirtualPrinterSelfTest(
    engine: PrintEngine,
    options: POSVirtualPrinterSelfTestOptions = {},
): Promise<POSVirtualPrinterSelfTestResult> {
    const printers = engine.getVirtualPrinters()
    const printer = selectPrinter(printers, options.printerId, options.paperWidth)
    const previousJobCount = engine.getVirtualPrintJobs().length
    const business: BusinessInfo = {
        name: options.businessName || options.business?.name || 'BootandStrap Virtual POS',
        address: options.business?.address || 'Virtual printer lab',
        nif: options.business?.nif || 'BNS-VIRTUAL',
        phone: options.business?.phone,
        email: options.business?.email,
        logoUrl: options.business?.logoUrl ?? null,
    }

    await engine.printReceipt(createSelfTestSale(), business, {
        mode: 'virtual',
        virtualPrinterId: printer.id,
        paperWidth: printer.paperWidth || options.paperWidth || '80mm',
        receiptConfig: {
            receiptHeader: business.name,
            receiptFooter: 'Virtual printer self-test complete',
        },
    })

    if (options.openCashDrawer) {
        await engine.openVirtualCashDrawer(printer.id)
    }

    return {
        printer,
        jobs: engine.getVirtualPrintJobs().slice(previousJobCount),
    }
}

function selectPrinter(
    printers: VirtualPrinterProfile[],
    printerId?: VirtualPrinterId | string,
    paperWidth?: '80mm' | '58mm',
): VirtualPrinterProfile {
    const byId = printerId ? printers.find((printer) => printer.id === printerId) : undefined
    if (byId) return byId

    const byWidth = paperWidth ? printers.find((printer) => printer.paperWidth === paperWidth) : undefined
    if (byWidth) return byWidth

    return printers[0]
}

function createSelfTestSale(): POSSale {
    return {
        items: [
            {
                id: 'virtual-test-1',
                product_id: 'virtual-test-product',
                title: 'Virtual printer ticket',
                variant_title: 'Self-test',
                thumbnail: null,
                sku: 'BNS-VPRINT',
                unit_price: 1250,
                quantity: 1,
                currency_code: 'eur',
            },
            {
                id: 'virtual-test-2',
                product_id: 'virtual-test-service',
                title: 'POS tooling check',
                variant_title: null,
                thumbnail: null,
                sku: 'BNS-POS',
                unit_price: 250,
                quantity: 2,
                currency_code: 'eur',
            },
        ],
        discount: null,
        customer_id: null,
        customer_name: 'Virtual Customer',
        payment_method: 'cash',
        subtotal: 1750,
        discount_amount: 0,
        tax_amount: 368,
        total: 2118,
        currency_code: 'eur',
        created_at: new Date().toISOString(),
        order_id: null,
        draft_order_id: 'virtual-printer-self-test',
    }
}
