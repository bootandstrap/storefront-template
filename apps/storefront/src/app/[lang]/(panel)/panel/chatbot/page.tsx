/**
 * Chatbot IA — Owner Panel
 *
 * Settings + usage dashboard for the tenant's AI chatbot.
 * Gated by enable_chatbot feature flag.
 */

import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { shouldAllowPanelRoute, getPanelFallbackRoute } from '@/lib/panel-route-guards'
import { redirect } from 'next/navigation'
import { ChatbotPanelClient } from './ChatbotPanelClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.chatbot.title') || 'Chatbot IA' }
}

export default async function ChatbotPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!shouldAllowPanelRoute('chatbot', featureFlags)) {
        redirect(getPanelFallbackRoute(lang))
    }

    if (!featureFlags.enable_chatbot) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.chatbot.title') || 'Chatbot IA'}
                    </h1>
                </div>
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">🤖</div>
                    <p className="text-text-muted">
                        {t('panel.chatbot.disabled') || 'El chatbot no está habilitado para este plan.'}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                        {t('panel.chatbot.enableHint') || 'Contacta con soporte para activar esta función.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.chatbot.title') || 'Chatbot IA'}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.chatbot.subtitle') || 'Configuración y métricas de uso del asistente virtual'}
                </p>
            </div>
            <ChatbotPanelClient locale={lang} />
        </div>
    )
}
