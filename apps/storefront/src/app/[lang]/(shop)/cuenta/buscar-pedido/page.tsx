import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { Package } from 'lucide-react'
import GuestOrderLookupClient from './GuestOrderLookupClient'

export default async function BuscarPedidoPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-subtle">
                    <Package className="w-5 h-5 text-brand" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-display text-tx">
                        {t('guestOrder.title') || 'Track Your Order'}
                    </h1>
                    <p className="text-sm text-tx-muted">
                        {t('guestOrder.subtitle') || 'Enter your email and order number to check your order status.'}
                    </p>
                </div>
            </div>

            <GuestOrderLookupClient />
        </div>
    )
}
