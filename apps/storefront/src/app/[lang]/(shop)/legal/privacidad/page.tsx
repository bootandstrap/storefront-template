import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import type { Metadata } from 'next'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('legal.privacyTitle') || 'Privacy Policy',
        description: t('legal.privacyMeta') || 'How we collect, use, and protect your personal data.',
    }
}

export default async function PrivacyPolicyPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
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
    } catch { /* use defaults */ }

    return (
        <div className="container-page py-12">
            <PrivacyPolicyClient
                lang={lang}
                t={t}
                businessName={configVars.business_name}
                domain={configVars.domain}
                contactEmail={configVars.email}
            />
        </div>
    )
}
