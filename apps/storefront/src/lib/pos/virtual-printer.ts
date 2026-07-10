import type { POSRefund, POSSale } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

export type VirtualPrinterId = 'thermal-80mm' | 'thermal-58mm' | 'browser-a4' | 'label-sheet'
export type VirtualPaperWidth = '80mm' | '58mm'
export type VirtualPrintJobType = 'sale_receipt' | 'refund_receipt' | 'cash_drawer'

export interface VirtualBusinessInfo {
    name: string
    address?: string
    nif?: string
    phone?: string
    email?: string
    logoUrl?: string | null
}

export interface VirtualReceiptConfig {
    receiptHeader?: string
    receiptFooter?: string
}

export interface VirtualPrinterProfile {
    id: VirtualPrinterId
    name: string
    kind: 'receipt' | 'document' | 'label'
    columns: number
    paperWidth?: VirtualPaperWidth
}

export interface VirtualPrintJob {
    id: string
    type: VirtualPrintJobType
    printerId: VirtualPrinterId
    printerName: string
    paperWidth?: VirtualPaperWidth
    createdAt: string
    title: string
    text: string
    metadata: Record<string, unknown>
}

export interface VirtualReceiptOptions {
    printerId?: VirtualPrinterId | string
    paperWidth?: VirtualPaperWidth
    labels?: Record<string, string>
    receiptConfig?: VirtualReceiptConfig
}

export interface VirtualPrinterLab {
    getPrinters(): VirtualPrinterProfile[]
    getJobs(): VirtualPrintJob[]
    clearJobs(): void
    printSaleReceipt(
        sale: POSSale,
        business: VirtualBusinessInfo,
        options?: VirtualReceiptOptions,
    ): Promise<VirtualPrintJob>
    printRefundReceipt(
        refund: POSRefund,
        business: VirtualBusinessInfo,
        options?: VirtualReceiptOptions,
    ): Promise<VirtualPrintJob>
    openCashDrawer(printerId?: VirtualPrinterId | string): Promise<VirtualPrintJob>
}

export interface VirtualPrinterLabOptions {
    now?: () => Date
    idFactory?: () => string
}

const VIRTUAL_PRINTERS: VirtualPrinterProfile[] = [
    {
        id: 'thermal-80mm',
        name: 'Virtual Thermal 80mm',
        kind: 'receipt',
        columns: 42,
        paperWidth: '80mm',
    },
    {
        id: 'thermal-58mm',
        name: 'Virtual Thermal 58mm',
        kind: 'receipt',
        columns: 32,
        paperWidth: '58mm',
    },
    {
        id: 'browser-a4',
        name: 'Virtual Browser A4',
        kind: 'document',
        columns: 72,
    },
    {
        id: 'label-sheet',
        name: 'Virtual Label Sheet',
        kind: 'label',
        columns: 36,
    },
]

export function createVirtualPrinterLab(options: VirtualPrinterLabOptions = {}): VirtualPrinterLab {
    const jobs: VirtualPrintJob[] = []
    const now = options.now ?? (() => new Date())
    const idFactory = options.idFactory ?? defaultJobIdFactory()

    function pushJob(
        type: VirtualPrintJobType,
        printer: VirtualPrinterProfile,
        title: string,
        text: string,
        metadata: Record<string, unknown>,
    ): VirtualPrintJob {
        const job: VirtualPrintJob = {
            id: idFactory(),
            type,
            printerId: printer.id,
            printerName: printer.name,
            paperWidth: printer.paperWidth,
            createdAt: now().toISOString(),
            title,
            text,
            metadata,
        }
        jobs.push(job)
        return job
    }

    return {
        getPrinters() {
            return VIRTUAL_PRINTERS.map((printer) => ({ ...printer }))
        },

        getJobs() {
            return jobs.map((job) => ({ ...job, metadata: { ...job.metadata } }))
        },

        clearJobs() {
            jobs.length = 0
        },

        async printSaleReceipt(sale, business, receiptOptions = {}) {
            const printer = resolvePrinter(receiptOptions)
            return pushJob(
                'sale_receipt',
                printer,
                'Sale receipt',
                renderSaleReceipt(sale, business, printer, receiptOptions),
                {
                    saleDraftOrderId: sale.draft_order_id,
                    saleOrderId: sale.order_id,
                    total: sale.total,
                    currencyCode: sale.currency_code,
                },
            )
        },

        async printRefundReceipt(refund, business, receiptOptions = {}) {
            const printer = resolvePrinter(receiptOptions)
            return pushJob(
                'refund_receipt',
                printer,
                'Refund receipt',
                renderRefundReceipt(refund, business, printer, receiptOptions),
                {
                    refundId: refund.id,
                    orderId: refund.order_id,
                    totalRefund: refund.total_refund,
                    currencyCode: refund.currency_code,
                },
            )
        },

        async openCashDrawer(printerId = 'thermal-80mm') {
            const printer = resolvePrinter({ printerId })
            return pushJob(
                'cash_drawer',
                printer,
                'Cash drawer pulse',
                [
                    printer.name,
                    'CASH DRAWER PULSE',
                    `created_at=${now().toISOString()}`,
                ].join('\n'),
                { pulse: true },
            )
        },
    }
}

function renderSaleReceipt(
    sale: POSSale,
    business: VirtualBusinessInfo,
    printer: VirtualPrinterProfile,
    options: VirtualReceiptOptions,
): string {
    const l = (key: string) => posLabel(key, options.labels)
    const lines = [
        center(options.receiptConfig?.receiptHeader || business.name, printer.columns),
        ...businessLines(business, l),
        '',
        new Date(sale.created_at).toLocaleString('es-ES'),
        `${l('panel.pos.order')}: #${sale.draft_order_id?.slice(-6) || sale.order_id?.slice(-6) || '------'}`,
        rule('-', printer.columns),
    ]

    for (const item of sale.items) {
        lines.push(padLine(
            `${item.quantity}x ${item.title}`,
            formatAmount(item.unit_price * item.quantity, sale.currency_code),
            printer.columns,
        ))
    }

    lines.push(
        rule('-', printer.columns),
        padLine(l('panel.pos.subtotal'), formatAmount(sale.subtotal, sale.currency_code), printer.columns),
    )

    if (sale.discount_amount > 0) {
        lines.push(padLine(l('panel.pos.discount'), `-${formatAmount(sale.discount_amount, sale.currency_code)}`, printer.columns))
    }
    if (sale.tax_amount > 0) {
        lines.push(padLine(l('panel.pos.tax'), formatAmount(sale.tax_amount, sale.currency_code), printer.columns))
    }

    lines.push(
        rule('=', printer.columns),
        padLine('TOTAL', formatAmount(sale.total, sale.currency_code), printer.columns),
        rule('-', printer.columns),
        padLine(l('panel.pos.payment'), paymentLabel(sale.payment_method, l), printer.columns),
    )

    if (sale.customer_name) {
        lines.push(padLine(l('panel.pos.customer'), sale.customer_name, printer.columns))
    }

    lines.push('', center(options.receiptConfig?.receiptFooter || l('panel.pos.thankYou'), printer.columns))
    return lines.join('\n')
}

function renderRefundReceipt(
    refund: POSRefund,
    business: VirtualBusinessInfo,
    printer: VirtualPrinterProfile,
    options: VirtualReceiptOptions,
): string {
    const l = (key: string) => posLabel(key, options.labels)
    const lines = [
        center(options.receiptConfig?.receiptHeader || business.name, printer.columns),
        'REFUND',
        new Date(refund.created_at).toLocaleString('es-ES'),
        `${l('panel.pos.ref')}: ${refund.id.slice(0, 12)}`,
        rule('-', printer.columns),
    ]

    for (const item of refund.items) {
        const quantityLabel = item.quantity > 1 ? ` x${item.quantity}` : ''
        lines.push(padLine(
            `${item.title}${quantityLabel}`,
            `-${formatAmount(item.amount, refund.currency_code)}`,
            printer.columns,
        ))
    }

    lines.push(
        rule('=', printer.columns),
        padLine('TOTAL', `-${formatAmount(refund.total_refund, refund.currency_code)}`, printer.columns),
        rule('-', printer.columns),
        padLine(l('panel.pos.reason'), refund.reason, printer.columns),
        padLine(l('panel.pos.order'), refund.order_id.slice(0, 16), printer.columns),
    )

    return lines.join('\n')
}

function resolvePrinter(options: VirtualReceiptOptions): VirtualPrinterProfile {
    const explicitId = options.printerId && VIRTUAL_PRINTERS.some((printer) => printer.id === options.printerId)
        ? options.printerId
        : undefined
    const paperWidthMatch = options.paperWidth
        ? VIRTUAL_PRINTERS.find((printer) => printer.paperWidth === options.paperWidth)?.id
        : undefined
    const printerId = explicitId || paperWidthMatch || 'thermal-80mm'
    const printer = VIRTUAL_PRINTERS.find((item) => item.id === printerId)
    return printer ? { ...printer } : { ...VIRTUAL_PRINTERS[0] }
}

function businessLines(business: VirtualBusinessInfo, label: (key: string) => string): string[] {
    const lines: string[] = []
    if (business.address) lines.push(business.address)
    if (business.nif) lines.push(`${label('panel.pos.nif')}: ${business.nif}`)
    if (business.phone) lines.push(`${label('panel.pos.tel')}: ${business.phone}`)
    if (business.email) lines.push(business.email)
    return lines
}

function paymentLabel(paymentMethod: POSSale['payment_method'], label: (key: string) => string): string {
    if (paymentMethod === 'cash') return label('panel.pos.cash')
    if (paymentMethod === 'card_terminal') return label('panel.pos.cardTerminal')
    if (paymentMethod === 'manual_card') return label('panel.pos.manualCard')
    if (paymentMethod === 'twint') return label('panel.pos.twint')
    return label('panel.pos.other')
}

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(amount / 100)
}

function padLine(left: string, right: string, width: number): string {
    const normalizedLeft = left.length > width ? left.slice(0, width - 1) : left
    const gap = width - normalizedLeft.length - right.length
    return `${normalizedLeft}${gap > 0 ? ' '.repeat(gap) : ' '}${right}`
}

function center(text: string, width: number): string {
    if (text.length >= width) return text
    const left = Math.floor((width - text.length) / 2)
    return `${' '.repeat(left)}${text}`
}

function rule(char: string, width: number): string {
    return char.repeat(width)
}

function defaultJobIdFactory(): () => string {
    let sequence = 0
    return () => {
        sequence += 1
        return `vprint_${Date.now()}_${sequence}`
    }
}
