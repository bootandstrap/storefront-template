import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import type { Locale } from '@/lib/i18n'
import CompararClient from './CompararClient'

export const dynamic = 'force-dynamic'

export default async function CompararPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const { featureFlags } = await getConfig()

    if (!featureFlags.enable_product_comparisons) {
        redirect(`/${lang}/productos`)
    }

    return <CompararClient lang={lang} />
}
