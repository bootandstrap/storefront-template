import type { StoreConfig } from '@/lib/config'
import type { MedusaProduct } from '@/lib/medusa/client'

/**
 * Map Medusa inventory to Schema.org availability
 */
function getAvailability(product: MedusaProduct): string {
    const variant = product.variants?.[0]
    if (!variant) return 'https://schema.org/OutOfStock'
    const qty = (variant as unknown as Record<string, unknown>).inventory_quantity as number | undefined
    if (qty === undefined || qty === null) return 'https://schema.org/InStock' // no tracking = assume in stock
    if (qty <= 0) return 'https://schema.org/OutOfStock'
    if (qty <= 5) return 'https://schema.org/LimitedAvailability'
    return 'https://schema.org/InStock'
}

/**
 * Product JSON-LD structured data for SEO
 * Includes dynamic availability and optional aggregateRating
 */
export function productJsonLD(
    product: MedusaProduct,
    config: StoreConfig,
    reviewStats?: { ratingValue: number; reviewCount: number } | null
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
        ...(reviewStats && reviewStats.reviewCount > 0 && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: reviewStats.ratingValue.toFixed(1),
                reviewCount: reviewStats.reviewCount,
                bestRating: 5,
                worstRating: 1,
            },
        }),
        ...(price && {
            offers: {
                '@type': 'Offer',
                price: (price.amount / 100).toFixed(2),
                priceCurrency: price.currency_code.toUpperCase(),
                availability: getAvailability(product),
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
        url: process.env.NEXT_PUBLIC_SITE_URL || '',
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
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

/**
 * WebSite JSON-LD for homepage — enables Google Sitelinks Search Box
 */
export function websiteJsonLD(config: StoreConfig): Record<string, unknown> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.business_name,
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/{locale}/productos?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    }
}

/**
 * FAQPage JSON-LD — structured data for FAQ pages
 * Enables rich results in Google (accordion-style FAQ snippets)
 */
export function faqPageJsonLD(
    items: Array<{ question: string; answer: string }>
): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    }
}
