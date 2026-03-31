/**
 * Shipping Page — Owner Panel
 *
 * Server component wraps ShippingClient with PanelPageHeader
 * for SOTA header consistency and governance integration.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Truck } from 'lucide-react'
import ShippingClient from './ShippingClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.shipping.title') }
}

export default async function ShippingPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    await withPanelGuard()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.shipping.title')}
                subtitle={t('panel.shipping.subtitle')}
                icon={<Truck className="w-5 h-5" />}
            />
            <ShippingClient />
        </div>
    )
}
