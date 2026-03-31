/**
 * Sales Channels Dashboard — Owner Panel
 *
 * Channel configuration, performance comparison.
 * Gated by enable_sales_channels feature flag (module: Sales Channels).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { ShoppingCart } from 'lucide-react'
import SalesChannelsClient from './SalesChannelsClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.channels.title') }
}

export default async function SalesChannelsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_sales_channels) {
        return <FeatureGate flag="enable_sales_channels" lang={lang} />
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.channels.title')}
                subtitle={t('panel.channels.subtitle')}
                icon={<ShoppingCart className="w-5 h-5" />}
            />
            <SalesChannelsClient
                labels={{
                    activeChannels: t('panel.channels.activeChannels'),
                    totalRevenue: t('panel.channels.totalRevenue'),
                    conversionRate: t('panel.channels.conversionRate'),
                    channelConfig: t('panel.channels.channelConfig'),
                    performance: t('panel.channels.performance'),
                    tabChannels: t('panel.channels.tabChannels'),
                    tabPerformance: t('panel.channels.tabPerformance'),
                    tabSettings: t('panel.channels.tabSettings'),
                }}
                lang={lang}
            />
        </div>
    )
}
