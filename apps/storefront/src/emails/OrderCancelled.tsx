import { Heading, Text, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    reason?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function OrderCancelled({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    reason = 'Stock no disponible',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Pedido #${orderId} cancelado`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>❌ Pedido cancelado</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>Lamentamos informarte que tu pedido <strong>#{orderId}</strong> ha sido cancelado.</Text>
            {reason && (
                <Section style={reasonBox}>
                    <Text style={reasonLabel}>Motivo</Text>
                    <Text style={reasonText}>{reason}</Text>
                </Section>
            )}
            <Text style={text}>Si tienes preguntas, no dudes en contactarnos.</Text>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const reasonBox: React.CSSProperties = { backgroundColor: '#fef2f2', borderRadius: '12px', padding: '20px', margin: '20px 0', borderLeft: '4px solid #ef4444' }
const reasonLabel: React.CSSProperties = { color: '#b91c1c', fontSize: '11px', fontWeight: 600, margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const reasonText: React.CSSProperties = { color: '#7f1d1d', fontSize: '15px', fontWeight: 500, margin: '4px 0 0' }
