import { getConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import FavoritosClient from './FavoritosClient'

export const dynamic = 'force-dynamic'

export default async function FavoritosPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { featureFlags } = await getConfig()

    // Gate: wishlist must be enabled
    if (!featureFlags.enable_wishlist) {
        redirect(`/${lang}/cuenta`)
    }

    return <FavoritosClient />
}
