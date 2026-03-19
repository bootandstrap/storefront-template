/**
 * Chatbot IA — Owner Panel
 *
 * Settings + usage dashboard for the tenant's AI chatbot.
 * Gated by enable_chatbot feature flag via withPanelGuard.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import { ChatbotPanelClient } from './ChatbotPanelClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.chatbot.title') }
}

export default async function ChatbotPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_chatbot) {
        return <FeatureGate flag="enable_chatbot" lang={lang} />
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.chatbot.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.chatbot.subtitle')}
                </p>
            </div>
            <ChatbotPanelClient
                locale={lang}
                labels={{
                    model: t('panel.chatbot.model'),
                    messages: t('panel.chatbot.messages'),
                    cost: t('panel.chatbot.cost'),
                    today: t('panel.chatbot.today'),
                    usageChart: t('panel.chatbot.usageChart'),
                    settings: t('panel.chatbot.settings'),
                    aiModel: t('panel.chatbot.aiModel'),
                    temperature: t('panel.chatbot.temperature'),
                    welcomeMessage: t('panel.chatbot.welcomeMessage'),
                    welcomePlaceholder: t('panel.chatbot.welcomePlaceholder'),
                    modelNano: t('panel.chatbot.modelNano'),
                    modelMini: t('panel.chatbot.modelMini'),
                    tempPrecise: t('panel.chatbot.tempPrecise'),
                    tempBalanced: t('panel.chatbot.tempBalanced'),
                    tempNatural: t('panel.chatbot.tempNatural'),
                    rateAnonymous: t('panel.chatbot.rateAnonymous'),
                    rateRegistered: t('panel.chatbot.rateRegistered'),
                    ratePaying: t('panel.chatbot.ratePaying'),
                }}
            />
        </div>
    )
}
