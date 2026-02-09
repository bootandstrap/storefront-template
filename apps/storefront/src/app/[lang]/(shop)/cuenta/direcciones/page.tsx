import { Suspense } from 'react'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAuthCustomerAddresses } from '@/lib/medusa/auth-medusa'
import AddressesClient from './AddressesClient'
import { MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Addresses content (Suspense-wrapped) ─────────────────────
async function AddressesContent({ lang }: { lang: string }) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const addresses = await getAuthCustomerAddresses()

    return <AddressesClient addresses={addresses} dictionary={dictionary} lang={lang} />
}

// ─── Loading skeleton ─────────────────────────────────────────
function AddressesSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-7 w-40 bg-text-muted/10 rounded animate-pulse" />
                <div className="h-9 w-32 bg-text-muted/10 rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                    <div key={i} className="glass rounded-xl p-5 animate-pulse">
                        <div className="flex items-start gap-3">
                            <div className="w-4 h-4 rounded bg-text-muted/10 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-text-muted/10 rounded" />
                                <div className="h-3 w-40 bg-text-muted/10 rounded" />
                                <div className="h-3 w-28 bg-text-muted/10 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────
export default async function DireccionesPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params

    return (
        <Suspense fallback={<AddressesSkeleton />}>
            <AddressesContent lang={lang} />
        </Suspense>
    )
}
