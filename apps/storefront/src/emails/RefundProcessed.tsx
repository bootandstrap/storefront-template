import { Heading, Text, Section, Hr } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    amount?: string
    currency?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function RefundProcessed({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    amount = '89.90',
    currency = 'EUR',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Reembolso de ${currency} ${amount}`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>💰 Reembolso procesado</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Tu reembolso de <strong>{currency} {amount}</strong> ha sido procesado
                {orderId ? ` para el pedido #${orderId}` : ''}.
            </Text>
            <Section style={infoBox}>
                <Text style={infoIcon}>💳</Text>
                <Text style={infoText}>
                    El reembolso puede tardar 5-10 días laborables en aparecer en tu estado de cuenta.
                </Text>
            </Section>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const infoBox: React.CSSProperties = { backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '20px', margin: '20px 0', borderLeft: '4px solid #22c55e' }
const infoIcon: React.CSSProperties = { fontSize: '20px', margin: '0 0 4px' }
const infoText: React.CSSProperties = { color: '#166534', fontSize: '14px', margin: 0, lineHeight: '1.6' }
