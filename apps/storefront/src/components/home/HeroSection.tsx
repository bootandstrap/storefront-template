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
        hero_badge?: string | null
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
        <section
            data-testid="hero-section"
            className="hero-section relative overflow-hidden rounded-2xl min-h-[420px] md:min-h-[520px] flex items-center"
        >
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
                <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand to-brand-400">
                    {/* Geometric dot pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.12]"
                        style={{
                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                            backgroundSize: '32px 32px',
                        }}
                    />
                    {/* Subtle radial glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
            )}

            {/* Multi-stop overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

            {/* Content — staggered entrance */}
            <div className="relative z-10 container-page py-16 md:py-20">
                <div className="max-w-xl space-y-5">
                    {/* Optional badge */}
                    {config.hero_badge && (
                        <div className="animate-slide-up-stagger stagger-1">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/20">
                                <span className="w-2 h-2 rounded-full bg-sec animate-pulse" />
                                {config.hero_badge}
                            </span>
                        </div>
                    )}

                    {/* Title with stagger */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white leading-tight animate-slide-up-stagger stagger-2">
                        {config.hero_title || t('hero.defaultTitle')}
                    </h1>

                    {/* Subtitle with stagger */}
                    {config.hero_subtitle && (
                        <p className="text-lg md:text-xl text-white/85 leading-relaxed animate-slide-up-stagger stagger-3">
                            {config.hero_subtitle}
                        </p>
                    )}

                    {/* CTAs with stagger + shimmer */}
                    <div className="flex flex-wrap gap-3 pt-2 animate-slide-up-stagger stagger-4">
                        <Link
                            href={localizedHref(lang as Locale, 'products', dictionary)}
                            className="btn btn-primary btn-shimmer text-base px-7 py-3.5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                        >
                            {t('hero.viewProducts')}
                            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </Link>

                        {featureFlags.enable_whatsapp_contact && config.whatsapp_number && (
                            <a
                                href={`https://wa.me/${config.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-whatsapp text-base px-6 py-3.5 hover:scale-[1.02] transition-all duration-300"
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
