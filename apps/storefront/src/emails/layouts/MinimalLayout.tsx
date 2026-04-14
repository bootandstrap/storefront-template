/**
 * Minimal Layout — Free with Web Base
 *
 * Elegant, clean design inspired by Apple/Notion transactional emails.
 * Subtle depth with refined spacing and typographic hierarchy.
 * Zone: 🟢 GREEN — BootandStrap-provided design
 */

import {
    Html, Head, Body, Container, Section, Text, Hr,
    Preview, Font, Row, Column, Img,
} from '@react-email/components'
import * as React from 'react'
import type { LayoutProps } from './types'

export default function MinimalLayout({
    preview,
    storeName = 'Store',
    storeUrl = '',
    children,
}: LayoutProps) {
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
                    {/* Store name header */}
                    <Section style={headerSection}>
                        <Text style={headerName}>{storeName}</Text>
                    </Section>

                    {/* Thin elegant separator */}
                    <Hr style={topDivider} />

                    {/* Main content card */}
                    <Section style={card}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Hr style={footerDivider} />
                        <Text style={footerText}>
                            Este email fue enviado por {storeName}
                        </Text>
                        {storeUrl && (
                            <Text style={footerUrl}>
                                {storeUrl.replace(/^https?:\/\//, '')}
                            </Text>
                        )}
                        <Text style={footerMeta}>
                            © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

// ---------------------------------------------------------------------------
// Styles — Refined Minimal Design
// ---------------------------------------------------------------------------

const body: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
    WebkitTextSizeAdjust: '100%',
}

const container: React.CSSProperties = {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '48px 24px 32px',
}

const headerSection: React.CSSProperties = {
    textAlign: 'center' as const,
    paddingBottom: '20px',
}

const headerName: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    margin: 0,
}

const topDivider: React.CSSProperties = {
    borderTop: '1px solid #e5e7eb',
    margin: '0 0 32px',
}

const card: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px 36px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 6px 24px 0 rgba(0, 0, 0, 0.03)',
}

const footerSection: React.CSSProperties = {
    padding: '0 12px',
}

const footerDivider: React.CSSProperties = {
    borderTop: '1px solid #eaeaea',
    margin: '32px 0 20px',
}

const footerText: React.CSSProperties = {
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 4px',
}

const footerUrl: React.CSSProperties = {
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
    margin: '0 0 12px',
}

const footerMeta: React.CSSProperties = {
    textAlign: 'center' as const,
    color: '#c4c9d4',
    fontSize: '11px',
    margin: 0,
}
