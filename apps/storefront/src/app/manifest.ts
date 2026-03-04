/**
 * PWA Web App Manifest
 * 
 * Next.js route-based manifest generation.
 * Reads tenant config to personalize the manifest per storefront.
 * 
 * Icons should be placed in /public/icons/ during customization:
 * - icon-192.png (192×192)
 * - icon-512.png (512×512)
 * - apple-icon.png (180×180)
 */
import type { MetadataRoute } from 'next'
import { getConfig } from '@/lib/config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const { config } = await getConfig()

    return {
        name: config.business_name || 'Store',
        short_name: (config.business_name || 'Store').slice(0, 12),
        description: config.meta_description || `${config.business_name} — Online Store`,
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: config.primary_color || '#000000',
        orientation: 'portrait-primary',
        categories: ['shopping', 'business'],
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
