/**
 * Root page.tsx — redirects bare domain to default locale.
 *
 * Visitors hitting `/` get redirected to `/{preferred-locale}/`
 * based on browser language, cookie, or admin config.
 */

import { redirect } from 'next/navigation'
import { getPreferredLocale } from '@/lib/i18n/locale'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
    const { config } = await getConfig()
    const locale = await getPreferredLocale(config.language)
    redirect(`/${locale}`)
}
