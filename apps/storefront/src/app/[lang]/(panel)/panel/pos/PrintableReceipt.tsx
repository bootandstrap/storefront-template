'use client'

/**
 * PrintableReceipt — Professional thermal receipt template (80mm / 58mm)
 *
 * Hidden printable element that renders a fiscal-grade receipt:
 * - Business header (name, address, NIF, phone)
 * - Itemized list with quantities and prices
 * - Subtotal / discount / tax / total
 * - Payment method + change
 * - QR code linking to digital receipt
 * - Configurable paper width
 *
 * Print via `useReactToPrint` targeting this component's ref.
 */

import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { POSSale, POSRefund } from '@/lib/pos/pos-config'

// ── Types ──────────────────────────────────────────────────────

interface BusinessInfo {
    name: string
    address?: string
    nif?: string
    phone?: string
    email?: string
    logoUrl?: string | null
}

interface PrintableReceiptProps {
    type: 'sale' | 'refund'
    sale?: POSSale
    refund?: POSRefund
    business: BusinessInfo
    paperWidth?: '80mm' | '58mm'
    showQR?: boolean
    labels: Record<string, string>
}

// ── Helpers ────────────────────────────────────────────────────

function fmtPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'EUR',
        minimumFractionDigits: 2,
    }).format(amount / 100)
}

function fmtDate(iso: string): string {
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
}

function paymentMethodLabel(method: string, labels: Record<string, string>): string {
    switch (method) {
        case 'cash': return labels['panel.pos.cash'] || 'Efectivo'
        case 'card_terminal': return labels['panel.pos.cardTerminal'] || 'Tarjeta'
        case 'manual_card': return labels['panel.pos.manualCard'] || 'Tarjeta (manual)'
        case 'twint': return labels['panel.pos.twint'] || 'TWINT'
        default: return labels['panel.pos.other'] || 'Otro'
    }
}

// ── Component ──────────────────────────────────────────────────

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
    function PrintableReceipt({ type, sale, refund, business, paperWidth = '80mm', showQR = true, labels }, ref) {
        const isSale = type === 'sale' && sale
        const isRefund = type === 'refund' && refund
        if (!isSale && !isRefund) return null

        const currency = isSale ? sale.currency_code : refund!.currency_code
        const timestamp = isSale ? sale.created_at : refund!.created_at
        const orderId = isSale
            ? (sale.draft_order_id?.slice(-6) || sale.order_id?.slice(-6) || '------')
            : refund!.order_id.slice(0, 12)

        const maxW = paperWidth === '58mm' ? '58mm' : '80mm'

        return (
            <div
                ref={ref}
                className="print-receipt-container"
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: maxW,
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: '#000',
                    background: '#fff',
                    padding: '8px',
                }}
            >
                {/* Print styles */}
                <style>{`
                    @media print {
                        @page {
                            margin: 0;
                            size: ${maxW} auto;
                        }
                        body * { visibility: hidden !important; }
                        .print-receipt-container,
                        .print-receipt-container * {
                            visibility: visible !important;
                        }
                        .print-receipt-container {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: ${maxW} !important;
                        }
                    }
                `}</style>

                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                        {business.name}
                    </div>
                    {business.address && (
                        <div style={{ fontSize: '9px' }}>{business.address}</div>
                    )}
                    {(business.nif || business.phone) && (
                        <div style={{ fontSize: '9px' }}>
                            {business.nif && `NIF: ${business.nif}`}
                            {business.nif && business.phone && ' | '}
                            {business.phone && `Tel: ${business.phone}`}
                        </div>
                    )}
                </div>

                {/* separator */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                {/* ── Meta ── */}
                <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '2px' }}>
                    {fmtDate(timestamp)}
                </div>
                <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '4px' }}>
                    {isRefund ? (
                        <>
                            <strong style={{ color: '#c00', fontSize: '12px' }}>— DEVOLUCIÓN —</strong>
                            <br />
                            Ref: {orderId}
                        </>
                    ) : (
                        <>Pedido: #{orderId}</>
                    )}
                </div>

                {/* separator */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                {/* ── Items ── */}
                {isSale && sale.items.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '1px 0',
                        }}
                    >
                        <span>{item.quantity}× {item.title}</span>
                        <span>{fmtPrice(item.unit_price * item.quantity, currency)}</span>
                    </div>
                ))}

                {isRefund && refund!.items.map((item, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '1px 0',
                        }}
                    >
                        <span>{item.title}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
                        <span>-{fmtPrice(item.amount, currency)}</span>
                    </div>
                ))}

                {/* separator */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                {/* ── Totals ── */}
                {isSale && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{labels['panel.pos.subtotal'] || 'Subtotal'}</span>
                            <span>{fmtPrice(sale.subtotal, currency)}</span>
                        </div>
                        {sale.discount_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{labels['panel.pos.discount'] || 'Descuento'}</span>
                                <span>-{fmtPrice(sale.discount_amount, currency)}</span>
                            </div>
                        )}
                        {sale.tax_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{labels['panel.pos.tax'] || 'IVA'}</span>
                                <span>{fmtPrice(sale.tax_amount, currency)}</span>
                            </div>
                        )}
                        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>{labels['panel.pos.total'] || 'TOTAL'}</span>
                            <span>{fmtPrice(sale.total, currency)}</span>
                        </div>
                    </div>
                )}

                {isRefund && (
                    <div>
                        {refund!.reason && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                <span>{labels['panel.pos.refundReason'] || 'Motivo'}</span>
                                <span>{refund!.reason}</span>
                            </div>
                        )}
                        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>{labels['panel.pos.total'] || 'TOTAL'}</span>
                            <span>-{fmtPrice(refund!.total_refund, currency)}</span>
                        </div>
                    </div>
                )}

                {/* separator */}
                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                {/* ── Payment method ── */}
                {isSale && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span>{labels['panel.pos.paymentMethod'] || 'Método'}</span>
                        <span>{paymentMethodLabel(sale.payment_method, labels)}</span>
                    </div>
                )}

                {isSale && sale.customer_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span>{labels['panel.pos.customer'] || 'Cliente'}</span>
                        <span>{sale.customer_name}</span>
                    </div>
                )}

                {/* separator */}
                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                {/* ── QR Code ── */}
                {showQR && (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                        <QRCodeSVG
                            value={`receipt:${orderId}:${isSale ? sale.total : refund!.total_refund}`}
                            size={100}
                            level="M"
                            includeMargin={false}
                        />
                        <div style={{ fontSize: '8px', marginTop: '2px', opacity: 0.6 }}>
                            Recibo digital
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
                    {labels['panel.pos.thankYou'] || '¡Gracias por su compra!'}
                </div>
                {business.email && (
                    <div style={{ textAlign: 'center', fontSize: '8px', opacity: 0.6, marginTop: '2px' }}>
                        {business.email}
                    </div>
                )}
            </div>
        )
    }
)

export default PrintableReceipt
