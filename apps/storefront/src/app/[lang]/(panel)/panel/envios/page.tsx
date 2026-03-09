import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { Truck } from 'lucide-react'
import { withPanelGuard } from '@/lib/panel-guard'
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
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                    <Truck className="w-6 h-6 text-primary" />
                    {t('panel.shipping.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.shipping.subtitle')}
                </p>
            </div>
            <ShippingClient />
        </div>
    )
}
