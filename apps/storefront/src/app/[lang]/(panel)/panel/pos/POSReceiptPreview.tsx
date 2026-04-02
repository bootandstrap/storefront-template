'use client'

/**
 * POSReceiptPreview — Dev-only thermal receipt preview panel
 *
 * Shows what the thermal printer would output in real-time.
 * Only rendered in development mode — zero production bundle impact.
 *
 * Features:
 * - Mono-font thermal receipt simulation
 * - Paper width toggle (80mm / 58mm)
 * - Character ruler
 * - Auto-updates when sale data changes
 */

import { useState, useMemo } from 'react'
import { X, Printer, Maximize2, Minimize2 } from 'lucide-react'
import type { POSSale } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'

// ── Only render in development ─────────────────────────────────
const IS_DEV = process.env.NODE_ENV === 'development'

interface POSReceiptPreviewProps {
    sale: POSSale | null
    businessName: string
    businessAddress?: string
    businessNIF?: string
    businessPhone?: string
    open: boolean
    onClose: () => void
}

type PaperWidth = 48 | 32 // chars: 80mm = 48, 58mm = 32

function formatPrice(amount: number, currency: string): string {
    return formatPOSCurrency(amount, currency?.toUpperCase() || 'EUR')
}

function ReceiptLine({ left, right, bold = false, width }: {
    left: string
    right?: string
    bold?: boolean
    width: PaperWidth
}) {
    const cls = bold ? 'font-bold' : ''
    if (!right) {
        return <div className={cls}>{left}</div>
    }
    const gap = width - left.length - right.length
    const dots = gap > 0 ? ' '.repeat(gap) : ' '
    return <div className={cls}>{left}{dots}{right}</div>
}

function DashedLine({ width }: { width: PaperWidth }) {
    return <div className="opacity-50">{'─'.repeat(width)}</div>
}

function renderReceipt(
    sale: POSSale,
    businessName: string,
    businessAddress: string,
    businessNIF: string,
    businessPhone: string,
    width: PaperWidth,
) {
    const lines: React.ReactNode[] = []
    const date = new Date(sale.created_at)
    const timestamp = `${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    const orderId = sale.draft_order_id?.slice(-6) || '------'
    const fmt = (amt: number) => formatPrice(amt, sale.currency_code)

    // Header
    lines.push(
        <div key="h1" className="text-center font-bold text-sm">{businessName}</div>,
        <div key="h2" className="text-center text-[10px]">{businessAddress}</div>,
        <div key="h3" className="text-center text-[10px]">NIF: {businessNIF} | Tel: {businessPhone}</div>,
        <DashedLine key="s1" width={width} />,
        <div key="h4" className="text-center text-[10px]">{timestamp}</div>,
        <div key="h5" className="text-center text-[10px]">Pedido: #{orderId}</div>,
        <DashedLine key="s2" width={width} />,
    )

    // Items
    for (const item of sale.items) {
        lines.push(
            <ReceiptLine
                key={`i-${item.id}`}
                left={`${item.quantity}x ${item.title}`}
                right={fmt(item.unit_price * item.quantity)}
                width={width}
            />
        )
    }

    lines.push(<DashedLine key="s3" width={width} />)

    // Totals
    lines.push(
        <ReceiptLine key="sub" left="Subtotal" right={fmt(sale.subtotal)} width={width} />
    )

    if (sale.discount_amount > 0) {
        lines.push(
            <ReceiptLine key="disc" left="Descuento" right={`-${fmt(sale.discount_amount)}`} width={width} />
        )
    }

    if (sale.tax_amount > 0) {
        lines.push(
            <ReceiptLine key="tax" left="IVA" right={fmt(sale.tax_amount)} width={width} />
        )
    }

    lines.push(<DashedLine key="s4" width={width} />)
    lines.push(
        <ReceiptLine key="total" left="TOTAL" right={fmt(sale.total)} bold width={width} />
    )
    lines.push(<DashedLine key="s5" width={width} />)

    // Payment
    const paymentLabel = sale.payment_method === 'cash' ? 'Efectivo'
        : sale.payment_method === 'card_terminal' ? 'Tarjeta'
        : sale.payment_method === 'manual_card' ? 'Tarjeta (manual)'
        : sale.payment_method || 'Otro'

    lines.push(
        <ReceiptLine key="pay" left="Método" right={paymentLabel} width={width} />
    )

    if (sale.customer_name) {
        lines.push(
            <ReceiptLine key="cust" left="Cliente" right={sale.customer_name} width={width} />
        )
    }

    // Footer
    lines.push(<DashedLine key="s6" width={width} />)
    lines.push(
        <div key="thanks" className="text-center text-[10px] mt-1">¡Gracias por su compra!</div>
    )

    // QR placeholder
    lines.push(
        <div key="qr" className="text-center mt-2">
            <div className="inline-block border border-dashed border-gray-400 p-2 text-[8px] text-gray-500">
                [QR: receipt/{orderId}]
            </div>
        </div>
    )

    return lines
}

export default function POSReceiptPreview({
    sale,
    businessName,
    businessAddress = 'C/ Mayor 15, 28001 Madrid',
    businessNIF = 'B-12345678',
    businessPhone = '+34 612 345 678',
    open,
    onClose,
}: POSReceiptPreviewProps) {
    // Skip rendering entirely in production
    if (!IS_DEV) return null
    if (!open) return null

    const [paperWidth, setPaperWidth] = useState<PaperWidth>(48)
    const [expanded, setExpanded] = useState(false)

    const receiptContent = useMemo(() => {
        if (!sale) return null
        return renderReceipt(sale, businessName, businessAddress, businessNIF, businessPhone, paperWidth)
    }, [sale, businessName, businessAddress, businessNIF, businessPhone, paperWidth])

    const panelWidth = expanded ? 'w-96' : 'w-80'

    return (
        <div className={`fixed right-0 top-0 bottom-0 ${panelWidth} z-40 flex flex-col
                        bg-gray-900 border-l border-gray-700 shadow-2xl transition-all duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-gray-200">
                        Thermal Preview
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-mono">
                        DEV
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400"
                        aria-label="Toggle size"
                    >
                        {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400"
                        aria-label="Close preview"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Paper width toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-800/50">
                <span className="text-[10px] text-gray-500">Paper:</span>
                <button
                    type="button"
                    onClick={() => setPaperWidth(48)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                        paperWidth === 48 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    80mm
                </button>
                <button
                    type="button"
                    onClick={() => setPaperWidth(32)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                        paperWidth === 32 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    58mm
                </button>
                <span className="text-[9px] text-gray-600 ml-auto">{paperWidth} chars/line</span>
            </div>

            {/* Character ruler */}
            <div className="px-3 py-0.5 bg-gray-850 border-b border-gray-700 overflow-x-auto">
                <div className="font-mono text-[8px] text-gray-600 whitespace-pre select-none">
                    {'|' + '····|'.repeat(Math.floor(paperWidth / 5))}
                </div>
                <div className="font-mono text-[7px] text-gray-700 whitespace-pre select-none">
                    {Array.from({ length: Math.floor(paperWidth / 10) }, (_, i) =>
                        String((i + 1) * 10).padStart(10)
                    ).join('')}
                </div>
            </div>

            {/* Receipt content */}
            <div className="flex-1 overflow-y-auto p-3 flex justify-center">
                {sale ? (
                    <div
                        className="bg-white text-black font-mono text-[11px] leading-tight p-4 rounded shadow-inner
                                   self-start"
                        style={{
                            maxWidth: paperWidth === 48 ? '80mm' : '58mm',
                            width: '100%',
                        }}
                    >
                        {receiptContent}
                    </div>
                ) : (
                    <div className="text-center text-gray-600 text-xs mt-20">
                        <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Completa una venta para</p>
                        <p>ver el preview del ticket</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-700 bg-gray-800">
                <p className="text-[9px] text-gray-600 text-center">
                    BootandStrap Dev Tools • Solo visible en desarrollo
                </p>
            </div>
        </div>
    )
}
