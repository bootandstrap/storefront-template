/**
 * GhostPreview — Ghost Mode for Feature-Gated Module Pages
 *
 * Replaces the full-page FeatureGate blocker with a "ghost" preview
 * that shows the REAL module UI in a blurred, non-interactive state
 * with a floating upsell overlay.
 *
 * Design philosophy: Let the owner SEE what they're missing.
 * A blurred preview of real UI is 10x more compelling than a
 * generic "Premium Module" card with stock benefits.
 *
 * Two modes:
 *   1. `children` provided → wraps the real component in blur+overlay
 *   2. `children` not provided → shows a skeleton ghost with mockup UI
 *
 * Usage:
 *   // Before (old pattern):
 *   if (!featureFlags.enable_pos) {
 *       return <FeatureGate flag="enable_pos" lang={lang} />
 *   }
 *
 *   // After (ghost preview):
 *   if (!featureFlags.enable_pos) {
 *       return <GhostPreview flag="enable_pos" lang={lang}>
 *           <POSClient {...props} />  // Real UI rendered but frozen
 *       </GhostPreview>
 *   }
 *
 *   // Or without children (auto-skeleton):
 *   if (!featureFlags.enable_pos) {
 *       return <GhostPreview flag="enable_pos" lang={lang} />
 *   }
 *
 * @module GhostPreview
 * @locked 🟡 YELLOW — governance UI layer
 */

import Link from 'next/link'
import { FEATURE_GATE_MAP, getModuleActivationUrl, getModuleInfoUrl } from '@/lib/feature-gate-config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { Sparkles, ArrowRight, Lock, Eye, Zap, Shield, Check } from 'lucide-react'

interface GhostPreviewProps {
    /** The feature flag key that is blocking access */
    flag: string
    /** Current locale */
    lang: string
    /** Optional: real module UI to show blurred. If omitted, renders a ghost skeleton. */
    children?: React.ReactNode
}

/** Benefits per module — reused from FeatureGate for consistency */
const MODULE_BENEFITS: Record<string, { icon: React.ReactNode; key: string }[]> = {
    ecommerce: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.products' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.orders' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.payments' },
    ],
    seo: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.analytics' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.seo' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.reports' },
    ],
    chatbot: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.aiChat' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.support247' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.leadCapture' },
    ],
    crm: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.contacts' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.segments' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.export' },
    ],
    sales_channels: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.whatsapp' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.multichannel' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.quickCheckout' },
    ],
    i18n: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.languages' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.currencies' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.global' },
    ],
    auth_advanced: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.socialLogin' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.twoFactor' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.sso' },
    ],
    email_marketing: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.campaigns' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.automation' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.templates' },
    ],
    pos: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.posQuickSale' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.posMultiDevice' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.posOffline' },
    ],
    capacidad: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.trafficExpansion' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.trafficAnalytics' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.trafficAutoscale' },
    ],
    rrss: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.socialLinks' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.socialProof' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.socialSharing' },
    ],
    automation: [
        { icon: <Zap className="w-3.5 h-3.5" />, key: 'featureGate.benefits.adminApi' },
        { icon: <Shield className="w-3.5 h-3.5" />, key: 'featureGate.benefits.webhooks' },
        { icon: <Sparkles className="w-3.5 h-3.5" />, key: 'featureGate.benefits.integrations' },
    ],
}

/**
 * GhostSkeleton — Auto-generated mockup UI for when children are not provided.
 * Simulates a realistic admin table with header, controls, and rows.
 */
function GhostSkeleton() {
    return (
        <div className="p-6 space-y-6 opacity-60">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-6 w-48 rounded-lg bg-sf-2 animate-pulse" />
                    <div className="h-3 w-72 rounded-md bg-sf-2/60 animate-pulse" />
                </div>
                <div className="h-10 w-32 rounded-xl bg-sf-2 animate-pulse" />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3">
                <div className="h-9 w-64 rounded-lg bg-sf-2/50 animate-pulse" />
                <div className="h-9 w-24 rounded-lg bg-sf-2/50 animate-pulse" />
                <div className="h-9 w-24 rounded-lg bg-sf-2/50 animate-pulse" />
            </div>

            {/* Table header */}
            <div className="flex items-center gap-4 h-10 border-b border-sf-2/50 px-2">
                {[120, 180, 100, 80, 60].map((w, i) => (
                    <div key={i} className="h-3 rounded bg-sf-2/40 animate-pulse" style={{ width: w }} />
                ))}
            </div>

            {/* Table rows */}
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 h-14 px-2" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-10 h-10 rounded-lg bg-sf-2/40 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 rounded bg-sf-2/40 animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
                        <div className="h-2 w-24 rounded bg-sf-2/30 animate-pulse" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-sf-2/30 animate-pulse" />
                    <div className="h-3 w-12 rounded bg-sf-2/40 animate-pulse" />
                </div>
            ))}
        </div>
    )
}

export default async function GhostPreview({ flag, lang, children }: GhostPreviewProps) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const entry = FEATURE_GATE_MAP[flag]
    const icon = entry?.icon ?? '🔒'
    const moduleName = entry ? t(entry.moduleNameKey) : flag.replace(/_/g, ' ')
    const moduleKey = entry?.moduleKey ?? ''
    const benefits = MODULE_BENEFITS[moduleKey] ?? []
    const activationUrl = getModuleActivationUrl(flag, lang)
    const moduleInfoUrl = getModuleInfoUrl(flag, lang)

    return (
        <div className="relative w-full min-h-[60vh]">
            {/* Layer 1: Ghost content — blurred and non-interactive */}
            <div
                className="pointer-events-none select-none"
                aria-hidden="true"
                style={{
                    filter: 'blur(6px) grayscale(30%)',
                    opacity: 0.35,
                    maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
                }}
            >
                {children ?? <GhostSkeleton />}
            </div>

            {/* Layer 2: Floating upsell overlay — centered, always visible */}
            <div className="absolute inset-0 z-20 flex items-start justify-center pt-24 sm:pt-32 pb-12 px-4">
                <div className="w-full max-w-lg">
                    {/* Main card */}
                    <div className="relative bg-sf-0/95 backdrop-blur-2xl border border-sf-2 rounded-3xl shadow-2xl shadow-brand-soft/20 overflow-hidden">
                        {/* Gradient accent top */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand via-brand-400 to-emerald-400" />

                        <div className="p-8 sm:p-10">
                            {/* Icon + badge */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-sf-1 border border-sf-2 flex items-center justify-center text-3xl shadow-sm">
                                    {icon}
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-subtle border border-brand-soft text-[10px] font-bold uppercase tracking-widest text-brand mb-1">
                                        <Eye className="w-3 h-3" />
                                        Ghost Preview
                                    </div>
                                    <h2 className="text-2xl font-display font-bold text-tx tracking-tight">
                                        {moduleName}
                                    </h2>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-tx-sec leading-relaxed mb-6 font-light">
                                {t('featureGate.description').replace('{module}', moduleName)}
                            </p>

                            {/* Benefits compact list */}
                            {benefits.length > 0 && (
                                <div className="grid grid-cols-1 gap-2 mb-8">
                                    {benefits.map((benefit, i) => (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sf-1/50 border border-sf-2/50">
                                            <div className="w-6 h-6 rounded-full bg-brand-subtle flex items-center justify-center text-brand flex-shrink-0">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm text-tx font-medium">
                                                {t(benefit.key) || benefit.key}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    href={activationUrl}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-text-brand text-sf-0 text-sm font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-brand-soft hover:-translate-y-0.5"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {t('featureGate.activateNow') || 'Activar ahora'}
                                </Link>
                                <a
                                    href={moduleInfoUrl}
                                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-sf-3 text-tx-sec text-sm font-medium hover:bg-sf-1 transition-colors"
                                >
                                    {t('featureGate.cta') || 'Más info'}
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Reassurance footer */}
                        <div className="px-8 py-4 bg-sf-1/50 border-t border-sf-2/50 flex items-center gap-2 text-[11px] text-tx-muted">
                            <Lock className="w-3 h-3 flex-shrink-0" />
                            {t('featureGate.ownerOnly')}
                        </div>
                    </div>

                    {/* Back to dashboard link */}
                    <div className="text-center mt-4">
                        <Link
                            href={`/${lang}/panel`}
                            className="text-sm font-medium text-tx-muted hover:text-tx transition-colors inline-flex items-center gap-2"
                        >
                            <span>←</span> {t('featureGate.backToPanel')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
