import type { StoreConfig } from '@/lib/config'
import type { MedusaProduct } from '@/lib/medusa/client'

/**
 * Product JSON-LD structured data for SEO
 */
export function productJsonLD(
    product: MedusaProduct,
    config: StoreConfig
): Record<string, unknown> {
    const price = product.variants?.[0]?.prices?.[0]

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description,
        image: product.thumbnail || product.images?.[0]?.url,
        brand: {
            '@type': 'Organization',
            name: config.business_name,
        },
        ...(price && {
            offers: {
                '@type': 'Offer',
                price: (price.amount / 100).toFixed(2),
                priceCurrency: price.currency_code.toUpperCase(),
                availability: 'https://schema.org/InStock',
                seller: {
                    '@type': 'Organization',
                    name: config.business_name,
                },
            },
        }),
    }
}

/**
 * Organization JSON-LD for homepage
 */
export function organizationJsonLD(config: StoreConfig): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: config.business_name,
        url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
        logo: config.logo_url || undefined,
        contactPoint: config.whatsapp_number
            ? {
                '@type': 'ContactPoint',
                telephone: `+${config.whatsapp_number}`,
                contactType: 'customer service',
                availableLanguage: ['Spanish'],
            }
            : undefined,
    }
}

/**
 * BreadcrumbList JSON-LD for product pages
 */
export function breadcrumbListJsonLD(
    product: MedusaProduct,
    categoryName: string | null,
    lang: string,
): Record<string, unknown> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
    const items: Array<Record<string, unknown>> = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${siteUrl}/${lang}`,
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Products',
            item: `${siteUrl}/${lang}/productos`,
        },
    ]

    if (categoryName) {
        items.push({
            '@type': 'ListItem',
            position: 3,
            name: categoryName,
            item: `${siteUrl}/${lang}/productos?category=${encodeURIComponent(categoryName)}`,
        })
    }

    items.push({
        '@type': 'ListItem',
        position: categoryName ? 4 : 3,
        name: product.title,
        item: `${siteUrl}/${lang}/productos/${product.handle}`,
    })

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    }
}
