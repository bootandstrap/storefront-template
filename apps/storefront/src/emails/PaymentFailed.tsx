import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    reason?: string
    retryUrl?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function PaymentFailed({
    customerName = 'Cliente',
    reason = 'Tarjeta rechazada por el banco emisor',
    retryUrl = 'https://tienda.ejemplo.com/checkout/reintentar',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview="Pago no procesado" storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>⚠️ Pago no procesado</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>No hemos podido procesar tu pago. Por favor, inténtalo de nuevo o usa otro método de pago.</Text>
            {reason && (
                <Section style={reasonBox}>
                    <Text style={reasonLabel}>Motivo</Text>
                    <Text style={reasonText}>{reason}</Text>
                </Section>
            )}
            {retryUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={retryUrl} style={btn}>Reintentar pago →</Button>
                </Section>
            )}
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const reasonBox: React.CSSProperties = { backgroundColor: '#fffbeb', borderRadius: '12px', padding: '20px', margin: '20px 0', borderLeft: '4px solid #f59e0b' }
const reasonLabel: React.CSSProperties = { color: '#92400e', fontSize: '11px', fontWeight: 600, margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const reasonText: React.CSSProperties = { color: '#78350f', fontSize: '15px', fontWeight: 500, margin: '4px 0 0' }
const btn: React.CSSProperties = { backgroundColor: '#dc2626', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
