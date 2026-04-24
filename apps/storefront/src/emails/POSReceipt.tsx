import { Heading, Text, Section, Hr, Row, Column } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface POSReceiptItem {
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number
}

interface Props {
    receiptNumber?: string
    items?: POSReceiptItem[]
    subtotal?: string
    discount?: string
    tax?: string
    total?: string
    currency?: string
    paymentMethod?: string
    cashierName?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    receiptHeader?: string
    receiptFooter?: string
    date?: string
    Layout?: LayoutComponent
}

export default function POSReceipt({
    receiptNumber = 'POS-0001',
    items = [
        { title: 'Producto ejemplo', quantity: 2, unit_price: 1500 },
        { title: 'Otro producto', variant_title: 'M / Azul', quantity: 1, unit_price: 2500 },
    ],
    subtotal = '55.00',
    discount,
    tax = '4.40',
    total = '59.40',
    currency = 'CHF',
    paymentMethod = 'Efectivo',
    cashierName,
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    receiptHeader,
    receiptFooter,
    date,
    Layout = MinimalLayout,
}: Props) {
    const displayDate = date || new Date().toLocaleString('es', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

    return (
        <Layout preview={`Recibo POS #${receiptNumber}`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            {/* Header */}
            <Heading style={heading}>🧾 Recibo de compra</Heading>

            {receiptHeader && (
                <Text style={headerNote}>{receiptHeader}</Text>
            )}

            {/* Receipt details */}
            <Section style={metaBox}>
                <Row>
                    <Column><Text style={metaLabel}>Nº Recibo</Text></Column>
                    <Column align="right"><Text style={metaValue}>{receiptNumber}</Text></Column>
                </Row>
                <Row>
                    <Column><Text style={metaLabel}>Fecha</Text></Column>
                    <Column align="right"><Text style={metaValue}>{displayDate}</Text></Column>
                </Row>
                <Row>
                    <Column><Text style={metaLabel}>Pago</Text></Column>
                    <Column align="right"><Text style={metaValue}>{paymentMethod}</Text></Column>
                </Row>
                {cashierName && (
                    <Row>
                        <Column><Text style={metaLabel}>Atendido por</Text></Column>
                        <Column align="right"><Text style={metaValue}>{cashierName}</Text></Column>
                    </Row>
                )}
            </Section>

            <Hr style={hr} />

            {/* Line items */}
            <Section style={{ margin: '0' }}>
                {items.map((item, idx) => (
                    <Row key={idx} style={itemRow}>
                        <Column style={{ width: '70%' }}>
                            <Text style={itemTitle}>
                                {item.quantity}× {item.title}
                                {item.variant_title && (
                                    <span style={variantLabel}> — {item.variant_title}</span>
                                )}
                            </Text>
                        </Column>
                        <Column align="right">
                            <Text style={itemPrice}>
                                {currency} {((item.unit_price * item.quantity) / 100).toFixed(2)}
                            </Text>
                        </Column>
                    </Row>
                ))}
            </Section>

            <Hr style={hr} />

            {/* Totals */}
            <Section style={totalsBox}>
                <Row>
                    <Column><Text style={totalLabel}>Subtotal</Text></Column>
                    <Column align="right"><Text style={totalValue}>{currency} {subtotal}</Text></Column>
                </Row>
                {discount && (
                    <Row>
                        <Column><Text style={{ ...totalLabel, color: '#059669' }}>Descuento</Text></Column>
                        <Column align="right"><Text style={{ ...totalValue, color: '#059669' }}>-{currency} {discount}</Text></Column>
                    </Row>
                )}
                <Row>
                    <Column><Text style={totalLabel}>IVA</Text></Column>
                    <Column align="right"><Text style={totalValue}>{currency} {tax}</Text></Column>
                </Row>
                <Hr style={hr} />
                <Row>
                    <Column><Text style={grandTotalLabel}>Total</Text></Column>
                    <Column align="right"><Text style={{ ...grandTotalLabel, color: brandColor }}>{currency} {total}</Text></Column>
                </Row>
            </Section>

            {/* Footer note */}
            {receiptFooter && (
                <Text style={footerNote}>{receiptFooter}</Text>
            )}
            <Text style={thankYou}>¡Gracias por su compra!</Text>
        </Layout>
    )
}

// ── Styles ──
const heading: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 16px', letterSpacing: '-0.3px' }
const headerNote: React.CSSProperties = { color: '#6b7280', fontSize: '12px', textAlign: 'center' as const, margin: '0 0 16px', fontStyle: 'italic' }
const metaBox: React.CSSProperties = { backgroundColor: '#f9fafb', borderRadius: '10px', padding: '14px 16px', margin: '0 0 6px' }
const metaLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '2px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const metaValue: React.CSSProperties = { color: '#374151', fontSize: '13px', fontWeight: 600, margin: '2px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '12px 0' }
const itemRow: React.CSSProperties = { borderBottom: '1px solid #f3f4f6', padding: '6px 0' }
const itemTitle: React.CSSProperties = { color: '#111827', fontSize: '13px', fontWeight: 500, margin: '0', lineHeight: '1.4' }
const variantLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '11px', fontWeight: 400 }
const itemPrice: React.CSSProperties = { color: '#374151', fontSize: '13px', fontWeight: 600, margin: '0' }
const totalsBox: React.CSSProperties = { padding: '4px 0' }
const totalLabel: React.CSSProperties = { color: '#6b7280', fontSize: '12px', fontWeight: 500, margin: '3px 0' }
const totalValue: React.CSSProperties = { color: '#374151', fontSize: '13px', fontWeight: 600, margin: '3px 0' }
const grandTotalLabel: React.CSSProperties = { color: '#111827', fontSize: '18px', fontWeight: 700, margin: '4px 0', letterSpacing: '-0.3px' }
const footerNote: React.CSSProperties = { color: '#9ca3af', fontSize: '11px', textAlign: 'center' as const, margin: '16px 0 4px', fontStyle: 'italic' }
const thankYou: React.CSSProperties = { color: '#6b7280', fontSize: '13px', textAlign: 'center' as const, margin: '16px 0 0', fontWeight: 500 }
