'use client'

import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceItem {
    title: string
    variantTitle?: string
    quantity: number
    unitPrice: number
    lineTotal: number
}

export interface InvoiceData {
    orderNumber: string
    orderDate: string
    customerName: string
    customerEmail: string
    shippingAddress?: {
        line1: string
        line2?: string
        city: string
        postalCode: string
        country: string
        phone?: string
    }
    items: InvoiceItem[]
    subtotal: number
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    total: number
    currency: string
    locale: string
    // Tenant branding
    storeName: string
    storeAddress?: string
    storeEmail?: string
    storePhone?: string
    storeVat?: string
}

// ---------------------------------------------------------------------------
// Font setup
// ---------------------------------------------------------------------------

Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf', fontWeight: 700 },
    ],
})

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const brandColor = '#2D5016'

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Inter',
        fontSize: 10,
        padding: 40,
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: brandColor,
    },
    storeName: {
        fontSize: 20,
        fontWeight: 700,
        color: brandColor,
    },
    storeDetails: {
        fontSize: 8,
        color: '#666',
        marginTop: 4,
        lineHeight: 1.4,
    },
    invoiceLabel: {
        fontSize: 24,
        fontWeight: 700,
        color: '#999',
        textAlign: 'right',
    },
    invoiceMeta: {
        fontSize: 9,
        color: '#666',
        textAlign: 'right',
        marginTop: 4,
        lineHeight: 1.4,
    },

    // Bill to
    billToSection: {
        flexDirection: 'row',
        gap: 40,
        marginBottom: 25,
    },
    billToBlock: {
        flex: 1,
    },
    sectionLabel: {
        fontSize: 8,
        fontWeight: 600,
        color: brandColor,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    billToText: {
        fontSize: 9,
        color: '#333',
        lineHeight: 1.5,
    },

    // Table
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: brandColor,
        padding: '8 12',
        borderRadius: 4,
    },
    tableHeaderText: {
        color: '#ffffff',
        fontSize: 8,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        padding: '8 12',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableRowAlt: {
        backgroundColor: '#fafafa',
    },
    colDescription: { flex: 4 },
    colQty: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 2, textAlign: 'right' },
    colTotal: { flex: 2, textAlign: 'right' },
    cellText: {
        fontSize: 9,
        color: '#333',
    },
    cellSubtext: {
        fontSize: 7,
        color: '#888',
        marginTop: 2,
    },

    // Totals
    totalsSection: {
        marginTop: 20,
        marginLeft: 'auto',
        width: 220,
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '4 0',
    },
    totalsLabel: {
        fontSize: 9,
        color: '#666',
    },
    totalsValue: {
        fontSize: 9,
        color: '#333',
    },
    totalsDivider: {
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        marginVertical: 4,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '8 0',
        borderTopWidth: 2,
        borderTopColor: brandColor,
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1a1a1a',
    },
    grandTotalValue: {
        fontSize: 12,
        fontWeight: 700,
        color: brandColor,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 7,
        color: '#aaa',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
})

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string, locale: string): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2,
        }).format(amount / 100)
    } catch {
        return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoicePDF({ data }: { data: InvoiceData }) {
    const fmt = (amount: number) => formatCurrency(amount, data.currency, data.locale)

    const labels = data.locale.startsWith('es')
        ? {
            invoice: 'FACTURA',
            order: 'Pedido',
            date: 'Fecha',
            billTo: 'Facturar a',
            shipTo: 'Enviar a',
            item: 'Artículo',
            qty: 'Cant.',
            price: 'Precio',
            total: 'Total',
            subtotal: 'Subtotal',
            shipping: 'Envío',
            tax: 'Impuestos',
            discount: 'Descuento',
            grandTotal: 'TOTAL',
            footer: 'Gracias por su compra',
        }
        : {
            invoice: 'INVOICE',
            order: 'Order',
            date: 'Date',
            billTo: 'Bill to',
            shipTo: 'Ship to',
            item: 'Item',
            qty: 'Qty',
            price: 'Price',
            total: 'Total',
            subtotal: 'Subtotal',
            shipping: 'Shipping',
            tax: 'Tax',
            discount: 'Discount',
            grandTotal: 'TOTAL',
            footer: 'Thank you for your purchase',
        }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.storeName}>{data.storeName}</Text>
                        <Text style={styles.storeDetails}>
                            {[data.storeAddress, data.storeEmail, data.storePhone, data.storeVat && `VAT: ${data.storeVat}`]
                                .filter(Boolean)
                                .join('\n')}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.invoiceLabel}>{labels.invoice}</Text>
                        <Text style={styles.invoiceMeta}>
                            {labels.order}: #{data.orderNumber}{'\n'}
                            {labels.date}: {data.orderDate}
                        </Text>
                    </View>
                </View>

                {/* Bill To / Ship To */}
                <View style={styles.billToSection}>
                    <View style={styles.billToBlock}>
                        <Text style={styles.sectionLabel}>{labels.billTo}</Text>
                        <Text style={styles.billToText}>
                            {data.customerName}{'\n'}
                            {data.customerEmail}
                        </Text>
                    </View>
                    {data.shippingAddress && (
                        <View style={styles.billToBlock}>
                            <Text style={styles.sectionLabel}>{labels.shipTo}</Text>
                            <Text style={styles.billToText}>
                                {data.shippingAddress.line1}
                                {data.shippingAddress.line2 ? `\n${data.shippingAddress.line2}` : ''}
                                {'\n'}{data.shippingAddress.postalCode} {data.shippingAddress.city}
                                {'\n'}{data.shippingAddress.country}
                                {data.shippingAddress.phone ? `\n${data.shippingAddress.phone}` : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Items table */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colDescription]}>{labels.item}</Text>
                    <Text style={[styles.tableHeaderText, styles.colQty]}>{labels.qty}</Text>
                    <Text style={[styles.tableHeaderText, styles.colPrice]}>{labels.price}</Text>
                    <Text style={[styles.tableHeaderText, styles.colTotal]}>{labels.total}</Text>
                </View>
                {data.items.map((item, idx) => (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                        <View style={styles.colDescription}>
                            <Text style={styles.cellText}>{item.title}</Text>
                            {item.variantTitle && item.variantTitle !== 'Default' && (
                                <Text style={styles.cellSubtext}>{item.variantTitle}</Text>
                            )}
                        </View>
                        <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
                        <Text style={[styles.cellText, styles.colPrice]}>{fmt(item.unitPrice)}</Text>
                        <Text style={[styles.cellText, styles.colTotal]}>{fmt(item.lineTotal)}</Text>
                    </View>
                ))}

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>{labels.subtotal}</Text>
                        <Text style={styles.totalsValue}>{fmt(data.subtotal)}</Text>
                    </View>
                    {data.shippingTotal > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>{labels.shipping}</Text>
                            <Text style={styles.totalsValue}>{fmt(data.shippingTotal)}</Text>
                        </View>
                    )}
                    {data.taxTotal > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>{labels.tax}</Text>
                            <Text style={styles.totalsValue}>{fmt(data.taxTotal)}</Text>
                        </View>
                    )}
                    {data.discountTotal > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>{labels.discount}</Text>
                            <Text style={{ ...styles.totalsValue, color: '#16a34a' }}>-{fmt(data.discountTotal)}</Text>
                        </View>
                    )}
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>{labels.grandTotal}</Text>
                        <Text style={styles.grandTotalValue}>{fmt(data.total)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {labels.footer} • {data.storeName}
                    {data.storeVat ? ` • VAT: ${data.storeVat}` : ''}
                </Text>
            </Page>
        </Document>
    )
}
