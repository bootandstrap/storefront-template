/**
 * Automations Dashboard — Owner Panel
 *
 * Multi-channel notification configuration: Webhook, WhatsApp, Telegram, Email.
 * Event → channel mapping matrix for order lifecycle events.
 * Gated by enable_automations feature flag (module: Automation).
 * SOTA 2026: ModuleShell wrapper with tier awareness.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
import { Zap } from 'lucide-react'
import AutomationsClient from './AutomationsClient'
import { DEFAULT_CHANNEL_CONFIG, DEFAULT_EVENT_MAPPING } from '@/lib/registries/notification-events'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.automations.title') }
}

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

    const isLocked = !featureFlags.enable_automations

    const tierInfo = {
        currentTier: featureFlags.enable_custom_webhooks ? 'Pro' : isLocked ? 'Free' : 'Básico',
        moduleKey: 'automation',
        nextTierFeatures: isLocked ? [
            t('panel.automations.feat.channels') || '4 canales de notificación',
            t('panel.automations.feat.events') || 'Matriz evento→canal',
            t('panel.automations.feat.test') || 'Envío de prueba',
        ] : !featureFlags.enable_custom_webhooks ? [
            t('panel.automations.feat.webhooks') || 'Webhooks personalizados',
            t('panel.automations.feat.api') || 'Admin API access',
        ] : undefined,
        nextTierName: isLocked ? 'Automation Básico' : !featureFlags.enable_custom_webhooks ? 'Automation Pro' : undefined,
        nextTierPrice: isLocked ? 20 : !featureFlags.enable_custom_webhooks ? 40 : undefined,
    }

    const cfgAny = config as unknown as Record<string, unknown>

    // Parse notification config with safe defaults
    const notificationChannels = (cfgAny.notification_channels ?? DEFAULT_CHANNEL_CONFIG) as typeof DEFAULT_CHANNEL_CONFIG
    const notificationEvents = (cfgAny.notification_events ?? DEFAULT_EVENT_MAPPING) as Record<string, string[]>

    return (
        <ModuleShell
            icon={<Zap className="w-5 h-5" />}
            title={t('panel.automations.title') || 'Automatizaciones'}
            subtitle={t('panel.automations.subtitle') || 'Notificaciones multicanal para eventos de tu tienda'}
            isLocked={isLocked}
            gateFlag="enable_automations"
            tierInfo={tierInfo}
            lang={lang}
        >
            <AutomationsClient
                channels={notificationChannels}
                events={notificationEvents}
                enableCustomWebhooks={!!featureFlags.enable_custom_webhooks}
                labels={{
                    tabChannels: t('panel.automations.tabFlows'),
                    tabEvents: t('panel.automations.tabTemplates'),
                    tabLog: t('panel.automations.tabLog'),
                    saveSuccess: t('panel.i18n.saveSuccess'),
                    saveError: t('panel.i18n.saveError'),
                }}
                lang={lang}
            />
        </ModuleShell>
    )
}
