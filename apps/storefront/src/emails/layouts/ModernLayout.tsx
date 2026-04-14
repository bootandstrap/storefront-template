/**
 * Modern Layout — Pro tier (30 CHF/mo)
 *
 * Ultra-premium dark-mode email design inspired by Arc/Raycast/Vercel.
 * Features: full-bleed gradient hero, floating glass card, luminous
 * accent system, rich footer with social placeholders, and progressive
 * enhancement with color-scheme meta for native dark mode.
 *
 * Zone: 🟢 GREEN — BootandStrap-provided design
 */

import {
    Html, Head, Body, Container, Section, Text, Img, Hr,
    Preview, Font, Row, Column, Link,
} from '@react-email/components'
import * as React from 'react'
import type { LayoutProps } from './types'

export default function ModernLayout({
    preview,
    storeName = 'Store',
    storeUrl = '',
    logoUrl,
    brandColor = '#2D5016',
    children,
}: LayoutProps) {
    const lighter = adjustBrightness(brandColor, 30)
    const lightest = adjustBrightness(brandColor, 60)
    const darker = adjustBrightness(brandColor, -15)
    const glow = hexToRgba(brandColor, 0.15)
    const glowStrong = hexToRgba(brandColor, 0.25)
    const borderGlow = hexToRgba(brandColor, 0.2)
    const textAccent = adjustBrightness(brandColor, 50)

    return (
        <Html lang="es">
            <Head>
                <Font
                    fontFamily="Inter"
                    fallbackFontFamily="Helvetica"
                    webFont={{
                        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
                        format: 'woff2',
                    }}
                />
                <meta name="color-scheme" content="light dark" />
                <meta name="supported-color-schemes" content="light dark" />
            </Head>
            {preview && <Preview>{preview}</Preview>}
            <Body style={body}>
                {/* ━━ Gradient Hero Banner ━━ */}
                <Section style={{
                    ...heroBanner,
                    background: `linear-gradient(160deg, #0a0a0a 0%, ${hexToRgba(brandColor, 0.12)} 40%, #0a0a0a 70%, ${hexToRgba(brandColor, 0.08)} 100%)`,
                }}>
                    <Container style={heroInner}>
                        {/* Top bar with logo/name */}
                        <Section style={topBar}>
                            {logoUrl ? (
                                <Img
                                    src={logoUrl}
                                    alt={storeName}
                                    width={36}
                                    height={36}
                                    style={logoImg}
                                />
                            ) : (
                                <Text style={{
                                    ...logoTextStyle,
                                    color: textAccent,
                                }}>
                                    {storeName}
                                </Text>
                            )}
                        </Section>

                        {/* Decorative glow line */}
                        <Section style={{
                            ...glowLine,
                            background: `linear-gradient(90deg, transparent 0%, ${lighter} 30%, ${lightest} 50%, ${lighter} 70%, transparent 100%)`,
                        }} />
                    </Container>
                </Section>

                <Container style={mainContainer}>
                    {/* ━━ Floating Glass Card ━━ */}
                    <Section style={{
                        ...glassCard,
                        border: `1px solid ${borderGlow}`,
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 4px 32px ${glow}, 0 16px 64px rgba(0,0,0,0.5)`,
                    }}>
                        {/* Top accent bar inside card */}
                        <Section style={{
                            ...cardAccentBar,
                            background: `linear-gradient(90deg, ${brandColor}, ${lighter}, transparent)`,
                        }} />
                        
                        {children}
                    </Section>

                    {/* ━━ Rich Footer ━━ */}
                    <Section style={footerSection}>
                        <Hr style={{
                            ...footerDivider,
                            borderTopColor: hexToRgba(brandColor, 0.15),
                        }} />

                        {/* Brand identity */}
                        <Row>
                            <Column align="center">
                                {/* Brand pill */}
                                <Section style={{ textAlign: 'center' as const }}>
                                    <Text style={{
                                        ...brandPill,
                                        backgroundColor: hexToRgba(brandColor, 0.12),
                                        border: `1px solid ${hexToRgba(brandColor, 0.2)}`,
                                        color: textAccent,
                                    }}>
                                        {storeName}
                                    </Text>
                                </Section>
                            </Column>
                        </Row>

                        {storeUrl && (
                            <Text style={footerUrlText}>
                                <Link href={storeUrl} style={{
                                    ...footerLink,
                                    color: textAccent,
                                }}>
                                    {storeUrl.replace(/^https?:\/\//, '')}
                                </Link>
                            </Text>
                        )}

                        <Text style={footerCopy}>
                            © {new Date().getFullYear()} {storeName}
                        </Text>

                        {/* Powered by badge */}
                        <Section style={poweredBySection}>
                            <Text style={poweredByText}>
                                Powered by{' '}
                                <Link href="https://bootandstrap.com" style={{
                                    ...poweredByLink,
                                    color: textAccent,
                                }}>
                                    BootandStrap
                                </Link>
                            </Text>
                        </Section>
                    </Section>
                </Container>

                {/* ━━ Bottom gradient fade ━━ */}
                <Section style={{
                    ...bottomFade,
                    background: `linear-gradient(180deg, #0a0a0a 0%, ${hexToRgba(brandColor, 0.06)} 100%)`,
                }} />
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
// Styles — Ultra-Premium Dark Design
// ---------------------------------------------------------------------------

const body: React.CSSProperties = {
    backgroundColor: '#0a0a0a',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
    WebkitTextSizeAdjust: '100%',
    color: '#e5e5e5',
}

const heroBanner: React.CSSProperties = {
    width: '100%',
    padding: 0,
    margin: 0,
}

const heroInner: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 24px 0',
}

const topBar: React.CSSProperties = {
    textAlign: 'center' as const,
    paddingBottom: '24px',
}

const logoImg: React.CSSProperties = {
    margin: '0 auto',
    borderRadius: '10px',
    display: 'block',
}

const logoTextStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    margin: 0,
}

const glowLine: React.CSSProperties = {
    height: '1px',
    margin: '0 auto',
    width: '100%',
    opacity: 0.6,
}

const mainContainer: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px 16px 32px',
}

const glassCard: React.CSSProperties = {
    backgroundColor: '#141414',
    borderRadius: '20px',
    padding: '44px 40px',
    position: 'relative' as const,
}

const cardAccentBar: React.CSSProperties = {
    height: '3px',
    borderRadius: '3px',
    marginBottom: '32px',
    width: '48px',
}

const footerSection: React.CSSProperties = {
    padding: '8px 12px 0',
}

const footerDivider: React.CSSProperties = {
    borderTop: '1px solid',
    margin: '24px 0 24px',
}

const brandPill: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    margin: '0 auto 12px',
    textAlign: 'center' as const,
}

const footerUrlText: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '0 0 16px',
}

const footerLink: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
}

const footerCopy: React.CSSProperties = {
    textAlign: 'center' as const,
    color: '#4a4a4a',
    fontSize: '11px',
    margin: '0 0 24px',
}

const poweredBySection: React.CSSProperties = {
    textAlign: 'center' as const,
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '16px',
}

const poweredByText: React.CSSProperties = {
    color: '#3a3a3a',
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
}

const poweredByLink: React.CSSProperties = {
    textDecoration: 'none',
    fontWeight: 500,
}

const bottomFade: React.CSSProperties = {
    height: '32px',
    width: '100%',
}
