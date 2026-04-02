/**
 * Chatbot IA — Owner Panel
 *
 * Settings + usage dashboard for the tenant's AI chatbot.
 * Gated by enable_chatbot feature flag via withPanelGuard.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Bot } from 'lucide-react'
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
    const { featureFlags, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_chatbot) {
        return <FeatureGate flag="enable_chatbot" lang={lang} />
    }

    // Extract chatbot config fields for inline editing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfgAny = config as unknown as Record<string, unknown>
    const chatbotConfig = {
        chatbot_name: cfgAny.chatbot_name ?? '',
        chatbot_tone: cfgAny.chatbot_tone ?? 'friendly',
        chatbot_welcome_message: cfgAny.chatbot_welcome_message ?? '',
        chatbot_auto_open_delay: cfgAny.chatbot_auto_open_delay ?? 0,
        chatbot_knowledge_scope: cfgAny.chatbot_knowledge_scope ?? 'full_catalog',
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.chatbot.title')}
                subtitle={t('panel.chatbot.subtitle')}
                icon={<Bot className="w-5 h-5" />}
            />
            <ChatbotPanelClient
                locale={lang}
                chatbotConfig={chatbotConfig}
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

