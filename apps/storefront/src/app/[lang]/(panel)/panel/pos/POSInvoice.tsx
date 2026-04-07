'use client'

/**
 * POSInvoice — Professional A4 invoice template
 *
 * Full-page A4 invoice with:
 * - Business logo + header info
 * - Table with columns: Item, Qty, Unit Price, Total
 * - Tax breakdown row
 * - QR code for digital verification
 * - Footer with business registration info
 *
 * Print via `useReactToPrint` targeting this component's ref.
 */

import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { POSSale } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'

interface BusinessInfo {
    name: string
    address?: string
    nif?: string
    phone?: string
    email?: string
    logoUrl?: string | null
}

interface POSInvoiceProps {
    sale: POSSale
    business: BusinessInfo
    invoiceNumber?: string
    labels: Record<string, string>
}

function fmtPrice(amount: number, currency: string): string {
    return formatPOSCurrency(amount, currency)
}

function fmtDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const POSInvoice = forwardRef<HTMLDivElement, POSInvoiceProps>(
    function POSInvoice({ sale, business, invoiceNumber, labels }, ref) {
        const currency = sale.currency_code
        const orderRef = sale.draft_order_id?.slice(-6) || sale.order_id?.slice(-6) || '------'
        const invNumber = invoiceNumber || `INV-${orderRef}`

        return (
            <div
                ref={ref}
                className="print-invoice-container"
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '210mm',
                    minHeight: '297mm',
                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#1a1a1a',
                    background: '#fff',
                    padding: '15mm 20mm',
                    boxSizing: 'border-box',
                }}
            >
                {/* Print styles */}
                <style>{`
                    @media print {
                        @page {
                            margin: 15mm;
                            size: A4;
                        }
                        body * { visibility: hidden !important; }
                        .print-invoice-container,
                        .print-invoice-container * {
                            visibility: visible !important;
                        }
                        .print-invoice-container {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                        }
                    }
                `}</style>

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>
                            {business.name}
                        </div>
                        {business.address && (
                            <div style={{ fontSize: '11px', color: '#666' }}>{business.address}</div>
                        )}
                        {business.nif && (
                            <div style={{ fontSize: '11px', color: '#666' }}>{posLabel('panel.pos.nif', labels)}: {business.nif}</div>
                        )}
                        {business.phone && (
                            <div style={{ fontSize: '11px', color: '#666' }}>{posLabel('panel.pos.tel', labels)}: {business.phone}</div>
                        )}
                        {business.email && (
                            <div style={{ fontSize: '11px', color: '#666' }}>{business.email}</div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#333',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                        }}>
                            {labels['panel.pos.invoice'] || 'Factura'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                            <strong>Nº:</strong> {invNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                            <strong>{labels['panel.pos.date'] || 'Fecha'}:</strong> {fmtDate(sale.created_at)}
                        </div>
                    </div>
                </div>

                {/* ── Customer info ── */}
                {sale.customer_name && (
                    <div style={{
                        background: '#f8f8f8',
                        borderRadius: '4px',
                        padding: '10px 14px',
                        marginBottom: '20px',
                        fontSize: '11px',
                    }}>
                        <strong>{labels['panel.pos.customer'] || 'Cliente'}:</strong> {sale.customer_name}
                    </div>
                )}

                {/* ── Items table ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #111' }}>
                            <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '11px', fontWeight: '600' }}>
                                {labels['panel.pos.product'] || 'Producto'}
                            </th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '11px', fontWeight: '600', width: '60px' }}>
                                {labels['panel.pos.qty'] || 'Cant.'}
                            </th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: '600', width: '100px' }}>
                                {labels['panel.pos.unitPrice'] || 'P. Unit.'}
                            </th>
                            <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '11px', fontWeight: '600', width: '100px' }}>
                                {labels['panel.pos.total'] || 'Total'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px 0', fontSize: '11px' }}>
                                    {item.title}
                                    {item.variant_title && (
                                        <span style={{ color: '#888', fontSize: '10px', marginLeft: '4px' }}>
                                            ({item.variant_title})
                                        </span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'center', padding: '8px', fontSize: '11px' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px', fontSize: '11px' }}>
                                    {fmtPrice(item.unit_price, currency)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', fontWeight: '500' }}>
                                    {fmtPrice(item.unit_price * item.quantity, currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Totals ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
                            <span>{labels['panel.pos.subtotal'] || 'Subtotal'}</span>
                            <span>{fmtPrice(sale.subtotal, currency)}</span>
                        </div>
                        {sale.discount_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', color: '#16a34a' }}>
                                <span>{labels['panel.pos.discount'] || 'Descuento'}</span>
                                <span>-{fmtPrice(sale.discount_amount, currency)}</span>
                            </div>
                        )}
                        {sale.tax_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', color: '#666' }}>
                                <span>{labels['panel.pos.tax'] || 'IVA'}</span>
                                <span>{fmtPrice(sale.tax_amount, currency)}</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderTop: '2px solid #111',
                            marginTop: '4px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                        }}>
                            <span>{labels['panel.pos.total'] || 'TOTAL'}</span>
                            <span>{fmtPrice(sale.total, currency)}</span>
                        </div>
                    </div>
                </div>

                {/* ── Payment + QR ── */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    paddingTop: '16px',
                    borderTop: '1px solid #eee',
                }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        <div>
                            <strong>{labels['panel.pos.paymentMethod'] || 'Método de pago'}:</strong>{' '}
                            {sale.payment_method === 'cash' ? (labels['panel.pos.cash'] || 'Efectivo') :
                             sale.payment_method === 'card_terminal' ? (labels['panel.pos.cardTerminal'] || 'Tarjeta') :
                             sale.payment_method === 'manual_card' ? (labels['panel.pos.manualCard'] || 'Tarjeta (manual)') :
                             (labels['panel.pos.other'] || 'Otro')}
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '10px', color: '#999' }}>
                            {labels['panel.pos.thankYou'] || '¡Gracias por su compra!'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <QRCodeSVG
                            value={`invoice:${invNumber}:${sale.total}`}
                            size={80}
                            level="M"
                            includeMargin={false}
                        />
                        <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>
                            {posLabel('panel.pos.digitalVerification', labels)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)

export default POSInvoice
