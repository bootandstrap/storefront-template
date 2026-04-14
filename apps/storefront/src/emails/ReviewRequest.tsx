import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    daysAgo?: string
    reviewUrl?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function ReviewRequest({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    daysAgo = 'hace 3 días',
    reviewUrl = 'https://tienda.ejemplo.com/resena/BNS-2847',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`¿Qué tal tu pedido #${orderId}?`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>⭐ ¿Qué tal tu pedido?</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Tu pedido <strong>#{orderId}</strong> fue entregado {daysAgo}. ¡Nos encantaría conocer tu opinión!
            </Text>
            <Section style={starsBox}>
                <Text style={starsText}>★ ★ ★ ★ ★</Text>
            </Section>
            {reviewUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
                    <Button href={reviewUrl} style={{ ...btn, backgroundColor: brandColor }}>Dejar reseña →</Button>
                </Section>
            )}
            <Text style={disclaimer}>
                Tu reseña ayuda a otros clientes y nos ayuda a mejorar.
            </Text>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const starsBox: React.CSSProperties = { textAlign: 'center' as const, padding: '16px 0', margin: '16px 0' }
const starsText: React.CSSProperties = { fontSize: '32px', color: '#fbbf24', letterSpacing: '4px', margin: 0 }
const disclaimer: React.CSSProperties = { color: '#9ca3af', fontSize: '13px', marginTop: '24px', textAlign: 'center' as const }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
