/**
 * print-engine.ts — Unified print engine abstraction
 *
 * Provides a single API to dispatch print jobs to:
 * 1. Browser print dialog (css/react-to-print) — always available
 * 2. ESC/POS thermal printer via Web Serial API — requires connection
 *
 * Usage:
 *   const engine = createPrintEngine()
 *   await engine.printReceipt(sale, business, options)
 *   await engine.printRefund(refund, business, options)
 */

import type { POSSale, POSRefund } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Types ──────────────────────────────────────────────────────

export interface BusinessInfo {
    name: string
    address?: string
    nif?: string
    phone?: string
    email?: string
    logoUrl?: string | null
}

/** Governance-driven receipt config injected from posConfig */
export interface ReceiptConfig {
    /** Custom header text (replaces business name line) */
    receiptHeader?: string
    /** Custom footer text (replaces default "thank you" line) */
    receiptFooter?: string
}

export interface PrintOptions {
    mode: 'browser' | 'thermal'
    paperWidth?: '80mm' | '58mm'
    openCashDrawer?: boolean
    /** Number of copies (thermal only) */
    copies?: number
    /** i18n labels for receipt strings */
    labels?: Record<string, string>
    /** Governance receipt config */
    receiptConfig?: ReceiptConfig
}

export type PrinterStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error'

export interface PrinterDevice {
    vendorId: number | null
    productId: number | null
    name: string
}

export interface PrintEngineState {
    status: PrinterStatus
    device: PrinterDevice | null
    lastError: string | null
}

// ── Event types ────────────────────────────────────────────────

export type PrintEngineEvent =
    | { type: 'status-change'; status: PrinterStatus }
    | { type: 'connected'; device: PrinterDevice }
    | { type: 'disconnected' }
    | { type: 'print-start' }
    | { type: 'print-complete' }
    | { type: 'print-error'; error: string }

export type PrintEngineListener = (event: PrintEngineEvent) => void

// ── Print engine interface ─────────────────────────────────────

export interface PrintEngine {
    /** Current state */
    getState(): PrintEngineState

    /** Connect to a thermal printer via Web Serial */
    connect(): Promise<boolean>

    /** Disconnect from thermal printer */
    disconnect(): Promise<void>

    /** Print a sale receipt */
    printReceipt(sale: POSSale, business: BusinessInfo, options?: Partial<PrintOptions>): Promise<void>

    /** Print a refund receipt */
    printRefund(refund: POSRefund, business: BusinessInfo, options?: Partial<PrintOptions>): Promise<void>

    /** Open the cash drawer */
    openCashDrawer(): Promise<void>

    /** Subscribe to events */
    on(listener: PrintEngineListener): () => void

    /** Check if Web Serial is available in this browser */
    isSerialAvailable(): boolean
}

// ── Implementation ─────────────────────────────────────────────

export function createPrintEngine(): PrintEngine {
    let state: PrintEngineState = {
        status: 'disconnected',
        device: null,
        lastError: null,
    }
    const listeners = new Set<PrintEngineListener>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let printer: any = null // WebSerialReceiptPrinter instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let encoderModule: any = null // ReceiptPrinterEncoder

    function emit(event: PrintEngineEvent) {
        listeners.forEach((fn) => fn(event))
    }

    function updateStatus(status: PrinterStatus) {
        state = { ...state, status }
        emit({ type: 'status-change', status })
    }

    /**
     * Lazy-load the ESC/POS modules (only when thermal printing is requested).
     *
     * The @point-of-sale packages only declare a "browser" exports condition,
     * which Turbopack can't resolve during the Client Component SSR pass.
     * We hide the specifiers behind variables so Turbopack can't trace them,
     * and fall back to a no-op stub when running outside the browser.
     */
    async function loadModules() {
        // Guard: these modules only work in the browser (Web Serial API)
        if (typeof window === 'undefined') return

        if (!encoderModule) {
            const pkg = '@point-of-sale/receipt-printer-encoder'
            const mod = await import(/* webpackIgnore: true */ pkg)
            encoderModule = mod.default || mod
        }
        if (!printer) {
            const pkg = '@point-of-sale/webserial-receipt-printer'
            const mod = await import(/* webpackIgnore: true */ pkg)
            const WebSerialReceiptPrinter = mod.default || mod
            printer = new WebSerialReceiptPrinter()

            printer.addEventListener('connected', (info: { vendorId: number | null; productId: number | null }) => {
                const device: PrinterDevice = {
                    vendorId: info.vendorId,
                    productId: info.productId,
                    name: `USB ${info.vendorId || '?'}:${info.productId || '?'}`,
                }
                state = { ...state, status: 'connected', device, lastError: null }
                emit({ type: 'connected', device })
                emit({ type: 'status-change', status: 'connected' })
            })

            printer.addEventListener('disconnected', () => {
                state = { ...state, status: 'disconnected', device: null }
                emit({ type: 'disconnected' })
                emit({ type: 'status-change', status: 'disconnected' })
            })
        }
    }

    /**
     * Encode a sale receipt to ESC/POS binary.
     * Accepts i18n labels and governance receiptConfig for dynamic header/footer.
     */
    function encodeSaleReceipt(
        sale: POSSale,
        business: BusinessInfo,
        paperWidth: '80mm' | '58mm',
        labels?: Record<string, string>,
        receiptConfig?: ReceiptConfig,
    ): Uint8Array {
        const ReceiptPrinterEncoder = encoderModule
        const charsPerLine = paperWidth === '58mm' ? 32 : 42
        const l = (key: string) => posLabel(key, labels)

        const encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            columns: charsPerLine,
            newline: '\n',
        })

        // Header — use governance receiptHeader if set, else business name
        const headerText = receiptConfig?.receiptHeader || business.name
        encoder
            .initialize()
            .align('center')
            .bold(true)
            .size(2, 2)
            .line(headerText)
            .bold(false)
            .size(1, 1)

        if (business.address) encoder.line(business.address)
        if (business.nif) encoder.line(`${l('panel.pos.nif')}: ${business.nif}`)
        if (business.phone) encoder.line(`${l('panel.pos.tel')}: ${business.phone}`)

        encoder
            .newline()
            .line(new Date(sale.created_at).toLocaleString())
            .line(`${l('panel.pos.order')}: #${sale.draft_order_id?.slice(-6) || sale.order_id?.slice(-6) || '------'}`)
            .align('left')
            .line('─'.repeat(charsPerLine))

        // Items
        for (const item of sale.items) {
            const qty = `${item.quantity}x`
            const total = fmtAmount(item.unit_price * item.quantity, sale.currency_code)
            const nameWidth = charsPerLine - qty.length - total.length - 2
            const name = item.title.length > nameWidth ? item.title.slice(0, nameWidth - 1) + '…' : item.title.padEnd(nameWidth)
            encoder.line(`${qty} ${name} ${total}`)
        }

        encoder.line('─'.repeat(charsPerLine))

        // Totals
        encoder.line(padLine(l('panel.pos.subtotal'), fmtAmount(sale.subtotal, sale.currency_code), charsPerLine))
        if (sale.discount_amount > 0) {
            encoder.line(padLine(l('panel.pos.discount'), `-${fmtAmount(sale.discount_amount, sale.currency_code)}`, charsPerLine))
        }
        if (sale.tax_amount > 0) {
            encoder.line(padLine(l('panel.pos.tax'), fmtAmount(sale.tax_amount, sale.currency_code), charsPerLine))
        }

        encoder
            .line('═'.repeat(charsPerLine))
            .bold(true)
            .size(2, 1)
            .line(padLine('TOTAL', fmtAmount(sale.total, sale.currency_code), Math.floor(charsPerLine / 2)))
            .bold(false)
            .size(1, 1)
            .line('─'.repeat(charsPerLine))

        // Payment — use i18n labels for payment method names
        const paymentName = sale.payment_method === 'cash' ? l('panel.pos.cash')
            : sale.payment_method === 'card_terminal' ? l('panel.pos.cardTerminal')
                : sale.payment_method === 'manual_card' ? l('panel.pos.manualCard')
                    : l('panel.pos.other')
        encoder.line(padLine(l('panel.pos.payment'), paymentName, charsPerLine))

        if (sale.customer_name) {
            encoder.line(padLine(l('panel.pos.customer'), sale.customer_name, charsPerLine))
        }

        // Footer — use governance receiptFooter if set, else default thank you
        const footerText = receiptConfig?.receiptFooter || l('panel.pos.thankYou')
        encoder
            .newline()
            .align('center')
            .qrcode(`receipt:${sale.draft_order_id?.slice(-6) || '000000'}:${sale.total}`, 1, 4, 'm')
            .newline()
            .line(footerText)
            .newline()
            .newline()
            .newline()
            .cut('partial')

        return encoder.encode()
    }

    /**
     * Encode a refund receipt to ESC/POS binary
     */
    function encodeRefundReceipt(
        refund: POSRefund,
        business: BusinessInfo,
        paperWidth: '80mm' | '58mm',
        labels?: Record<string, string>,
        receiptConfig?: ReceiptConfig,
    ): Uint8Array {
        const ReceiptPrinterEncoder = encoderModule
        const charsPerLine = paperWidth === '58mm' ? 32 : 42
        const l = (key: string) => posLabel(key, labels)

        const encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            columns: charsPerLine,
            newline: '\n',
        })

        const headerText = receiptConfig?.receiptHeader || business.name
        encoder
            .initialize()
            .align('center')
            .bold(true)
            .size(2, 2)
            .line(headerText)
            .bold(false)
            .size(1, 1)
            .newline()
            .bold(true)
            .line(l('panel.pos.refundBanner'))
            .bold(false)
            .newline()
            .line(new Date(refund.created_at).toLocaleString())
            .line(`${l('panel.pos.ref')}: ${refund.id.slice(0, 12)}`)
            .align('left')
            .line('─'.repeat(charsPerLine))

        // Items
        for (const item of refund.items) {
            const total = `-${fmtAmount(item.amount, refund.currency_code)}`
            const label = `${item.title}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`
            const nameWidth = charsPerLine - total.length - 1
            const name = label.length > nameWidth ? label.slice(0, nameWidth - 1) + '…' : label.padEnd(nameWidth)
            encoder.line(`${name} ${total}`)
        }

        encoder
            .line('═'.repeat(charsPerLine))
            .bold(true)
            .size(2, 1)
            .line(padLine('TOTAL', `-${fmtAmount(refund.total_refund, refund.currency_code)}`, Math.floor(charsPerLine / 2)))
            .bold(false)
            .size(1, 1)
            .line('─'.repeat(charsPerLine))

        encoder.line(padLine(l('panel.pos.reason'), refund.reason, charsPerLine))
        encoder.line(padLine(l('panel.pos.order'), refund.order_id.slice(0, 16), charsPerLine))

        encoder
            .newline()
            .align('center')
            .qrcode(`refund:${refund.id.slice(0, 12)}:${refund.total_refund}`, 1, 4, 'm')
            .newline()
            .newline()
            .newline()
            .cut('partial')

        return encoder.encode()
    }

    // ── Public API ─────────────────────────────────────────────

    return {
        getState() {
            return { ...state }
        },

        isSerialAvailable() {
            return typeof navigator !== 'undefined' && 'serial' in navigator
        },

        async connect(): Promise<boolean> {
            try {
                updateStatus('connecting')
                await loadModules()
                await printer.connect()
                return true
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Connection failed'
                state = { ...state, status: 'error', lastError: msg }
                emit({ type: 'status-change', status: 'error' })
                return false
            }
        },

        async disconnect(): Promise<void> {
            if (printer) {
                await printer.disconnect()
            }
        },

        async printReceipt(sale, business, options = {}): Promise<void> {
            const opts: PrintOptions = {
                mode: 'thermal',
                paperWidth: '80mm',
                openCashDrawer: false,
                copies: 1,
                ...options,
            }

            if (opts.mode !== 'thermal' || state.status !== 'connected') {
                // Fallback: browser print is handled by react-to-print in the component
                return
            }

            try {
                emit({ type: 'print-start' })
                await loadModules()
                const data = encodeSaleReceipt(sale, business, opts.paperWidth!, opts.labels, opts.receiptConfig)

                for (let i = 0; i < (opts.copies || 1); i++) {
                    await printer.print(data)
                }

                if (opts.openCashDrawer) {
                    await this.openCashDrawer()
                }

                emit({ type: 'print-complete' })
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Print failed'
                state = { ...state, lastError: msg }
                emit({ type: 'print-error', error: msg })
                throw err
            }
        },

        async printRefund(refund, business, options = {}): Promise<void> {
            const opts: PrintOptions = {
                mode: 'thermal',
                paperWidth: '80mm',
                ...options,
            }

            if (opts.mode !== 'thermal' || state.status !== 'connected') {
                return
            }

            try {
                emit({ type: 'print-start' })
                await loadModules()
                const data = encodeRefundReceipt(refund, business, opts.paperWidth!, opts.labels, opts.receiptConfig)
                await printer.print(data)
                emit({ type: 'print-complete' })
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Print failed'
                state = { ...state, lastError: msg }
                emit({ type: 'print-error', error: msg })
                throw err
            }
        },

        async openCashDrawer(): Promise<void> {
            if (state.status !== 'connected' || !printer) return
            try {
                await loadModules()
                const ReceiptPrinterEncoder = encoderModule
                const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos' })
                encoder.initialize().pulse()
                await printer.print(encoder.encode())
            } catch {
                // silently fail — cash drawer is optional
            }
        },

        on(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}

// ── Helpers ────────────────────────────────────────────────────

function fmtAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(amount / 100)
}

function padLine(left: string, right: string, width: number): string {
    const gap = width - left.length - right.length
    return `${left}${gap > 0 ? ' '.repeat(gap) : ' '}${right}`
}
