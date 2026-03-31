/**
 * Product Badges — Owner Panel
 *
 * Fetches products from Medusa Admin API and renders BadgesClient
 * for interactive badge toggling via product metadata.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Award } from 'lucide-react'
import { getProductsWithBadges } from './actions'
import BadgesClient from './BadgesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.badges.title') }
}

export default async function ProductBadgesPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_product_badges) {
        return <FeatureGate flag="enable_product_badges" lang={lang} />
    }

    const { products, error } = await getProductsWithBadges()

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.badges.title')}
                subtitle={t('panel.badges.subtitle')}
                icon={<Award className="w-5 h-5" />}
            />
            <BadgesClient products={products} error={error} />
        </div>
    )
}
