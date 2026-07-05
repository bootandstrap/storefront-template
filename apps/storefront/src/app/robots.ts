import type { MetadataRoute } from 'next'
import { getPublicBaseUrl, joinPublicUrl } from '@/lib/seo/public-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
    const baseUrl = await getPublicBaseUrl()

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/auth/',
                    '/*/carrito',
                    '/*/checkout',
                    '/*/cuenta/',
                    '/*/panel/',
                ],
            },
        ],
        sitemap: joinPublicUrl(baseUrl, '/sitemap.xml'),
    }
}
