/**
 * POS — Point of Sale — Owner Panel
 *
 * Server component: loads products + categories + config.
 * Feature gate: enable_pos must be true.
 */

import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories } from '@/lib/medusa/admin'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import FeatureGate from '@/components/ui/FeatureGate'
import POSClient from './POSClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.pos.title') }
}

export default async function POSPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { featureFlags, config, planLimits } = appConfig

    // Gate: enable_pos must be true
    if (!featureFlags.enable_pos) {
        return <FeatureGate flag="enable_pos" lang={lang} />
    }

    const scope = await getTenantMedusaScope(tenantId)

    // Fetch products and categories (published products only, for POS grid)
    const [productsData, categoriesData] = await Promise.all([
        getAdminProductsFull({ limit: 100, status: 'published' }, scope),
        getAdminCategories({ limit: 50 }, scope),
    ])

    // Build labels from dictionary
    const dictionary = await getDictionary(lang as Locale)
    const posLabels: Record<string, string> = {}
    for (const [key, value] of Object.entries(dictionary)) {
        if (key.startsWith('panel.pos.')) {
            posLabels[key] = value as string
        }
    }

    return (
        <POSClient
            products={productsData.products}
            categories={categoriesData.product_categories.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
            }))}
            defaultCurrency={config.default_currency || 'EUR'}
            businessName={config.business_name || ''}
            labels={posLabels}
            featureFlags={featureFlags}
            planLimits={planLimits}
        />
    )
}
