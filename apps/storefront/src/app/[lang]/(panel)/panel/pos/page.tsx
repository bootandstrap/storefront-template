/**
 * POS — Point of Sale — Owner Panel
 *
 * Server component: loads products + categories + config.
 * Feature gate: enable_pos must be true.
 * SOTA 2026: ModuleShell for locked state, fullscreen POSClient when active.
 */

import { getConfigForTenant } from '@/lib/config'
import type { StoreConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories } from '@/lib/medusa/admin'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getTaxRatesForRegion } from '@/lib/medusa/admin-shipping'
import ModuleShell from '@/components/panel/ModuleShell'
import { Monitor } from 'lucide-react'
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

    // Gate: enable_pos must be true — show value-rich locked state
    if (!featureFlags.enable_pos) {
        const dictionary = await getDictionary(lang as Locale)
        const t = createTranslator(dictionary)
        return (
            <ModuleShell
                icon={<Monitor className="w-5 h-5" />}
                title={t('panel.pos.title') || 'Punto de Venta'}
                subtitle={t('panel.pos.subtitle') || 'Terminal de venta para tu tienda física'}
                isLocked={true}
                gateFlag="enable_pos"
                tierInfo={{
                    currentTier: 'Free',
                    moduleKey: 'pos',
                    nextTierFeatures: [
                        t('panel.pos.feat.terminal') || 'Terminal de venta completo',
                        t('panel.pos.feat.receipt') || 'Tickets personalizados',
                        t('panel.pos.feat.inventory') || 'Gestión de inventario en tiempo real',
                        t('panel.pos.feat.shifts') || 'Turnos y cierres de caja',
                        t('panel.pos.feat.dashboard') || 'Dashboard de ventas POS',
                    ],
                    nextTierName: 'POS Standard',
                    nextTierPrice: 30,
                }}
                lang={lang}
            >
                {null}
            </ModuleShell>
        )
    }

    const scope = await getTenantMedusaScope(tenantId)

    // Fetch products, categories, and region tax rate
    const [productsData, categoriesData, taxRate] = await Promise.all([
        getAdminProductsFull({ limit: 100, status: 'published' }, scope),
        getAdminCategories({ limit: 50 }, scope),
        fetchRegionTaxRate(scope),
    ])

    // Build labels from dictionary
    const dictionary = await getDictionary(lang as Locale)
    const posLabels: Record<string, string> = {}
    for (const [key, value] of Object.entries(dictionary)) {
        if (key.startsWith('panel.pos.')) {
            posLabels[key] = value as string
        }
    }

    // Extract POS-specific config for the settings drawer — typed properly
    const typedConfig = config as StoreConfig
    const posConfig: Record<string, unknown> = {}
    const posConfigKeys = [
        'pos_receipt_header', 'pos_receipt_footer', 'pos_default_payment_method',
        'pos_tax_display', 'pos_enable_tips', 'pos_tip_percentages', 'pos_sound_enabled',
        'receipt_header', 'receipt_footer', 'receipt_business_name',
        'receipt_address', 'receipt_nif', 'receipt_phone', 'receipt_email',
    ]
    for (const key of posConfigKeys) {
        const val = (typedConfig as unknown as Record<string, unknown>)[key]
        if (val !== undefined) posConfig[key] = val
    }

    // Stock mode — typed, no `as any`
    const stockMode: 'always_in_stock' | 'managed' =
        typedConfig.stock_mode === 'managed' ? 'managed' : 'always_in_stock'

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
            posConfig={{ ...posConfig, tax_rate: taxRate }}
            tenantId={tenantId}
            stockMode={stockMode}
        />
    )
}

/**
 * Fetch the default tax rate from Medusa's Tax Module.
 * Falls back to 0 if no region or tax rate is configured.
 */
async function fetchRegionTaxRate(scope: Awaited<ReturnType<typeof getTenantMedusaScope>>): Promise<number> {
    try {
        const { adminFetch } = await import('@/lib/medusa/admin-core')
        const regionsRes = await adminFetch<{ regions: { id: string }[] }>(
            '/admin/regions?limit=1',
            {},
            scope
        )
        const regionId = regionsRes.data?.regions?.[0]?.id
        if (!regionId) return 0

        const taxRates = await getTaxRatesForRegion(regionId, scope)
        const defaultRate = taxRates.find(r => r.is_default)
        return defaultRate?.rate ?? taxRates[0]?.rate ?? 0
    } catch {
        return 0
    }
}
