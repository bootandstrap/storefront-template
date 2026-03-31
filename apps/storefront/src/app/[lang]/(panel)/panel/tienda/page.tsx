/**
 * Store Settings Page — Owner Panel
 *
 * Server component wraps StoreConfigClient with PanelPageHeader
 * and passes governance config for SOTA header consistency.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Store } from 'lucide-react'
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
    const { config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.config.title')}
                subtitle={t('panel.config.subtitle')}
                icon={<Store className="w-5 h-5" />}
            />
            <StoreConfigClient config={config} />
        </div>
    )
}
