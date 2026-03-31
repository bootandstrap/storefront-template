import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { RotateCcw, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('returnPolicy.title'),
        description: t('returnPolicy.metaDescription'),
    }
}

export default async function ReturnPolicyPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { config } = await getConfig()

    const steps = [
        { icon: Clock, title: t('returnPolicy.step1Title'), desc: t('returnPolicy.step1Desc') },
        { icon: RotateCcw, title: t('returnPolicy.step2Title'), desc: t('returnPolicy.step2Desc') },
        { icon: CheckCircle, title: t('returnPolicy.step3Title'), desc: t('returnPolicy.step3Desc') },
    ]

    return (
        <div className="container-page py-12">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                        <RotateCcw className="w-7 h-7 text-brand" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">
                        {t('returnPolicy.title')}
                    </h1>
                    <p className="text-tx-muted text-lg">
                        {t('returnPolicy.subtitle')}
                    </p>
                </div>

                {/* Policy summary card */}
                <div className="glass rounded-2xl p-8 mb-8 border border-white/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                        <div>
                            <h2 className="font-semibold text-tx mb-2">
                                {t('returnPolicy.summaryTitle')}
                            </h2>
                            <p className="text-tx-sec leading-relaxed">
                                {t('returnPolicy.summaryText')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <h2 className="text-xl font-semibold text-tx mb-6">
                    {t('returnPolicy.howItWorks')}
                </h2>
                <div className="space-y-4 mb-8">
                    {steps.map((step, i) => {
                        const Icon = step.icon
                        return (
                            <div key={i} className="glass rounded-xl p-5 flex items-start gap-4 border border-white/5">
                                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-brand" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-tx mb-1">
                                        {i + 1}. {step.title}
                                    </h3>
                                    <p className="text-sm text-tx-muted">{step.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Conditions */}
                <div className="glass rounded-2xl p-8 mb-8">
                    <h2 className="font-semibold text-tx mb-4">
                        {t('returnPolicy.conditionsTitle')}
                    </h2>
                    <ul className="space-y-2 text-sm text-tx-sec">
                        <li className="flex items-start gap-2">
                            <span className="text-brand mt-0.5">•</span>
                            {t('returnPolicy.condition1')}
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-brand mt-0.5">•</span>
                            {t('returnPolicy.condition2')}
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-brand mt-0.5">•</span>
                            {t('returnPolicy.condition3')}
                        </li>
                    </ul>
                </div>

                {/* Contact CTA */}
                {config.whatsapp_number && (
                    <div className="text-center glass rounded-2xl p-8">
                        <p className="text-tx-muted mb-4">
                            {t('returnPolicy.contactHint')}
                        </p>
                        <a
                            href={`https://wa.me/${config.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp inline-flex items-center gap-2"
                        >
                            {t('returnPolicy.contactCta')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
