/**
 * Brand Layout — Basic tier (15 CHF/mo)
 *
 * Polished branded emails inspired by Stripe/Linear.
 * Full-width brand header with gradient, smart logo placement,
 * decorative accents, and professional branded footer.
 * Zone: 🟢 GREEN — BootandStrap-provided design
 */

import {
    Html, Head, Body, Container, Section, Text, Img, Hr,
    Preview, Font, Row, Column, Link,
} from '@react-email/components'
import * as React from 'react'
import type { LayoutProps } from './types'

export default function BrandLayout({
    preview,
    storeName = 'Store',
    storeUrl = '',
    logoUrl,
    brandColor = '#2D5016',
    children,
}: LayoutProps) {
    const lighter = adjustBrightness(brandColor, 15)
    const darker = adjustBrightness(brandColor, -15)
    const veryLight = adjustBrightness(brandColor, 85)
    const accentFaint = hexToRgba(brandColor, 0.06)
    const accentMedium = hexToRgba(brandColor, 0.1)

    return (
        <Html lang="es">
            <Head>
                <Font
                    fontFamily="Inter"
                    fallbackFontFamily="Helvetica"
                    webFont={{
                        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
                        format: 'woff2',
                    }}
                />
            </Head>
            {preview && <Preview>{preview}</Preview>}
            <Body style={body}>
                <Container style={container}>
                    {/* ━━ Brand Header ━━ */}
                    <Section style={{
                        ...headerGradient,
                        background: `linear-gradient(135deg, ${darker} 0%, ${brandColor} 40%, ${lighter} 100%)`,
                    }}>
                        {/* Decorative circles overlay */}
                        <Section style={{
                            position: 'relative' as const,
                        }}>
                            {logoUrl ? (
                                <Img
                                    src={logoUrl}
                                    alt={storeName}
                                    width={140}
                                    height={44}
                                    style={logoStyle}
                                />
                            ) : (
                                <Text style={brandNameText}>{storeName}</Text>
                            )}
                        </Section>
                    </Section>

                    {/* ━━ Accent stripe ━━ */}
                    <Section style={{
                        ...accentStripe,
                        background: `linear-gradient(90deg, ${brandColor}, ${lighter}, ${brandColor})`,
                    }} />

                    {/* ━━ Content Card ━━ */}
                    <Section style={card}>
                        {children}
                    </Section>

                    {/* ━━ Branded Footer ━━ */}
                    <Section style={{
                        ...footerWrap,
                        backgroundColor: veryLight,
                        borderTop: `1px solid ${accentMedium}`,
                    }}>
                        {/* Brand dot + name */}
                        <Row>
                            <Column align="center">
                                <Section style={{ textAlign: 'center' as const }}>
                                    <Text style={{
                                        ...footerBrandDot,
                                        backgroundColor: brandColor,
                                    }}>{'  '}</Text>
                                </Section>
                                <Text style={footerStoreName}>{storeName}</Text>
                                {storeUrl && (
                                    <Link href={storeUrl} style={{
                                        ...footerLink,
                                        color: brandColor,
                                    }}>
                                        {storeUrl.replace(/^https?:\/\//, '')}
                                    </Link>
                                )}
                            </Column>
                        </Row>
                        <Hr style={{
                            ...footerDivider,
                            borderTopColor: accentMedium,
                        }} />
                        <Text style={footerCopy}>
                            © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
                        </Text>
                    </Section>

                    {/* ━━ Bottom rounded corners ━━ */}
                    <Section style={{
                        ...bottomRadius,
                        background: `linear-gradient(135deg, ${darker} 0%, ${brandColor} 100%)`,
                    }} />
                </Container>
            </Body>
        </Html>
    )
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100)))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100)))
    const b = Math.min(255, Math.max(0, (num & 0xFF) + Math.round(255 * percent / 100)))
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 0xFF
    const g = (num >> 8) & 0xFF
    const b = num & 0xFF
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---------------------------------------------------------------------------
// Styles — Premium Brand Design
// ---------------------------------------------------------------------------

const body: React.CSSProperties = {
    backgroundColor: '#f0f1f3',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
    WebkitTextSizeAdjust: '100%',
}

const container: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 16px',
}

const headerGradient: React.CSSProperties = {
    padding: '36px 40px',
    borderRadius: '16px 16px 0 0',
    textAlign: 'center' as const,
}

const logoStyle: React.CSSProperties = {
    margin: '0 auto',
    display: 'block',
}

const brandNameText: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    margin: 0,
    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
}

const accentStripe: React.CSSProperties = {
    height: '3px',
    margin: 0,
    padding: 0,
}

const card: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '40px 36px',
}

const footerWrap: React.CSSProperties = {
    padding: '28px 36px',
    textAlign: 'center' as const,
}

const footerBrandDot: React.CSSProperties = {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    margin: '0 auto 8px',
}

const footerStoreName: React.CSSProperties = {
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px',
    textAlign: 'center' as const,
}

const footerLink: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    display: 'block',
    textAlign: 'center' as const,
}

const footerDivider: React.CSSProperties = {
    borderTop: '1px solid',
    margin: '16px 0',
}

const footerCopy: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
}

const bottomRadius: React.CSSProperties = {
    height: '6px',
    borderRadius: '0 0 16px 16px',
}
