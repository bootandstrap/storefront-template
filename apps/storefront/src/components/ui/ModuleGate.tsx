'use client'

/**
 * @module ModuleGate
 * @description Supastarter-inspired module gating component.
 *
 * Wraps content that requires a specific module/tier. When the module is
 * inactive or at a lower tier, shows a customizable fallback (default:
 * upsell card). When active, renders children normally.
 *
 * USAGE:
 *   <ModuleGate module="pos" featureFlags={flags}>
 *       <POSAdvancedFeatures />
 *   </ModuleGate>
 *
 *   <ModuleGate module="crm" featureFlags={flags} variant="banner">
 *       <CRMDashboard />
 *   </ModuleGate>
 *
 *   // With custom fallback:
 *   <ModuleGate module="chatbot" featureFlags={flags} fallback={<ChatbotPromo />}>
 *       <ChatbotPanel />
 *   </ModuleGate>
 *
 * Unlike ClientFeatureGate (a modal), ModuleGate is an inline wrapper
 * that replaces itself with the fallback. This is better for page-level
 * gating where you want to show the upsell IN PLACE instead of as a popup.
 *
 * @locked 🔴 PLATFORM — Do not customize per tenant.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Lock } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { getModuleActivationUrl } from '@/lib/feature-gate-config'
import Link from 'next/link'

// ── Props ─────────────────────────────────────────────────────────────────

interface ModuleGateProps {
    /** The module key (e.g., 'pos', 'crm', 'chatbot') */
    module: string
    /** Feature flags from the server (passed down from panel layout) */
    featureFlags: Record<string, boolean | undefined>
    /** Minimum tier level required (default: 1 = any tier is enough) */
    requiredTier?: number
    /** Feature flag to check (auto-derived from module if not provided) */
    flag?: string
    /** Custom fallback when module is locked (default: built-in upsell card) */
    fallback?: React.ReactNode
    /** Style variant for the default fallback */
    variant?: 'card' | 'banner' | 'inline' | 'minimal'
    /** Children rendered when module is active */
    children: React.ReactNode
    /** Additional CSS classes */
    className?: string
}

// ── Module Info Lookup ────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, string> = {
    ecommerce: '🛒', pos: '💳', pos_kiosk: '🖥️', chatbot: '🤖',
    crm: '👥', email_marketing: '📧', seo: '🔍', rrss: '📱',
    automation: '⚡', auth_advanced: '🔐', i18n: '🌍',
    sales_channels: '📞', capacidad: '📈',
}

const MODULE_NAMES: Record<string, Record<string, string>> = {
    ecommerce: { es: 'E-Commerce', en: 'E-Commerce' },
    pos: { es: 'Punto de Venta', en: 'Point of Sale' },
    pos_kiosk: { es: 'Modo Kiosco', en: 'Kiosk Mode' },
    chatbot: { es: 'Chatbot IA', en: 'AI Chatbot' },
    crm: { es: 'CRM', en: 'CRM' },
    email_marketing: { es: 'Email Marketing', en: 'Email Marketing' },
    seo: { es: 'SEO', en: 'SEO' },
    rrss: { es: 'Redes Sociales', en: 'Social Media' },
    automation: { es: 'Automatización', en: 'Automation' },
    auth_advanced: { es: 'Auth Avanzada', en: 'Advanced Auth' },
    i18n: { es: 'Internacionalización', en: 'Internationalization' },
    sales_channels: { es: 'Canales de Venta', en: 'Sales Channels' },
    capacidad: { es: 'Capacidad', en: 'Capacity' },
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ModuleGate({
    module,
    featureFlags,
    requiredTier = 1,
    flag,
    fallback,
    variant = 'card',
    children,
    className = '',
}: ModuleGateProps) {
    const { locale } = useI18n()

    // Derive the flag from module key if not provided
    const effectiveFlag = flag ?? `enable_${module}`

    // Check if the module is active
    const isActive = featureFlags[effectiveFlag] === true

    // If active, render children directly
    if (isActive) {
        return <>{children}</>
    }

    // Module is locked — show fallback
    if (fallback) {
        return <>{fallback}</>
    }

    // Default fallback based on variant
    return (
        <DefaultModuleUpsell
            module={module}
            flag={effectiveFlag}
            requiredTier={requiredTier}
            variant={variant}
            locale={locale}
            className={className}
        />
    )
}

// ── Default Upsell Components ─────────────────────────────────────────────

interface DefaultModuleUpsellProps {
    module: string
    flag: string
    requiredTier: number
    variant: 'card' | 'banner' | 'inline' | 'minimal'
    locale: string
    className: string
}

function DefaultModuleUpsell({
    module,
    flag,
    requiredTier,
    variant,
    locale,
    className,
}: DefaultModuleUpsellProps) {
    const { t } = useI18n()
    const icon = MODULE_ICONS[module] ?? '📦'
    const name = MODULE_NAMES[module]?.[locale] ?? MODULE_NAMES[module]?.['es'] ?? module
    const activationUrl = getModuleActivationUrl(flag, locale)

    switch (variant) {
        case 'banner':
            return (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full rounded-xl bg-gradient-to-r from-brand/5 via-sf-1 to-brand/5 border border-brand/20 p-4 flex items-center justify-between gap-4 ${className}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <div>
                            <p className="text-sm font-semibold text-tx">{name}</p>
                            <p className="text-xs text-tx-muted">
                                {t('featureGate.activateToUnlock') ?? 'Activa este módulo para desbloquear esta funcionalidad'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={activationUrl}
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('featureGate.activate') ?? 'Activar'}
                    </Link>
                </motion.div>
            )

        case 'inline':
            return (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sf-1 border border-sf-3 text-xs text-tx-muted cursor-not-allowed ${className}`}
                    title={`${name} — módulo inactivo`}
                >
                    <Lock className="w-3 h-3" />
                    <span>{name}</span>
                </motion.span>
            )

        case 'minimal':
            return (
                <div className={`flex items-center gap-2 text-tx-muted text-sm ${className}`}>
                    <Lock className="w-4 h-4" />
                    <span>{t('featureGate.moduleRequired') ?? 'Módulo requerido'}: {name}</span>
                    <Link
                        href={activationUrl}
                        className="text-brand text-xs font-medium hover:underline"
                    >
                        {t('featureGate.activate') ?? 'Activar'} →
                    </Link>
                </div>
            )

        case 'card':
        default:
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative overflow-hidden rounded-2xl border border-sf-3 bg-sf-1 p-8 text-center ${className}`}
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-brand/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-sf-0 border border-sf-2 shadow-sm flex items-center justify-center text-3xl">
                            {icon}
                        </div>

                        <div>
                            <h3 className="text-lg font-display font-bold text-tx mb-1">
                                {name}
                            </h3>
                            <p className="text-sm text-tx-sec max-w-xs mx-auto">
                                {t('featureGate.activateToUnlock') ?? 'Activa este módulo para desbloquear esta funcionalidad'}
                            </p>
                            {requiredTier > 1 && (
                                <p className="text-xs text-tx-muted mt-1">
                                    {t('featureGate.tierRequired') ?? 'Tier mínimo requerido'}: {requiredTier}
                                </p>
                            )}
                        </div>

                        <Link
                            href={activationUrl}
                            className="group/btn inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-brand/20"
                        >
                            <Sparkles className="w-4 h-4" />
                            {t('featureGate.activateNow') ?? 'Activar Ahora'}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                        </Link>
                    </div>
                </motion.div>
            )
    }
}

// ── Utility: Check module status from flags object ────────────────────────

/**
 * Check whether a module is active from a feature flags object.
 * Useful for programmatic gating outside React components.
 *
 * Usage:
 *   if (isModuleActive(featureFlags, 'pos')) { ... }
 */
export function isModuleActive(
    featureFlags: Record<string, boolean | undefined>,
    module: string,
    flag?: string
): boolean {
    const effectiveFlag = flag ?? `enable_${module}`
    return featureFlags[effectiveFlag] === true
}
