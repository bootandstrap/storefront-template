/**
 * Chatbot IA — Owner Panel
 *
 * Settings + usage dashboard for the tenant's AI chatbot.
 * Gated by enable_chatbot feature flag via withPanelGuard.
 * SOTA 2026: ModuleShell wrapper with tier-aware usage meter.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
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
    const { featureFlags, planLimits, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_chatbot
    const maxMessages = planLimits.max_chatbot_messages_month ?? 500

    const tierInfo = {
        currentTier: maxMessages >= 5000 ? 'Pro' : isLocked ? 'Free' : 'Básico',
        moduleKey: 'chatbot',
        nextTierFeatures: isLocked ? [
            t('panel.chatbot.feat.widget') || 'Widget IA en tu tienda',
            t('panel.chatbot.feat.messages') || '500 mensajes/mes',
            t('panel.chatbot.feat.config') || 'Configuración de tono y modelo',
        ] : maxMessages < 5000 ? [
            t('panel.chatbot.feat.moreMessages') || '5.000 mensajes/mes',
            t('panel.chatbot.feat.rag') || 'RAG avanzado con catálogo',
            t('panel.chatbot.feat.integrations') || 'Integraciones (Calendly, Google)',
        ] : undefined,
        nextTierName: isLocked ? 'Chatbot Básico' : maxMessages < 5000 ? 'Chatbot Pro' : undefined,
        nextTierPrice: isLocked ? 20 : maxMessages < 5000 ? 40 : undefined,
    }

    // Extract chatbot config fields for inline editing
    const cfgAny = config as unknown as Record<string, unknown>
    const chatbotConfig = {
        chatbot_name: cfgAny.chatbot_name ?? '',
        chatbot_tone: cfgAny.chatbot_tone ?? 'friendly',
        chatbot_welcome_message: cfgAny.chatbot_welcome_message ?? '',
        chatbot_auto_open_delay: cfgAny.chatbot_auto_open_delay ?? 0,
        chatbot_knowledge_scope: cfgAny.chatbot_knowledge_scope ?? 'full_catalog',
    }

    return (
        <ModuleShell
            icon={<Bot className="w-5 h-5" />}
            title={t('panel.chatbot.title') || 'Chatbot IA'}
            subtitle={t('panel.chatbot.subtitle') || 'Asistente inteligente para tu tienda'}
            isLocked={isLocked}
            gateFlag="enable_chatbot"
            tierInfo={tierInfo}
            usageMeter={!isLocked ? {
                current: 0, // TODO: wire to real chatbot usage from chat_messages count
                max: maxMessages,
                label: t('panel.chatbot.messagesMonth') || 'mensajes/mes',
            } : undefined}
            lang={lang}
        >
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
        </ModuleShell>
    )
}
