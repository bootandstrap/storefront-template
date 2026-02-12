import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

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
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
