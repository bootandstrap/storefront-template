import { ImageResponse } from 'next/og'
import { getProduct } from '@/lib/medusa/client'
import { getConfig } from '@/lib/config'

export const runtime = 'edge'
export const alt = 'Product Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params
    const product = await getProduct(handle)
    const { config } = await getConfig()

    const storeName = config.business_name || 'Store'
    const title = product?.title || 'Product'
    const price = product?.variants?.[0]?.prices?.[0]
    const priceText = price
        ? `${(price.amount / 100).toFixed(2)} ${price.currency_code.toUpperCase()}`
        : ''
    const thumbnailUrl = product?.thumbnail || ''

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {/* Product image section */}
                <div style={{
                    display: 'flex',
                    width: '50%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                }}>
                    {thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            width={460}
                            height={460}
                            style={{
                                objectFit: 'contain',
                                borderRadius: '24px',
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                        />
                    ) : (
                        <div style={{
                            display: 'flex',
                            width: '300px',
                            height: '300px',
                            borderRadius: '24px',
                            background: 'rgba(255,255,255,0.05)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.3)',
                            fontSize: '80px',
                        }}>
                            📦
                        </div>
                    )}
                </div>

                {/* Info section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '50%',
                    height: '100%',
                    padding: '40px 40px 40px 0',
                }}>
                    {/* Store name chip */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }}>
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '999px',
                            background: 'rgba(45, 80, 22, 0.3)',
                            border: '1px solid rgba(45, 80, 22, 0.5)',
                            color: '#7cb342',
                            fontSize: '16px',
                            fontWeight: 600,
                        }}>
                            {storeName}
                        </span>
                    </div>

                    {/* Product title */}
                    <h1 style={{
                        fontSize: title.length > 40 ? '36px' : '48px',
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: 1.2,
                        marginBottom: '20px',
                        maxWidth: '100%',
                    }}>
                        {title}
                    </h1>

                    {/* Price */}
                    {priceText && (
                        <span style={{
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#7cb342',
                        }}>
                            {priceText}
                        </span>
                    )}
                </div>
            </div>
        ),
        {
            ...size,
        },
    )
}
