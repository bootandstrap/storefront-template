/**
 * Utilities Page — Owner Panel
 *
 * Mixed-gating hub:
 *   - WiFi QR:           FREE (no gate)
 *   - Loyalty Cards:     ecommerce Enterprise (enable_self_service_returns)
 *   - Price Labels:      ecommerce Pro       (enable_product_badges)
 *
 * Products fetched from Medusa for the Labels tab.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getAdminProductsFull } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Wrench } from 'lucide-react'
import UtilitiesClient from './UtilitiesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.utilities.title') }
}

export default async function UtilitiesPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig, tenantId } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Fetch products for price labels (only if ecommerce pro enabled)
    let products: { id: string; title: string; thumbnail: string | null; variants: { id: string; title: string; sku: string | null; prices: { amount: number; currency_code: string }[] }[] }[] = []

    if (featureFlags.enable_product_badges) {
        try {
            const scope = await getTenantMedusaScope(tenantId)
            const result = await getAdminProductsFull({ limit: 200 }, scope)
            products = result.products.map(p => ({
                id: p.id,
                title: p.title,
                thumbnail: p.thumbnail,
                variants: p.variants.map(v => ({
                    id: v.id,
                    title: v.title,
                    sku: v.sku,
                    prices: v.prices,
                })),
            }))
        } catch {
            // Medusa unavailable — labels tab gracefully shows empty state
        }
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.utilities.title')}
                subtitle={t('panel.utilities.subtitle')}
                icon={<Wrench className="w-5 h-5" />}
            />
            <UtilitiesClient
                featureFlags={{
                    enable_product_badges: featureFlags.enable_product_badges ?? false,
                    enable_self_service_returns: featureFlags.enable_self_service_returns ?? false,
                }}
                products={products}
                labels={{
                    title: t('panel.utilities.title'),
                    subtitle: t('panel.utilities.subtitle'),
                    tabWifi: t('panel.utilities.tabWifi'),
                    tabLoyalty: t('panel.utilities.tabLoyalty'),
                    tabLabels: t('panel.utilities.tabLabels'),
                }}
                wifiLabels={{
                    title: t('panel.wifiQr.title'),
                    ssid: t('panel.wifiQr.ssid'),
                    password: t('panel.wifiQr.password'),
                    encryption: t('panel.wifiQr.encryption'),
                    save: t('panel.wifiQr.save'),
                    add: t('panel.wifiQr.add'),
                    delete: t('panel.wifiQr.delete'),
                    setDefault: t('panel.wifiQr.setDefault'),
                    print: t('panel.wifiQr.print'),
                    noNetworks: t('panel.wifiQr.noNetworks'),
                    detectHint: t('panel.wifiQr.detectHint'),
                    useLast: t('panel.wifiQr.useLast'),
                }}
                loyaltyLabels={{
                    title: t('panel.loyalty.title'),
                    subtitle: t('panel.loyalty.subtitle'),
                    stamps: t('panel.loyalty.stamps'),
                    redeem: t('panel.loyalty.redeem'),
                    addStamp: t('panel.loyalty.addStamp'),
                    qrHint: t('panel.loyalty.qrHint'),
                    redeemed: t('panel.loyalty.redeemed'),
                    progress: t('panel.loyalty.progress'),
                    complete: t('panel.loyalty.complete'),
                    reward: t('panel.loyalty.reward'),
                    configTitle: t('panel.loyalty.configTitle'),
                    businessName: t('panel.loyalty.businessName'),
                    stampsRequired: t('panel.loyalty.stampsRequired'),
                    rewardDescription: t('panel.loyalty.rewardDescription'),
                    rewardType: t('panel.loyalty.rewardType'),
                    customers: t('panel.loyalty.customers'),
                    noCustomers: t('panel.loyalty.noCustomers'),
                    newCustomer: t('panel.loyalty.newCustomer'),
                    customerName: t('panel.loyalty.customerName'),
                    saveConfig: t('panel.loyalty.saveConfig'),
                    configSaved: t('panel.loyalty.configSaved'),
                    totalRedeemed: t('panel.loyalty.totalRedeemed'),
                }}
                labelsLabels={{
                    title: t('panel.labels.title'),
                    subtitle: t('panel.labels.subtitle'),
                    print: t('panel.labels.print'),
                    noProducts: t('panel.labels.noProducts'),
                    count: t('panel.labels.count'),
                    sku: t('panel.labels.sku'),
                    noSku: t('panel.labels.noSku'),
                    selectProducts: t('panel.labels.selectProducts'),
                    selectAll: t('panel.labels.selectAll'),
                    deselectAll: t('panel.labels.deselectAll'),
                    selectedCount: t('panel.labels.selectedCount'),
                    generate: t('panel.labels.generate'),
                }}
                lang={lang}
                defaultCurrency={appConfig.config.default_currency}
            />
        </div>
    )
}
