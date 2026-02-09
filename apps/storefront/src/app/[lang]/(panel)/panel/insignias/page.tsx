/**
 * Product Badges — Owner Panel
 *
 * Fetches products from Medusa Admin API and renders BadgesClient
 * for interactive badge toggling via product metadata.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
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
    await params
    const { products, error } = await getProductsWithBadges()

    return (
        <div className="space-y-6">
            <BadgesClient products={products} error={error} />
        </div>
    )
}
