import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/medusa/client'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campifrut.com'

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/productos`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ]

    // Dynamic product pages
    try {
        const { products } = await getProducts({ limit: 100 })
        const productPages: MetadataRoute.Sitemap = products.map((p) => ({
            url: `${baseUrl}/productos/${p.handle}`,
            lastModified: new Date(p.updated_at),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }))

        return [...staticPages, ...productPages]
    } catch {
        return staticPages
    }
}
