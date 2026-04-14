import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    trackingUrl?: string
    carrier?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function OrderShipped({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    trackingUrl = 'https://tracking.ejemplo.com/BNS-2847',
    carrier = 'SEUR',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Pedido #${orderId} enviado`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>📦 ¡Tu pedido está en camino!</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Tu pedido <strong>#{orderId}</strong> ha sido enviado{carrier ? ` con ${carrier}` : ''}.
                Pronto lo tendrás en tus manos.
            </Text>
            {trackingUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={trackingUrl} style={{ ...btn, backgroundColor: brandColor }}>Seguir envío →</Button>
                </Section>
            )}
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
