import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campifrut.com'

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/carrito', '/checkout', '/cuenta/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
