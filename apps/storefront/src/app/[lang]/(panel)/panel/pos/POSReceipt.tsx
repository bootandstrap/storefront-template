'use client'

/**
 * POSReceipt — Animated sale completion receipt with professional print engine
 *
 * Phase 3 upgrade:
 * - `useReactToPrint` replaces raw `window.print()`
 * - Print mode toggle: Ticket (80mm thermal) vs A4 Invoice
 * - QR code on printed receipts via `qrcode.react`
 * - Ref-based print targets (PrintableReceipt + POSInvoice)
 * - Print mode persisted in localStorage
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { CheckCircle, Printer, Plus, Share2, Receipt, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import type { POSSale } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel, getUpsellTooltip } from '@/lib/pos/pos-i18n'
import PrintableReceipt from './PrintableReceipt'
import POSInvoice from './POSInvoice'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

type PrintMode = 'ticket' | 'invoice'

interface POSReceiptProps {
    sale: POSSale
    businessName: string
    businessAddress?: string
    businessNIF?: string
    businessPhone?: string
    businessEmail?: string
    canThermalPrint?: boolean
    onNewSale: () => void
    labels: Record<string, string>
    /** POS config from governance (receipt header/footer, etc.) */
    posConfig?: Record<string, unknown>
}

function getInitialPrintMode(): PrintMode {
    if (typeof window === 'undefined') return 'ticket'
    return (localStorage.getItem('pos-print-mode') as PrintMode) || 'ticket'
}

export default function POSReceipt({
    sale,
    businessName,
    businessAddress,
    businessNIF,
    businessPhone,
    businessEmail,
    canThermalPrint = true,
    onNewSale,
    labels,
    posConfig = {},
}: POSReceiptProps) {
    // ── Print mode state ──
    const [printMode, setPrintMode] = useState<PrintMode>(getInitialPrintMode)
    const receiptRef = useRef<HTMLDivElement>(null)
    const invoiceRef = useRef<HTMLDivElement>(null)

    // ── SaaS Gating State ──
    const [gateData, setGateData] = useState<{isOpen: boolean, flag: string}>({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    // ── Persist print mode ──
    const togglePrintMode = useCallback((mode: PrintMode) => {
        setPrintMode(mode)
        localStorage.setItem('pos-print-mode', mode)
    }, [])

    // ── react-to-print hooks ──
    const handlePrintTicket = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Ticket-${sale.draft_order_id?.slice(-6) || 'POS'}`,
    })

    const handlePrintInvoice = useReactToPrint({
        contentRef: invoiceRef,
        documentTitle: `Factura-${sale.draft_order_id?.slice(-6) || 'POS'}`,
    })

    const handlePrint = useCallback(() => {
        if (printMode === 'invoice') {
            handlePrintInvoice()
        } else {
            handlePrintTicket()
        }
    }, [printMode, handlePrintTicket, handlePrintInvoice])

    // ── Escape key to dismiss receipt modal ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onNewSale()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onNewSale])

    const formatCurrency = (amount: number) =>
        formatPOSCurrency(amount, sale.currency_code || 'EUR')

    const paymentLabel = sale.payment_method === 'cash' ? posLabel('panel.pos.cash', labels)
        : (sale.payment_method === 'card_terminal' || sale.payment_method === 'manual_card') ? posLabel('panel.pos.card', labels)
        : posLabel('panel.pos.other', labels)

    const business = {
        name: businessName,
        address: businessAddress,
        nif: businessNIF,
        phone: businessPhone,
        email: businessEmail,
    }

    return (
        <>
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-label={posLabel('panel.pos.saleComplete', labels)}
            >
                <motion.div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onNewSale}
                />

                {/* Card */}
                <motion.div
                    className="relative bg-sf-0 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                    initial={{ opacity: 0, scale: 0.85, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.1 }}
                >
                    {/* Success header */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-center text-white">
                        <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.3 }}
                        >
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 drop-shadow-md" />
                        </motion.div>
                        <motion.h2
                            className="text-lg font-bold"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {posLabel('panel.pos.saleComplete', labels)}
                        </motion.h2>
                        {sale.order_id && (
                            <motion.p
                                className="text-emerald-100 text-xs mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                {posLabel('panel.pos.orderNumber', labels)}: #{sale.draft_order_id?.slice(-6) || '—'}
                            </motion.p>
                        )}
                    </div>

                    {/* Receipt body */}
                    <motion.div
                        className="px-6 py-4 space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <div className="text-center text-xs text-tx-muted font-mono">{businessName}</div>

                        {/* Items */}
                        <div className="space-y-1.5 border-y border-dashed border-sf-3 py-3">
                            {sale.items.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    className="flex justify-between text-xs"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + idx * 0.05 }}
                                >
                                    <span className="text-tx">
                                        {item.quantity}× {item.title}
                                    </span>
                                    <span className="font-medium text-tx">
                                        {formatCurrency(item.unit_price * item.quantity)}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-tx-sec">
                                <span>{posLabel('panel.pos.subtotal', labels)}</span>
                                <span>{formatCurrency(sale.subtotal)}</span>
                            </div>
                            {sale.discount_amount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>{posLabel('panel.pos.discount', labels)}</span>
                                    <span>-{formatCurrency(sale.discount_amount)}</span>
                                </div>
                            )}
                            {sale.tax_amount > 0 && (
                                <div className="flex justify-between text-tx-sec">
                                    <span>{posLabel('panel.pos.tax', labels)}</span>
                                    <span>{formatCurrency(sale.tax_amount)}</span>
                                </div>
                            )}
                            <motion.div
                                className="flex justify-between text-base font-bold text-tx pt-2 border-t border-sf-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <span>{posLabel('panel.pos.total', labels)}</span>
                                <span>{formatCurrency(sale.total)}</span>
                            </motion.div>
                        </div>

                        {/* Payment info */}
                        <div className="flex justify-between text-xs text-tx-sec bg-sf-1 rounded-lg p-2">
                            <span>{posLabel('panel.pos.paymentMethod', labels)}</span>
                            <span className="font-medium">{paymentLabel}</span>
                        </div>

                        {sale.customer_name && (
                            <div className="flex justify-between text-xs text-tx-sec bg-sf-1 rounded-lg p-2">
                                <span>{posLabel('panel.pos.customer', labels)}</span>
                                <span className="font-medium">{sale.customer_name}</span>
                            </div>
                        )}

                        <p className="text-center text-xs text-tx-muted italic mt-2">
                            {posLabel('panel.pos.thankYou', labels)}
                        </p>
                    </motion.div>

                    {/* Print mode toggle */}
                    <motion.div
                        className="px-6 pb-2 flex gap-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <button
                            type="button"
                            onClick={() => togglePrintMode('ticket')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium
                                       transition-colors ${
                                printMode === 'ticket'
                                    ? 'bg-brand-subtle text-brand border border-brand'
                                    : 'text-tx-muted hover:bg-sf-1 border border-transparent'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            Ticket
                        </button>
                        <button
                            type="button"
                            onClick={() => togglePrintMode('invoice')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium
                                       transition-colors ${
                                printMode === 'invoice'
                                    ? 'bg-brand-subtle text-brand border border-brand'
                                    : 'text-tx-muted hover:bg-sf-1 border border-transparent'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {labels['panel.pos.invoice'] || 'Factura A4'}
                        </button>
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        className="px-6 pb-5 flex gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <button
                            onClick={() => handleFeatureClick(canThermalPrint, 'enable_pos_thermal_printer', handlePrint)}
                            aria-label={posLabel('panel.pos.printReceipt', labels)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl min-h-[44px]
                                       border border-sf-3 text-sm font-medium
                                       transition-colors active:scale-[0.97]
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none ${
                                canThermalPrint
                                    ? 'text-tx-sec hover:bg-sf-1'
                                    : 'text-tx-faint hover:bg-sf-1'
                            }`}
                            title={canThermalPrint
                                ? posLabel('panel.pos.printReceipt', labels)
                                : getUpsellTooltip('enable_pos_thermal_printer', labels)
                            }
                        >
                            <Printer className="w-4 h-4" />
                            {posLabel('panel.pos.printReceipt', labels)}
                            {!canThermalPrint && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sf-2 text-tx-faint font-semibold">
                                    Enterprise
                                </span>
                            )}
                        </button>
                        {/* Share receipt stub — uses Web Share API when available */}
                        {typeof navigator !== 'undefined' && navigator.share && (
                            <button
                                onClick={() => {
                                    navigator.share({
                                        title: posLabel('panel.pos.saleComplete', labels),
                                        text: `${businessName} — ${posLabel('panel.pos.total', labels)}: ${formatCurrency(sale.total)}`,
                                    }).catch(() => { /* user cancelled share */ })
                                }}
                                aria-label={posLabel('panel.pos.shareReceipt', labels) || 'Share receipt'}
                                className="w-[44px] flex items-center justify-center rounded-xl min-h-[44px]
                                           border border-sf-3 text-tx-sec hover:bg-sf-1
                                           transition-colors active:scale-[0.97]
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                title={posLabel('panel.pos.shareReceipt', labels) || 'Share receipt'}
                            >
                                <Share2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onNewSale}
                            aria-label={posLabel('panel.pos.newSale', labels)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl min-h-[44px]
                                       bg-brand text-white text-sm font-bold
                                       hover:bg-brand-dark transition-colors active:scale-[0.97]
                                       focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                        >
                            <Plus className="w-4 h-4" />
                            {posLabel('panel.pos.newSale', labels)}
                        </button>
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Hidden printable templates ── */}
            <PrintableReceipt
                ref={receiptRef}
                type="sale"
                sale={sale}
                business={business}
                showQR={true}
                labels={labels}
                receiptHeader={posConfig.pos_receipt_header as string | undefined}
                receiptFooter={posConfig.pos_receipt_footer as string | undefined}
            />
            <POSInvoice
                ref={invoiceRef}
                sale={sale}
                business={business}
                labels={labels}
            />
        </>
    )
}
