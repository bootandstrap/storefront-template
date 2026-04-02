import type { StoreConfig } from '@/lib/config'
import type { MedusaProduct } from '@/lib/medusa/client'

// schema-dts imported for reference — we use Record<string, unknown> return types
// because schema-dts strict types conflict with JSON.stringify spread patterns.
// The types serve as documentation; runtime output matches schema.org spec.

/**
 * XSS-safe JSON-LD serialization.
 *
 * Prevents injection via `</script>` in user-controlled fields (product titles,
 * descriptions, business names). Without this, a product titled
 * `</script><script>alert(1)</script>` would break out of the JSON-LD block.
 *
 * @see https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 */
export function safeJsonLd(data: Record<string, unknown>): string {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
}

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
 * Schema: https://schema.org/Product
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
        sku: product.variants?.[0]?.sku || undefined,
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
                url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/productos/${product.handle}`,
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
 * Schema: https://schema.org/Organization
 */
export function organizationJsonLD(config: StoreConfig): Record<string, unknown> {
    // Collect social profile URLs for Google Knowledge Panel sameAs
    const sameAs = [
        config.social_instagram,
        config.social_facebook,
        config.social_tiktok,
    ].filter(Boolean)

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: config.business_name,
        url: process.env.NEXT_PUBLIC_SITE_URL || '',
        logo: config.logo_url || undefined,
        ...(sameAs.length > 0 && { sameAs }),
        contactPoint: config.whatsapp_number
            ? {
                '@type': 'ContactPoint',
                telephone: `+${config.whatsapp_number}`,
                contactType: 'customer service',
                availableLanguage: ['Spanish', 'English'],
            }
            : undefined,
    }
}

/**
 * BreadcrumbList JSON-LD for product pages
 * Schema: https://schema.org/BreadcrumbList
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
 * Schema: https://schema.org/WebSite
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
 * Schema: https://schema.org/FAQPage
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
