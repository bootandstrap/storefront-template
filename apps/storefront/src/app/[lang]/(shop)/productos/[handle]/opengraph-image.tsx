/**
 * Dynamic OG Image — Product Detail Page
 *
 * Generates a per-product Open Graph image showing:
 * - Product thumbnail (left half, contained)
 * - Product title, price, category badge (right half)
 * - Tenant brand color accent
 *
 * Served at: /{lang}/productos/{handle}/opengraph-image
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
 */
import { ImageResponse } from 'next/og'
import { getProduct } from '@/lib/medusa/client'
import { getConfig } from '@/lib/config'
import { getPrice } from '@/lib/medusa/price'

export const alt = 'Product'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
    params,
}: {
    params: Promise<{ handle: string }>
}) {
    const { handle } = await params
    const product = await getProduct(handle)
    const { config } = await getConfig()

    const businessName = config.business_name || 'Store'
    const title = product?.title || 'Product'
    const brandColor = config.primary_color || '#22c55e'
    const thumbnailUrl = product?.thumbnail || ''

    // Format price with Intl for proper currency display
    let priceText = ''
    if (product?.variants?.[0]) {
        const resolved = getPrice(product.variants[0])
        if (resolved) {
            priceText = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: resolved.currency,
                minimumFractionDigits: 2,
            }).format(resolved.amount / 100)
        }
    }

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    background:
                        'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {/* Product image section */}
                <div
                    style={{
                        display: 'flex',
                        width: '50%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 40,
                    }}
                >
                    {thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            width={460}
                            height={460}
                            style={{
                                objectFit: 'contain',
                                borderRadius: 24,
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                width: 300,
                                height: 300,
                                borderRadius: 24,
                                background: 'rgba(255,255,255,0.05)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: 80,
                            }}
                        >
                            📦
                        </div>
                    )}
                </div>

                {/* Info section */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '50%',
                        height: '100%',
                        padding: '40px 40px 40px 0',
                        gap: 16,
                    }}
                >
                    {/* Category pill */}
                    {product?.categories?.[0]?.name && (
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 14,
                                color: brandColor,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontWeight: 600,
                            }}
                        >
                            {product.categories[0].name}
                        </div>
                    )}

                    {/* Store name chip */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span
                            style={{
                                padding: '6px 16px',
                                borderRadius: 999,
                                background: `${brandColor}22`,
                                border: `1px solid ${brandColor}55`,
                                color: brandColor,
                                fontSize: 16,
                                fontWeight: 600,
                            }}
                        >
                            {businessName}
                        </span>
                    </div>

                    {/* Product title */}
                    <div
                        style={{
                            fontSize: title.length > 40 ? 36 : 48,
                            fontWeight: 800,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title.length > 80
                            ? title.substring(0, 77) + '...'
                            : title}
                    </div>

                    {/* Price */}
                    {priceText && (
                        <div
                            style={{
                                fontSize: 32,
                                fontWeight: 700,
                                color: brandColor,
                            }}
                        >
                            {priceText}
                        </div>
                    )}
                </div>
            </div>
        ),
        { ...size },
    )
}
