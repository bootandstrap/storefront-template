import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import type { Metadata } from 'next'
import CookiePolicyClient from './CookiePolicyClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('legal.cookiesTitle') || 'Cookie Policy',
        description: t('legal.cookiesMeta') || 'Details about how we use cookies.',
    }
}

export default async function CookiePolicyPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    let businessName = ''
    let contactEmail = ''
    try {
        const { config } = await getConfig()
        businessName = config?.business_name || ''
        contactEmail = String((config as Record<string, unknown>)?.contact_email || '')
    } catch { /* defaults */ }

    return (
        <div className="container-page py-12">
            <CookiePolicyClient
                lang={lang}
                businessName={businessName}
                contactEmail={contactEmail}
            />
        </div>
    )
}
