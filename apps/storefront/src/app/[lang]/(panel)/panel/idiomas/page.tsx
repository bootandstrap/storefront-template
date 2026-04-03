/**
 * i18n & Multi-currency Dashboard — Owner Panel
 *
 * Language toggles, translation progress, currency config.
 * Gated by enable_multi_language feature flag (module: i18n).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Globe } from 'lucide-react'
import I18nClient from './I18nClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.i18n.title') }
}

export default async function I18nPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags, config, planLimits } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_multi_language) {
        return <FeatureGate flag="enable_multi_language" lang={lang} />
    }

    const languageData = {
        activeLanguages: config.active_languages,
        activeCurrencies: config.active_currencies,
        defaultCurrency: config.default_currency,
        defaultLanguage: config.language,
        maxLanguages: planLimits.max_languages,
        maxCurrencies: planLimits.max_currencies,
    }

    const panelLang = (config as Record<string, unknown>).panel_language as string | null ?? config.language

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.i18n.title')}
                subtitle={t('panel.i18n.subtitle')}
                icon={<Globe className="w-5 h-5" />}
                badge={config.active_languages.length}
            />
            <I18nClient
                data={languageData}
                panelLang={panelLang}
                labels={{
                    activeLanguages: t('panel.i18n.activeLanguages'),
                    activeCurrencies: t('panel.i18n.activeCurrencies'),
                    defaultLanguage: t('panel.i18n.defaultLanguage'),
                    defaultCurrency: t('panel.i18n.defaultCurrency'),
                    translationProgress: t('panel.i18n.translationProgress'),
                    currencyConfig: t('panel.i18n.currencyConfig'),
                    languageSettings: t('panel.i18n.languageSettings'),
                    usageOf: t('panel.i18n.usageOf'),
                    addLanguage: t('panel.i18n.addLanguage'),
                    addCurrency: t('panel.i18n.addCurrency'),
                    tabLanguages: t('panel.i18n.tabLanguages'),
                    tabCurrencies: t('panel.i18n.tabCurrencies'),
                    tabTranslations: t('panel.i18n.tabTranslations'),
                    panelLanguage: t('panel.i18n.panelLanguage'),
                    panelLangDescription: t('panel.i18n.panelLangDescription'),
                    saveSuccess: t('panel.i18n.saveSuccess'),
                    saveError: t('panel.i18n.saveError'),
                    limitReached: t('panel.i18n.limitReached'),
                    upgradePrompt: t('panel.i18n.upgradePrompt'),
                    cannotDeactivateLast: t('panel.i18n.cannotDeactivateLast'),
                }}
                lang={lang}
            />
        </div>
    )
}
