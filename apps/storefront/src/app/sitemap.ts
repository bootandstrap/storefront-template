import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/medusa/client'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getActiveLocales, CANONICAL_ROUTES } from '@/lib/i18n'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const { config } = await getConfig()
    const activeLocales = getActiveLocales(config)

    const entries: MetadataRoute.Sitemap = []

    // Build alternates map for a given path
    function buildAlternates(path: string) {
        if (activeLocales.length <= 1) return undefined
        const languages: Record<string, string> = {}
        for (const locale of activeLocales) {
            languages[locale] = `${baseUrl}/${locale}${path}`
        }
        // x-default points to the tenant's configured default language
        languages['x-default'] = `${baseUrl}/${config.language || 'en'}${path}`
        return { languages }
    }

    // Static pages per locale
    for (const locale of activeLocales) {
        const prefix = `${baseUrl}/${locale}`

        // Homepage
        entries.push({
            url: prefix,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
            alternates: buildAlternates(''),
        })

        // Products listing
        entries.push({
            url: `${prefix}/${CANONICAL_ROUTES.products}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
            alternates: buildAlternates(`/${CANONICAL_ROUTES.products}`),
        })

        // Legal pages
        const legalSlugs = ['privacidad', 'terminos', 'cookies', 'aviso']
        for (const slug of legalSlugs) {
            entries.push({
                url: `${prefix}/legal/${slug}`,
                lastModified: new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.3,
                alternates: buildAlternates(`/legal/${slug}`),
            })
        }
    }

    // Dynamic product pages per locale — paginate to fetch ALL products
    try {
        const PAGE_SIZE = 200
        let offset = 0
        let hasMore = true

        while (hasMore) {
            const { products } = await getProducts({ limit: PAGE_SIZE, offset })
            for (const locale of activeLocales) {
                const prefix = `${baseUrl}/${locale}`
                for (const product of products) {
                    const productPath = `/${CANONICAL_ROUTES.products}/${product.handle}`
                    entries.push({
                        url: `${prefix}${productPath}`,
                        lastModified: new Date(product.updated_at),
                        changeFrequency: 'weekly' as const,
                        priority: 0.8,
                        alternates: buildAlternates(productPath),
                    })
                }
            }
            hasMore = products.length === PAGE_SIZE
            offset += PAGE_SIZE
        }
    } catch {
        // Products unavailable — return static pages only
    }

    // Published CMS pages (paginas/[slug]) — from Supabase
    try {
        const tenantId = getRequiredTenantId()
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('cms_pages')
            .select('slug, updated_at')
            .eq('tenant_id', tenantId)
            .eq('published', true)

        const cmsPages = (data || []) as Array<{ slug: string; updated_at: string | null }>

        for (const locale of activeLocales) {
            const prefix = `${baseUrl}/${locale}`
            for (const page of cmsPages || []) {
                const pagePath = `/paginas/${page.slug}`
                entries.push({
                    url: `${prefix}${pagePath}`,
                    lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
                    changeFrequency: 'monthly' as const,
                    priority: 0.6,
                    alternates: buildAlternates(pagePath),
                })
            }
        }
    } catch {
        // CMS pages unavailable — skip section
    }

    return entries
}
