import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    breadcrumbListJsonLD,
    faqPageJsonLD,
    organizationJsonLD,
    productJsonLD,
    safeJsonLd,
    websiteJsonLD,
} from '../jsonld'
import {
    joinPublicUrl,
    normalizePublicBaseUrl,
    resolvePublicBaseUrl,
} from '../public-url'

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}))

const storeConfig = {
    business_name: 'Boot Store',
    logo_url: 'https://cdn.example.com/logo.png',
    social_instagram: 'https://instagram.example.com/boot',
    social_facebook: '',
    social_tiktok: null,
    whatsapp_number: '34123456789',
} as never

const product = {
    title: 'Safe Product',
    description: 'Useful product',
    handle: 'safe-product',
    thumbnail: 'https://cdn.example.com/product.png',
    variants: [{
        sku: 'SKU-1',
        inventory_quantity: 4,
        prices: [{ amount: 1299, currency_code: 'eur' }],
    }],
} as never

describe('SEO JSON-LD helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('serializes JSON-LD safely for script tags', () => {
        const serialized = safeJsonLd({
            name: '</script><script>alert(1)</script>',
            amp: 'a&b',
        })

        expect(serialized).not.toContain('</script>')
        expect(serialized).toContain('\\u003c/script\\u003e')
        expect(serialized).toContain('\\u0026')
    })

    it('builds product structured data with offers and aggregate ratings', () => {
        const json = productJsonLD(product, storeConfig, { ratingValue: 4.25, reviewCount: 3 }, 'https://tenant.example.com')

        expect(json).toMatchObject({
            '@type': 'Product',
            name: 'Safe Product',
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.3',
                reviewCount: 3,
            },
            offers: {
                '@type': 'Offer',
                price: '12.99',
                priceCurrency: 'EUR',
                availability: 'https://schema.org/LimitedAvailability',
                url: 'https://tenant.example.com/productos/safe-product',
            },
        })
    })

    it('builds organization, website, breadcrumb and FAQ JSON-LD documents', () => {
        expect(organizationJsonLD(storeConfig, 'https://tenant.example.com')).toMatchObject({
            '@type': 'Organization',
            name: 'Boot Store',
            sameAs: ['https://instagram.example.com/boot'],
            contactPoint: { telephone: '+34123456789' },
        })
        expect(websiteJsonLD(storeConfig, 'https://tenant.example.com')).toMatchObject({
            '@type': 'WebSite',
            potentialAction: {
                '@type': 'SearchAction',
            },
        })
        expect(breadcrumbListJsonLD(product, 'Summer & Sale', 'es', 'https://tenant.example.com'))
            .toMatchObject({
                '@type': 'BreadcrumbList',
                itemListElement: expect.arrayContaining([
                    expect.objectContaining({
                        position: 3,
                        item: 'https://tenant.example.com/es/productos?category=Summer%20%26%20Sale',
                    }),
                ]),
            })
        expect(faqPageJsonLD([{ question: 'Q?', answer: 'A.' }])).toMatchObject({
            '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }],
        })
    })
})

describe('public URL helpers', () => {
    it('normalizes configured public URLs and rejects unsafe protocols', () => {
        expect(normalizePublicBaseUrl('https://tenant.example.com/shop/')).toBe('https://tenant.example.com/shop')
        expect(normalizePublicBaseUrl('javascript:alert(1)')).toBe('')
        expect(normalizePublicBaseUrl('not a url')).toBe('')
    })

    it('joins paths and resolves forwarded host/proto safely', () => {
        expect(joinPublicUrl('https://tenant.example.com', 'productos')).toBe('https://tenant.example.com/productos')
        expect(joinPublicUrl('', '/productos')).toBe('/productos')
        expect(resolvePublicBaseUrl({
            envUrl: '',
            forwardedHost: 'tenant.example.com, proxy.local',
            forwardedProto: 'http:',
            host: 'ignored.example.com',
        })).toBe('http://tenant.example.com')
        expect(resolvePublicBaseUrl({
            envUrl: '',
            forwardedHost: 'bad/host',
            forwardedProto: 'https',
            host: null,
        })).toBe('')
    })
})
