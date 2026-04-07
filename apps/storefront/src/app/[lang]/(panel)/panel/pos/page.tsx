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

    // Extract POS-specific config for the settings drawer
    const cfg = config as unknown as Record<string, unknown>
    const posConfig: Record<string, unknown> = {}
    const posConfigKeys = [
        'pos_receipt_header', 'pos_receipt_footer', 'pos_default_payment_method',
        'pos_tax_display', 'pos_enable_tips', 'pos_tip_percentages', 'pos_sound_enabled',
    ]
    for (const key of posConfigKeys) {
        if (cfg[key] !== undefined) posConfig[key] = cfg[key]
    }

    return (
        <POSClient
            products={productsData.products}
            categories={categoriesData.product_categories.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
            }))}
            defaultCurrency={config.default_currency}
            businessName={config.business_name || ''}
            labels={posLabels}
            featureFlags={featureFlags}
            planLimits={planLimits}
            posConfig={posConfig}
            tenantId={tenantId}
        />
    )
}
