import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/medusa/client'
import { getConfig } from '@/lib/config'
import { getActiveLocales, CANONICAL_ROUTES } from '@/lib/i18n'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const { config } = await getConfig()
    const activeLocales = getActiveLocales(config)

    const entries: MetadataRoute.Sitemap = []

    // Static pages per locale
    for (const locale of activeLocales) {
        const prefix = `${baseUrl}/${locale}`

        // Homepage
        entries.push({
            url: prefix,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        })

        // Products listing
        entries.push({
            url: `${prefix}/${CANONICAL_ROUTES.products}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        })
    }

    // Dynamic product pages per locale
    try {
        const { products } = await getProducts({ limit: 100 })
        for (const locale of activeLocales) {
            const prefix = `${baseUrl}/${locale}`
            for (const product of products) {
                entries.push({
                    url: `${prefix}/${CANONICAL_ROUTES.products}/${product.handle}`,
                    lastModified: new Date(product.updated_at),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                })
            }
        }
    } catch {
        // Products unavailable — return static pages only
    }

    return entries
}
