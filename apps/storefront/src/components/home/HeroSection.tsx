import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MessageCircle } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator, localizedHref, type Locale } from '@/lib/i18n'

interface HeroSectionProps {
    config: {
        business_name?: string | null
        hero_title?: string | null
        hero_subtitle?: string | null
        hero_image?: string | null
        whatsapp_number?: string | null
    }
    featureFlags: {
        enable_whatsapp_contact?: boolean
    }
    dictionary: Dictionary
    lang: string
}

export default function HeroSection({ config, featureFlags, dictionary, lang }: HeroSectionProps) {
    const t = createTranslator(dictionary)

    return (
        <section data-testid="hero-section" className="hero-section relative overflow-hidden rounded-2xl min-h-[400px] md:min-h-[500px] flex items-center">
            {/* Background */}
            {config.hero_image ? (
                <Image
                    src={config.hero_image}
                    alt={config.hero_title || config.business_name || ''}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70">
                    {/* Subtle dot grid — crafted, not AI-generated */}
                    <div
                        className="absolute inset-0 opacity-[0.15]"
                        style={{
                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                            backgroundSize: '32px 32px',
                        }}
                    />
                </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

            {/* Content */}
            <div className="relative z-10 container-page py-16 md:py-20">
                <div className="max-w-xl space-y-6">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white leading-tight">
                        {config.hero_title || t('hero.defaultTitle')}
                    </h1>
                    {(config.hero_subtitle) && (
                        <p className="text-lg md:text-xl text-white/90">
                            {config.hero_subtitle}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={localizedHref(lang as Locale, 'products', dictionary)}
                            className="btn btn-primary text-base px-6 py-3"
                        >
                            {t('hero.viewProducts')}
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>

                        {featureFlags.enable_whatsapp_contact && config.whatsapp_number && (
                            <a
                                href={`https://wa.me/${config.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-whatsapp text-base px-6 py-3"
                            >
                                <MessageCircle className="w-4 h-4" />
                                {t('checkout.whatsapp')}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
