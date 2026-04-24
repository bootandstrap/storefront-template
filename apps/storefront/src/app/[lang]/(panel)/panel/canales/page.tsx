/**
 * Sales Channels Dashboard — Owner Panel
 *
 * Channel configuration, performance comparison.
 * Gated by enable_sales_channels feature flag (module: Sales Channels).
 * SOTA 2026: ModuleShell wrapper with tier awareness.
 *
 * Data sources:
 * - Channels: Medusa Admin API `/admin/sales-channels`
 * - Metrics: Medusa Admin API `/admin/orders` (grouped by sales_channel_id)
 * - Settings: config table (saved via ModuleConfigSection)
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
import { ShoppingCart } from 'lucide-react'
import SalesChannelsClient from './SalesChannelsClient'
import { getSalesChannelsAction } from './actions'

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
    const { featureFlags, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_sales_channels

    const tierInfo = {
        currentTier: isLocked ? 'Free' : 'Activo',
        moduleKey: 'sales_channels',
        nextTierFeatures: isLocked ? [
            t('panel.channels.feat.multi') || 'Múltiples canales de venta',
            t('panel.channels.feat.performance') || 'Comparación de rendimiento',
            t('panel.channels.feat.config') || 'Configuración por canal',
        ] : undefined,
        nextTierName: isLocked ? 'Sales Channels' : undefined,
        nextTierPrice: isLocked ? 15 : undefined,
    }

    const cfgAny = config as unknown as Record<string, unknown>

    // Fetch real sales channels data from Medusa
    const channelsData = !isLocked ? await getSalesChannelsAction() : null

    return (
        <ModuleShell
            icon={<ShoppingCart className="w-5 h-5" />}
            title={t('panel.channels.title') || 'Canales de Venta'}
            subtitle={t('panel.channels.subtitle') || 'Gestiona tus canales de venta y rendimiento'}
            isLocked={isLocked}
            gateFlag="enable_sales_channels"
            tierInfo={tierInfo}
            lang={lang}
        >
            {channelsData && (
                <SalesChannelsClient
                    channelsData={channelsData}
                    salesConfig={{
                        sales_whatsapp_greeting: cfgAny.sales_whatsapp_greeting ?? '',
                        sales_preferred_contact: cfgAny.sales_preferred_contact ?? 'whatsapp',
                        sales_business_hours_display: cfgAny.sales_business_hours_display ?? false,
                        sales_highlight_free_shipping: cfgAny.sales_highlight_free_shipping ?? false,
                    }}
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
            )}
        </ModuleShell>
    )
}

