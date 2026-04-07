/**
 * Store Settings Page — Owner Panel
 *
 * Server component wraps StoreConfigClient with PanelPageHeader
 * and passes governance config + feature flags for SOTA module deduplication.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Settings } from 'lucide-react'
import StoreConfigClient from './StoreConfigClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.config.title') }
}

export default async function StoreConfigPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { config, featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.config.title')}
                subtitle={t('panel.config.subtitle')}
                icon={<Settings className="w-5 h-5" />}
            />
            <StoreConfigClient
                config={config}
                featureFlags={{
                    enable_seo: featureFlags.enable_seo,
                    enable_social_media: featureFlags.enable_social_media,
                }}
                lang={lang}
            />
        </div>
    )
}
