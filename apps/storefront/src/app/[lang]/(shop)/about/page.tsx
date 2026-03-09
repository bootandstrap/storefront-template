import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { Store, Heart, Shield, Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('about.title'),
        description: t('about.metaDescription'),
    }
}

export default async function AboutPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { config } = await getConfig()

    const values = [
        { icon: Heart, title: t('about.value1Title'), desc: t('about.value1Desc') },
        { icon: Shield, title: t('about.value2Title'), desc: t('about.value2Desc') },
        { icon: Truck, title: t('about.value3Title'), desc: t('about.value3Desc') },
        { icon: Store, title: t('about.value4Title'), desc: t('about.value4Desc') },
    ]

    return (
        <div className="container-page py-12">
            <div className="max-w-3xl mx-auto">
                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                        <Store className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-display text-text-primary mb-4">
                        {t('about.title')}
                    </h1>
                    <p className="text-text-muted text-lg leading-relaxed">
                        {t('about.intro')}
                    </p>
                </div>

                {/* Story */}
                <div className="glass rounded-2xl p-8 mb-10">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        {t('about.storyTitle')}
                    </h2>
                    <p className="text-text-secondary leading-relaxed mb-4">
                        {t('about.story1')}
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                        {t('about.story2')}
                    </p>
                </div>

                {/* Values */}
                <h2 className="text-xl font-semibold text-text-primary mb-6 text-center">
                    {t('about.valuesTitle')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {values.map((v, i) => {
                        const Icon = v.icon
                        return (
                            <div key={i} className="glass rounded-xl p-6 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-text-primary">{v.title}</h3>
                                </div>
                                <p className="text-sm text-text-muted">{v.desc}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Contact CTA */}
                {config.whatsapp_number && (
                    <div className="text-center glass rounded-2xl p-8">
                        <p className="text-text-muted mb-4">
                            {t('about.contactHint')}
                        </p>
                        <a
                            href={`https://wa.me/${config.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp inline-flex items-center gap-2"
                        >
                            {t('about.contactCta')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
