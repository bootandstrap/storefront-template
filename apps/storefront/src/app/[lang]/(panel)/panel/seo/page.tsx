/**
 * SEO Dashboard — Owner Panel
 *
 * Displays SEO health score, page audit, sitemap status, meta tag analysis.
 * Gated by enable_seo feature flag (module: SEO).
 * Tenant-scoped: all product queries are scoped to the authenticated tenant.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getProductCount, getCategoryCount } from '@/lib/medusa/admin'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Search } from 'lucide-react'
import SEOClient from './SEOClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.seo.title') }
}

export default async function SEOPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { featureFlags, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_seo) {
        return <FeatureGate flag="enable_seo" lang={lang} />
    }

    // Resolve tenant scope — all admin queries MUST be scoped
    const scope = await getTenantMedusaScope(tenantId)

    // Fetch content counts for SEO audit
    let productCount = 0
    let categoryCount = 0
    try {
        ;[productCount, categoryCount] = await Promise.all([
            getProductCount(scope),
            getCategoryCount(scope),
        ])
    } catch {
        // degrade gracefully
    }

    // Simulate SEO audit data (in production: crawl engine results)
    const seoData = {
        score: Math.min(100, Math.round(
            (config.meta_title ? 15 : 0) +
            (config.meta_description ? 15 : 0) +
            (config.favicon_url ? 10 : 0) +
            (config.logo_url ? 10 : 0) +
            (productCount > 0 ? 20 : 0) +
            (categoryCount > 0 ? 10 : 0) +
            (config.store_email ? 5 : 0) +
            (config.social_instagram || config.social_facebook ? 5 : 0) +
            10 // base score for having a site
        )),
        pagesIndexed: productCount + categoryCount + 3, // products + categories + home + about + contact
        metaIssues: [
            !config.meta_title,
            !config.meta_description,
            !config.favicon_url,
        ].filter(Boolean).length,
        hasMetaTitle: !!config.meta_title,
        hasMetaDescription: !!config.meta_description,
        hasFavicon: !!config.favicon_url,
        hasLogo: !!config.logo_url,
        hasSitemap: true, // Next.js generates sitemap automatically
        productCount,
        categoryCount,
        lastCrawl: new Date().toISOString(),
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.seo.title')}
                subtitle={t('panel.seo.subtitle')}
                icon={<Search className="w-5 h-5" />}
                badge={seoData.score}
            />
            <SEOClient
                seoData={seoData}
                labels={{
                    score: t('panel.seo.score'),
                    pagesIndexed: t('panel.seo.pagesIndexed'),
                    metaIssues: t('panel.seo.metaIssues'),
                    performance: t('panel.seo.performance'),
                    pageAudit: t('panel.seo.pageAudit'),
                    sitemapStatus: t('panel.seo.sitemapStatus'),
                    metaChecker: t('panel.seo.metaChecker'),
                    keywords: t('panel.seo.keywords'),
                    organicTraffic: t('panel.seo.organicTraffic'),
                    backlinks: t('panel.seo.backlinks'),
                    googleIndexing: t('panel.seo.googleIndexing'),
                    pageTitleOk: t('panel.seo.pageTitleOk'),
                    metaDescOk: t('panel.seo.metaDescOk'),
                    altImagesOk: t('panel.seo.altImagesOk'),
                    headingStructure: t('panel.seo.headingStructure'),
                    missing: t('panel.seo.missing'),
                    configured: t('panel.seo.configured'),
                    lastCrawl: t('panel.seo.lastCrawl'),
                    tabOverview: t('panel.seo.tabOverview'),
                    tabPages: t('panel.seo.tabPages'),
                    tabKeywords: t('panel.seo.tabKeywords'),
                }}
                lang={lang}
            />
        </div>
    )
}
