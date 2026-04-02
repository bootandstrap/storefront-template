import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { faqPageJsonLD, safeJsonLd } from '@/lib/seo/jsonld'
import { ChevronDown, HelpCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('faq.title'),
        description: t('faq.metaDescription'),
    }
}

export default async function FaqPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { config } = await getConfig()

    // FAQ items from dictionary — easy for tenants to customize via i18n
    const faqItems = [
        { question: t('faq.q1'), answer: t('faq.a1') },
        { question: t('faq.q2'), answer: t('faq.a2') },
        { question: t('faq.q3'), answer: t('faq.a3') },
        { question: t('faq.q4'), answer: t('faq.a4') },
        { question: t('faq.q5'), answer: t('faq.a5') },
        { question: t('faq.q6'), answer: t('faq.a6') },
    ]

    const jsonLd = faqPageJsonLD(faqItems)

    return (
        <div className="container-page py-12">
            {/* FAQPage JSON-LD for Google rich results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
            />

            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                        <HelpCircle className="w-7 h-7 text-brand" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">
                        {t('faq.title')}
                    </h1>
                    <p className="text-tx-muted text-lg">
                        {t('faq.subtitle')}
                    </p>
                </div>

                <div className="space-y-3">
                    {faqItems.map((item, index) => (
                        <details
                            key={index}
                            className="group glass rounded-xl border border-white/5 overflow-hidden"
                        >
                            <summary className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-white/[0.03] transition-colors">
                                <span className="font-medium text-tx pr-4">
                                    {item.question}
                                </span>
                                <ChevronDown className="w-5 h-5 text-tx-muted shrink-0 transition-transform duration-200 group-open:rotate-180" />
                            </summary>
                            <div className="px-5 pb-5 text-tx-sec leading-relaxed">
                                {item.answer}
                            </div>
                        </details>
                    ))}
                </div>

                {/* Contact CTA */}
                {config.whatsapp_number && (
                    <div className="mt-10 text-center glass rounded-2xl p-8">
                        <p className="text-tx-muted mb-4">
                            {t('faq.contactHint')}
                        </p>
                        <a
                            href={`https://wa.me/${config.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp inline-flex items-center gap-2"
                        >
                            {t('faq.contactCta')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
