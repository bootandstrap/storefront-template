/**
 * Utilities Page — Owner Panel
 *
 * Centralises WiFi QR, Loyalty Stamp Cards, and Price Labels
 * in a single tabbed UI. Gated by enable_crm feature flag.
 * Data from Medusa products (for price labels) + localStorage (WiFi/Loyalty).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
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
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_crm) {
        return <FeatureGate flag="enable_crm" lang={lang} />
    }

    return (
        <div className="space-y-6">
            <UtilitiesClient
                featureFlags={featureFlags}
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
                    stamps: t('panel.loyalty.stamps'),
                    redeem: t('panel.loyalty.redeem'),
                    addStamp: t('panel.loyalty.addStamp'),
                    qrHint: t('panel.loyalty.qrHint'),
                    redeemed: t('panel.loyalty.redeemed'),
                    progress: t('panel.loyalty.progress'),
                    complete: t('panel.loyalty.complete'),
                    reward: t('panel.loyalty.reward'),
                }}
                labelsLabels={{
                    title: t('panel.labels.title'),
                    print: t('panel.labels.print'),
                    noProducts: t('panel.labels.noProducts'),
                    count: t('panel.labels.count'),
                    sku: t('panel.labels.sku'),
                    noSku: t('panel.labels.noSku'),
                }}
                lang={lang}
            />
        </div>
    )
}
