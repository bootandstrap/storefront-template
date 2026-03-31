'use client'

import { useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { RotateCcw, Printer, X } from 'lucide-react'
import type { POSRefund } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'
import PrintableReceipt from './PrintableReceipt'

interface POSRefundReceiptProps {
    refund: POSRefund
    businessName: string
    businessAddress?: string
    businessNIF?: string
    businessPhone?: string
    onClose: () => void
    labels: Record<string, string>
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-CH', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(amount / 100)
}

const REASON_LABEL_KEYS: Record<string, string> = {
    damaged: 'panel.pos.refundDamaged',
    wrong_item: 'panel.pos.refundWrongItem',
    dissatisfied: 'panel.pos.refundDissatisfied',
    other: 'panel.pos.refundOther',
}

export default function POSRefundReceipt({ refund, businessName, businessAddress, businessNIF, businessPhone, onClose, labels }: POSRefundReceiptProps) {
    const date = new Date(refund.created_at)
    const receiptRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Devolucion-${refund.id.slice(0, 8)}`,
    })

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const business = {
        name: businessName,
        address: businessAddress,
        nif: businessNIF,
        phone: businessPhone,
    }

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label={labels['panel.pos.refundReceipt'] || 'Refund receipt'}
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95">
                    {/* Receipt header */}
                    <div className="bg-rose-50 px-6 py-5 text-center border-b border-rose-100">
                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                            <RotateCcw className="w-6 h-6 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-bold text-rose-700">
                            {labels['panel.pos.refundReceipt'] || 'Comprobante de devolución'}
                        </h3>
                        <p className="text-sm text-rose-500 font-medium mt-1">{businessName}</p>
                    </div>

                    {/* Receipt body */}
                    <div className="px-6 py-4 space-y-3">
                        {/* Meta */}
                        <div className="flex justify-between text-[11px] text-tx-muted">
                            <span>Ref: {refund.id.slice(0, 12)}</span>
                            <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Dashed separator */}
                        <div className="border-t border-dashed border-sf-3" />

                        {/* Items */}
                        <div className="space-y-2">
                            {refund.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-tx">
                                        {item.title}
                                        {item.quantity > 1 && (
                                            <span className="text-tx-muted ml-1">×{item.quantity}</span>
                                        )}
                                    </span>
                                    <span className="font-medium text-rose-600">
                                        -{formatPrice(item.amount, refund.currency_code)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed border-sf-3" />

                        {/* Reason */}
                        <div className="flex justify-between text-sm">
                            <span className="text-tx-muted">{posLabel('panel.pos.refundReason', labels)}</span>
                            <span className="text-tx font-medium">
                                {posLabel(REASON_LABEL_KEYS[refund.reason] || 'panel.pos.refundOther', labels)}
                            </span>
                        </div>
                        {refund.reason_note && (
                            <p className="text-xs text-tx-muted bg-sf-1 px-3 py-2 rounded-lg">
                                {refund.reason_note}
                            </p>
                        )}

                        <div className="border-t border-dashed border-sf-3" />

                        {/* Total */}
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-tx">
                                {labels['panel.pos.total'] || 'Total reembolso'}
                            </span>
                            <span className="text-xl font-bold text-rose-600">
                                -{formatPrice(refund.total_refund, refund.currency_code)}
                            </span>
                        </div>

                        {/* Order reference */}
                        <p className="text-[11px] text-tx-muted text-center">
                            {posLabel('panel.pos.originalOrder', labels)}: {refund.order_id.slice(0, 16)}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-sf-2 flex gap-2">
                        <button
                            onClick={() => handlePrint()}
                            aria-label={labels['panel.pos.printReceipt'] || 'Print receipt'}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]
                                       bg-sf-1 text-tx-sec text-sm font-medium
                                       hover:bg-sf-2 transition-colors
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <Printer className="w-4 h-4" />
                            {labels['panel.pos.printReceipt'] || 'Imprimir'}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]
                                       bg-brand text-white text-sm font-medium
                                       hover:bg-brand transition-colors
                                       focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
                        >
                            <X className="w-4 h-4" />
                            {posLabel('panel.pos.close', labels)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden printable template */}
            <PrintableReceipt
                ref={receiptRef}
                type="refund"
                refund={refund}
                business={business}
                showQR={true}
                labels={labels}
            />
        </>
    )
}
