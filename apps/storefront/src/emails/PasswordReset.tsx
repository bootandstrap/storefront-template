import { Heading, Text, Button, Section } from '@react-email/components'
import MinimalLayout from './layouts/MinimalLayout'
import type { LayoutComponent } from './layouts/types'
import * as React from 'react'

interface Props {
    customerName?: string
    resetUrl?: string
    expiresIn?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    Layout?: LayoutComponent
}

export default function PasswordReset({
    customerName = 'Cliente',
    resetUrl = 'https://tienda.ejemplo.com/reset/tk_a8f3b2c1',
    expiresIn = '1 hora',
    storeName = 'Store',
    storeUrl = 'https://tienda.ejemplo.com',
    logoUrl,
    brandColor = '#2D5016',
    Layout = MinimalLayout,
}: Props) {
    return (
        <Layout preview="Restablecer contraseña" storeName={storeName} storeUrl={storeUrl} logoUrl={logoUrl} brandColor={brandColor}>
            <Heading style={heading}>🔑 Restablecer contraseña</Heading>
            <Text style={text}>Hola {customerName},</Text>
            <Text style={text}>
                Has solicitado restablecer tu contraseña. Haz clic en el botón para crear una nueva.
            </Text>
            {resetUrl && (
                <Section style={{ textAlign: 'center' as const, marginTop: '28px' }}>
                    <Button href={resetUrl} style={{ ...btn, backgroundColor: brandColor }}>Restablecer contraseña →</Button>
                </Section>
            )}
            <Section style={disclaimerBox}>
                <Text style={disclaimerText}>
                    🔒 Si no solicitaste esto, puedes ignorar este email. El enlace expira en {expiresIn}.
                </Text>
            </Section>
        </Layout>
    )
}

const heading: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#111', textAlign: 'center' as const, margin: '0 0 20px', letterSpacing: '-0.3px' }
const text: React.CSSProperties = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }
const btn: React.CSSProperties = { color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const disclaimerBox: React.CSSProperties = { backgroundColor: '#f7f8fa', borderRadius: '10px', padding: '16px', marginTop: '28px', border: '1px solid #eef0f3' }
const disclaimerText: React.CSSProperties = { color: '#6b7280', fontSize: '13px', margin: 0, lineHeight: '1.6' }
