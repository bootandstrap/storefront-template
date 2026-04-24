/**
 * Ajustes — Settings Hub (SOTA Redesign)
 *
 * RSC Slot pattern: reads ?tab= and fetches ONLY the active tab's data.
 *
 * Tabs:
 *   - tienda       → StoreConfigClient
 *   - envios       → ShippingClient (self-fetching)
 *   - idiomas      → I18nClient (feature-gated)
 *   - analiticas   → Analytics RSC (feature-gated)
 *   - email        → EmailClient (dynamically imported)
 *   - suscripcion  → SubscriptionClient
 *   - proyecto     → ProjectTimeline
 *   - wifi         → WifiQRSection
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getSettingsTabs } from '@/lib/panel-policy'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Settings } from 'lucide-react'
import SettingsShell from './SettingsShell'

import {
    fetchStoreConfigData,
    fetchSubscriptionData,
    fetchWifiData,
} from './data'

import StoreConfigClient from '../tienda/StoreConfigClient'
import ShippingClient from '../envios/ShippingClient'
import SubscriptionClient from '../suscripcion/SubscriptionClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.section.settings') }
}

export default async function SettingsPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { lang } = await params
    const rawSearchParams = await searchParams
    const tab = typeof rawSearchParams.tab === 'string' ? rawSearchParams.tab : undefined
    const { appConfig, tenantId } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const tabs = getSettingsTabs(featureFlags)
    const activeTab = tab && tabs.some(tb => tb.key === tab) ? tab : 'tienda'

    const tabLabelMap: Record<string, string> = {
        tienda: 'storeConfig',
        envios: 'shipping',
        email: 'email',
        suscripcion: 'subscription',
        wifi: 'wifi',
        privacidad: 'privacy',
    }
    const tabsWithLabels = tabs.map(tb => ({
        ...tb,
        label: t(`panel.tabs.${tabLabelMap[tb.key] || tb.key}` as keyof typeof dictionary),
    }))

    // ── RSC Slot: fetch only the active tab's data ──
    let tabContent: React.ReactNode

    switch (activeTab) {
        case 'tienda': {
            const data = await fetchStoreConfigData(tenantId, lang)
            tabContent = (
                <StoreConfigClient
                    config={data.config}
                    featureFlags={{
                        enable_seo: data.featureFlags.enable_seo,
                        enable_social_media: data.featureFlags.enable_social_media,
                        enable_multi_language: data.featureFlags.enable_multi_language,
                    }}
                    lang={lang}
                    i18nData={data.i18nData}
                />
            )
            break
        }
        case 'envios': {
            tabContent = <ShippingClient />
            break
        }
        case 'email': {
            // Email page has complex data — we render the original page as a slot
            const { default: EmailPageContent } = await import('./email-tab')
            tabContent = <EmailPageContent lang={lang} tenantId={tenantId} />
            break
        }
        case 'suscripcion': {
            const data = await fetchSubscriptionData(tenantId, lang)
            tabContent = (
                <SubscriptionClient
                    activeModuleOrders={data.activeModuleOrders}
                    tenantStatus={data.tenantStatus}
                    maintenanceDaysRemaining={data.maintenanceDaysRemaining}
                    hasStripeCustomer={data.hasStripeCustomer}
                    lang={lang}
                />
            )
            break
        }
        case 'wifi': {
            const data = await fetchWifiData(tenantId)
            const WifiQRSection = (await import('@/components/panel/WifiQRSection')).default
            tabContent = <WifiQRSection businessName={data.businessName} />
            break
        }
        case 'privacidad': {
            const DataPrivacySection = (await import('@/components/panel/DataPrivacySection')).default
            tabContent = <DataPrivacySection lang={lang} />
            break
        }
        default:
            tabContent = null
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.section.settings')}
                subtitle={t('panel.config.subtitle')}
                icon={<Settings className="w-5 h-5" />}
            />
            <SettingsShell
                tabs={tabsWithLabels}
                activeTab={activeTab}
                lang={lang}
            >
                {tabContent}
            </SettingsShell>
        </div>
    )
}
