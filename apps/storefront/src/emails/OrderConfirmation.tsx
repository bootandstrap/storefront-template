import { Heading, Text, Button, Section, Hr } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    total?: string
    currency?: string
    orderUrl?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function OrderConfirmation({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    total = '89.90',
    currency = 'EUR',
    orderUrl = 'https://tienda.ejemplo.com/pedidos/BNS-2847',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Pedido #${orderId} confirmado`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>🎉 ¡Pedido confirmado!</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>Gracias por tu pedido. Lo estamos preparando con mucho cuidado.</Text>
            <Section style={detailBox}>
                <Text style={detailLabel}>Pedido</Text>
                <Text style={detailValue}>#{orderId}</Text>
                <Hr style={hr} />
                <Text style={detailLabel}>Total</Text>
                <Text style={detailValue}>{currency} {total}</Text>
            </Section>
            {orderUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={orderUrl} style={{ ...btn, backgroundColor: brandColor }}>Ver pedido →</Button>
                </Section>
            )}
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const detailBox: React.CSSProperties = { backgroundColor: '#f7f8fa', borderRadius: '12px', padding: '20px', margin: '20px 0', border: '1px solid #eef0f3' }
const detailLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue: React.CSSProperties = { color: '#111827', fontSize: '20px', fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.3px' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '14px 0' }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
