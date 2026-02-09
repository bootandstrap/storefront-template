/**
 * [lang] layout — locale resolution + I18nProvider
 *
 * This dynamic segment validates the locale, loads the dictionary,
 * and wraps children in I18nProvider for client-side translations.
 */

import { redirect } from 'next/navigation'
import { getDictionary, isValidLocale, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { getPreferredLocale } from '@/lib/i18n/locale'
import { I18nProvider } from '@/lib/i18n/provider'
import { getConfig } from '@/lib/config'

export async function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ lang: locale }))
}

export const dynamic = 'force-dynamic'

export default async function LangLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params

    // Validate locale
    if (!isValidLocale(lang)) {
        // Invalid locale → redirect to preferred locale
        const { config } = await getConfig()
        const preferred = await getPreferredLocale(config.language)
        redirect(`/${preferred}`)
    }

    const locale = lang as Locale
    const dictionary = await getDictionary(locale)

    return (
        <I18nProvider locale={locale} dictionary={dictionary}>
            {children}
        </I18nProvider>
    )
}
