/**
 * FeatureGate — Module Showcase upsell screen
 *
 * Renders a premium "module showcase" card when a feature is disabled
 * because the tenant hasn't purchased the corresponding module.
 *
 * Only shown to owner/super_admin users. Customers see a clean redirect.
 * Includes a reassuring note that the public does NOT see this screen.
 *
 * Usage in panel pages:
 *   if (!featureFlags.enable_analytics) {
 *       return <FeatureGate flag="enable_analytics" lang={lang} />
 *   }
 */

import Link from 'next/link'
import { FEATURE_GATE_MAP, getModuleInfoUrl } from '@/lib/feature-gate-config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { Check, ArrowRight, Info, Sparkles, Zap, Shield } from 'lucide-react'

interface FeatureGateProps {
    /** The feature flag key that is blocking access */
    flag: string
    /** Current locale */
    lang: string
}

/** Benefits per module — what the owner gets when they upgrade */
const MODULE_BENEFITS: Record<string, { icon: React.ReactNode; key: string }[]> = {
    ecommerce: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.products' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.orders' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.payments' },
    ],
    seo: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.analytics' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.seo' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.reports' },
    ],
    chatbot: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.aiChat' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.support247' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.leadCapture' },
    ],
    crm: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.contacts' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.segments' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.export' },
    ],
    sales_channels: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.whatsapp' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.multichannel' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.quickCheckout' },
    ],
    i18n: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.languages' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.currencies' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.global' },
    ],
    auth_advanced: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.socialLogin' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.twoFactor' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.sso' },
    ],
    email_marketing: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.campaigns' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.automation' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.templates' },
    ],
}

export default async function FeatureGate({ flag, lang }: FeatureGateProps) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const entry = FEATURE_GATE_MAP[flag]
    const icon = entry?.icon ?? '🔒'
    const moduleName = entry ? t(entry.moduleNameKey) : flag
    const moduleUrl = getModuleInfoUrl(flag, lang)
    const moduleKey = entry?.moduleKey ?? ''
    const benefits = MODULE_BENEFITS[moduleKey] ?? []

    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[75vh] py-12 px-2 sm:px-4 space-y-8">
            <div className="relative w-full max-w-5xl rounded-[2.5rem] overflow-hidden bg-surface-0 border border-surface-2 group shadow-2xl shadow-primary/5 transition-all duration-700 hover:shadow-primary/10 hover:-translate-y-1">
                {/* Organic backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-surface-1 opacity-50 transition-opacity duration-700 group-hover:opacity-100 mix-blend-multiply pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
                    {/* Left Column: Copy & CTA */}
                    <div className="flex flex-col justify-between p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-surface-2">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-1 border border-surface-2 text-xs font-semibold uppercase tracking-widest text-text-muted mb-8 mb-10 transition-colors group-hover:border-primary/20 group-hover:text-primary">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{t('featureGate.premiumModule') || 'Premium Module'}</span>
                            </div>

                            <h1 className="text-4xl lg:text-5xl font-display font-bold text-text-primary tracking-tight leading-[1.1] mb-6">
                                {moduleName}
                            </h1>

                            <p className="text-lg text-text-secondary leading-relaxed font-light mb-10 max-w-md">
                                {t('featureGate.description').replace('{module}', moduleName)}
                            </p>
                        </div>

                        <div className="space-y-8 mt-4">
                            <a
                                href={moduleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/btn relative overflow-hidden rounded-full bg-text-primary text-surface-0 px-8 py-4 text-sm font-medium transition-all duration-300 hover:bg-primary inline-flex items-center gap-3 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20"
                            >
                                <span className="relative z-10">{t('featureGate.cta')}</span>
                                <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 animate-slide-right group-hover/btn:translate-x-1" />
                            </a>

                            <div className="flex items-center">
                                <Link
                                    href={`/${lang}/panel`}
                                    className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors hover:underline underline-offset-4 inline-flex items-center gap-2"
                                >
                                    <span>←</span> {t('featureGate.backToPanel')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Benefits Showcase & Aesthetics */}
                    <div className="relative p-10 lg:p-16 bg-surface-1 flex flex-col justify-center overflow-hidden">
                        {/* Abstract graphic element in background */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_50%)] opacity-[0.04] animate-pulse pointer-events-none blur-3xl transition-opacity duration-1000 group-hover:opacity-[0.08]" />

                        <div className="relative z-10 max-w-md mx-auto w-full">
                            <div className="w-16 h-16 rounded-2xl bg-surface-0 border border-surface-2 shadow-sm flex items-center justify-center text-3xl mb-12 transform transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                                {icon}
                            </div>

                            {benefits.length > 0 && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest pl-1">
                                        {t('featureGate.whatYouGet') || 'What you get'}
                                    </h3>
                                    <ul className="space-y-5">
                                        {benefits.map((benefit, i) => (
                                            <li key={i} className="flex items-start gap-4 flex-nowrap group/item cursor-default">
                                                <div className="w-10 h-10 rounded-full bg-surface-0 border border-surface-2 flex items-center justify-center flex-shrink-0 text-text-secondary group-hover/item:text-primary transition-colors duration-300 group-hover/item:border-primary/30 group-hover/item:shadow-sm">
                                                    {benefit.icon}
                                                </div>
                                                <div className="pt-2.5 font-medium text-text-primary text-sm leading-snug group-hover/item:text-primary transition-colors duration-300">
                                                    {t(benefit.key) || benefit.key}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Owner-only reassurance note */}
            <div className="max-w-md w-full animate-fade-in-up-delay">
                <div className="mx-auto flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-surface-0/60 border border-surface-2 text-center text-text-muted transition-colors hover:text-text-secondary hover:bg-surface-0/80">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-medium tracking-wide">
                        {t('featureGate.ownerOnly')}
                    </p>
                </div>
            </div>
        </div>
    )
}
