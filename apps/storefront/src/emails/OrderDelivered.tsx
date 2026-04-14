import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    orderId?: string
    reviewUrl?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function OrderDelivered({
    customerName = 'Cliente',
    orderId = 'BNS-2847',
    reviewUrl = 'https://tienda.ejemplo.com/resena/BNS-2847',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Pedido #${orderId} entregado`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>✅ ¡Pedido entregado!</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Tu pedido <strong>#{orderId}</strong> ha sido entregado. ¡Esperamos que lo disfrutes!
            </Text>
            {reviewUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={reviewUrl} style={{ ...btn, backgroundColor: brandColor }}>Dejar una reseña ⭐</Button>
                </Section>
            )}
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
