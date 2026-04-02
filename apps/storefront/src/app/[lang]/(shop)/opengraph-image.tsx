/**
 * Dynamic OG Image — Store Homepage
 *
 * Generates a branded Open Graph image using the tenant's business name
 * and meta description from governance config. Served at:
 *   /{lang}/opengraph-image
 *
 * Next.js automatically links this in <head> for social sharing.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
 */
import { ImageResponse } from 'next/og'
import { getConfig } from '@/lib/config'

export const alt = 'Store'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
    const { config } = await getConfig()
    const businessName = config.business_name || 'Store'
    const description = config.meta_description || 'Discover our products'

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)',
                    padding: 80,
                    justifyContent: 'space-between',
                }}
            >
                {/* Top — brand accent bar */}
                <div
                    style={{
                        display: 'flex',
                        width: 80,
                        height: 6,
                        borderRadius: 3,
                        background: config.primary_color || '#22c55e',
                    }}
                />

                {/* Center — business name + tagline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 800,
                            color: 'white',
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {businessName}
                    </div>
                    <div
                        style={{
                            fontSize: 28,
                            color: '#94a3b8',
                            lineHeight: 1.4,
                            maxWidth: 800,
                        }}
                    >
                        {description.length > 120
                            ? description.substring(0, 117) + '...'
                            : description}
                    </div>
                </div>

                {/* Bottom — subtle footer */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            background: config.primary_color || '#22c55e',
                        }}
                    />
                    <div style={{ fontSize: 18, color: '#64748b' }}>
                        {process.env.NEXT_PUBLIC_SITE_URL?.replace(
                            /^https?:\/\//,
                            '',
                        ) || businessName.toLowerCase().replace(/\s+/g, '')}
                    </div>
                </div>
            </div>
        ),
        { ...size },
    )
}
