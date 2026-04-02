/**
 * Automations Dashboard — Owner Panel
 *
 * Automation flows, templates, execution log.
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

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.automations.title')}
                subtitle={t('panel.automations.subtitle')}
                icon={<Zap className="w-5 h-5" />}
            />
            <AutomationsClient
                automationConfig={{
                    webhook_notification_email: cfgAny.webhook_notification_email ?? '',
                }}
                labels={{
                    activeFlows: t('panel.automations.activeFlows'),
                    executionsToday: t('panel.automations.executionsToday'),
                    successRate: t('panel.automations.successRate'),
                    templates: t('panel.automations.templates'),
                    executionLog: t('panel.automations.executionLog'),
                    createFlow: t('panel.automations.createFlow'),
                    tabFlows: t('panel.automations.tabFlows'),
                    tabTemplates: t('panel.automations.tabTemplates'),
                    tabLog: t('panel.automations.tabLog'),
                }}
                lang={lang}
            />
        </div>
    )
}
