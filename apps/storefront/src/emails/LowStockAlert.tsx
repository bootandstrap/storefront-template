import { Heading, Text, Section, Hr } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    title?: string
    sku?: string
    availableStock?: number
    outOfStock?: boolean
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function LowStockAlert({
    title = 'Aceite de Oliva Premium 500ml',
    sku = 'AOL-500-PRE',
    availableStock = 3,
    outOfStock = false,
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Stock bajo: ${title}`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>📉 Alerta de stock {outOfStock ? 'agotado' : 'bajo'}</Heading>
            <Text style={text}>
                El siguiente producto {outOfStock ? 'está <strong>AGOTADO</strong>' : 'tiene stock bajo'}:
            </Text>
            <Section style={detailBox}>
                <Text style={detailLabel}>Producto</Text>
                <Text style={detailValue}>{title}</Text>
                {sku && (
                    <>
                        <Hr style={hr} />
                        <Text style={detailLabel}>SKU</Text>
                        <Text style={{ ...detailValueSmall }}>{sku}</Text>
                    </>
                )}
                <Hr style={hr} />
                <Text style={detailLabel}>Stock disponible</Text>
                <Text style={{
                    ...stockValue,
                    color: outOfStock ? '#dc2626' : '#f59e0b',
                    backgroundColor: outOfStock ? '#fef2f2' : '#fffbeb',
                }}>
                    {availableStock} {availableStock === 1 ? 'unidad' : 'unidades'}
                </Text>
            </Section>
            <Text style={text}>Considera reabastecer este artículo para no perder ventas.</Text>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const detailBox: React.CSSProperties = { backgroundColor: '#f7f8fa', borderRadius: '12px', padding: '20px', margin: '20px 0', border: '1px solid #eef0f3' }
const detailLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue: React.CSSProperties = { color: '#111827', fontSize: '18px', fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.2px' }
const detailValueSmall: React.CSSProperties = { color: '#6b7280', fontSize: '15px', fontWeight: 500, margin: '2px 0 0', fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '14px 0' }
const stockValue: React.CSSProperties = { fontSize: '22px', fontWeight: 800, margin: '4px 0 0', display: 'inline-block', padding: '4px 12px', borderRadius: '8px' }
