/**
 * Automations Dashboard — Owner Panel
 *
 * Multi-channel notification configuration: Webhook, WhatsApp, Telegram, Email.
 * Event → channel mapping matrix for order lifecycle events.
 * Gated by enable_automations feature flag (module: Automation).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Zap } from 'lucide-react'
import AutomationsClient from './AutomationsClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.automations.title') }
}

import { DEFAULT_CHANNEL_CONFIG, DEFAULT_EVENT_MAPPING } from '@/lib/registries/notification-events'

export default async function AutomationsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_automations) {
        return <FeatureGate flag="enable_automations" lang={lang} />
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfgAny = config as unknown as Record<string, unknown>

    // Parse notification config with safe defaults
    const notificationChannels = (cfgAny.notification_channels ?? DEFAULT_CHANNEL_CONFIG) as typeof DEFAULT_CHANNEL_CONFIG
    const notificationEvents = (cfgAny.notification_events ?? DEFAULT_EVENT_MAPPING) as Record<string, string[]>

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.automations.title')}
                subtitle={t('panel.automations.subtitle')}
                icon={<Zap className="w-5 h-5" />}
            />
            <AutomationsClient
                channels={notificationChannels}
                events={notificationEvents}
                labels={{
                    tabChannels: t('panel.automations.tabFlows'),
                    tabEvents: t('panel.automations.tabTemplates'),
                    tabLog: t('panel.automations.tabLog'),
                    saveSuccess: t('panel.i18n.saveSuccess'),
                    saveError: t('panel.i18n.saveError'),
                }}
                lang={lang}
            />
        </div>
    )
}
