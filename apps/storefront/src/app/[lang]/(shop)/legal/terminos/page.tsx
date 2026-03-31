import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import type { Metadata } from 'next'
import TermsClient from './TermsClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('legal.termsTitle') || 'Terms & Conditions',
        description: t('legal.termsMeta') || 'Terms and conditions for using our online store.',
    }
}

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    let configVars = { business_name: '', domain: '', email: '' }
    try {
        const { config } = await getConfig()
        const c = config as Record<string, unknown>
        configVars = {
            business_name: String(c?.business_name || ''),
            domain: String(c?.domain || ''),
            email: String(c?.contact_email || ''),
        }
    } catch { /* defaults */ }

    return (
        <div className="container-page py-12">
            <TermsClient
                lang={lang}
                t={t}
                businessName={configVars.business_name}
                domain={configVars.domain}
                contactEmail={configVars.email}
            />
        </div>
    )
}
