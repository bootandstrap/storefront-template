import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    itemCount?: string
    cartUrl?: string
    expiresIn?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function AbandonedCart({
    customerName = 'Cliente',
    itemCount = '3 artículos',
    cartUrl = 'https://tienda.ejemplo.com/carrito',
    expiresIn = '48 horas',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview={`Tienes ${itemCount} esperando en tu carrito`} storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>🛒 ¡Te dejaste algo!</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Tienes <strong>{itemCount}</strong> esperando en tu carrito en{' '}
                <strong>{storeName}</strong>. No dejes que se te escapen.
            </Text>
            {cartUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={cartUrl} style={{ ...btn, backgroundColor: brandColor }}>Completar pedido →</Button>
                </Section>
            )}
            <Section style={timerBox}>
                <Text style={timerText}>
                    ⏰ Tu carrito se guardará durante {expiresIn}
                </Text>
            </Section>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const timerBox: React.CSSProperties = { backgroundColor: '#f7f8fa', borderRadius: '10px', padding: '14px', marginTop: '24px', textAlign: 'center' as const, border: '1px solid #eef0f3' }
const timerText: React.CSSProperties = { color: '#6b7280', fontSize: '13px', margin: 0 }
