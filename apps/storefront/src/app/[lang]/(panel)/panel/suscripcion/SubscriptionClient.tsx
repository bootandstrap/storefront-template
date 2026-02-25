'use client'

import { useState, useTransition } from 'react'
import { Crown, ArrowUpRight, CreditCard, Check, Loader2, Puzzle, ExternalLink } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Subscription & Modules management page for store owners.
 * Shows active modules, available add-ons, and billing management.
 *
 * Business model: Web Base + Maintenance (€40/mo) + Module add-ons.
 * Module purchases redirect to bootandstrap.com (Option A).
 */

interface SubscriptionClientProps {
    moduleFlags: Record<string, boolean>
    planLimits: Record<string, number | string>
    tenantStatus: string
    maintenanceDaysRemaining?: number
    hasStripeCustomer: boolean
    lang: string
}

// Module catalog — maps feature flags to module info for display.
// Matches MODULOS.md catalog. Only shows modules that are purchasable add-ons.
const MODULE_CATALOG = [
    {
        flag: 'enable_carousel',
        key: 'cms',
        icon: '📄',
        slugs: { es: 'cms-contenido', en: 'cms-content', de: 'cms-inhalte', fr: 'cms-contenu', it: 'cms-contenuto' },
    },
    {
        flag: 'enable_multi_language',
        key: 'i18n',
        icon: '🌐',
        slugs: { es: 'multi-idioma', en: 'multi-language', de: 'mehrsprachig', fr: 'multilingue', it: 'multilingua' },
    },
    {
        flag: 'enable_reviews',
        key: 'reviews',
        icon: '⭐',
        slugs: { es: 'resenas-producto', en: 'product-reviews', de: 'produktbewertungen', fr: 'avis-produit', it: 'recensioni-prodotto' },
    },
    {
        flag: 'enable_self_service_returns',
        key: 'returns',
        icon: '🔄',
        slugs: { es: 'devoluciones', en: 'returns', de: 'retouren', fr: 'retours', it: 'resi' },
    },
    {
        flag: 'enable_whatsapp_checkout',
        key: 'whatsapp',
        icon: '💬',
        slugs: { es: 'ventas-whatsapp', en: 'whatsapp-sales', de: 'whatsapp-verkauf', fr: 'ventes-whatsapp', it: 'vendite-whatsapp' },
    },
    {
        flag: 'enable_chatbot',
        key: 'chatbot',
        icon: '🤖',
        slugs: { es: 'asistente-ia', en: 'ai-assistant', de: 'ki-assistent', fr: 'assistant-ia', it: 'assistente-ia' },
    },
    {
        flag: 'enable_analytics',
        key: 'analytics',
        icon: '📊',
        slugs: { es: 'analiticas', en: 'analytics', de: 'analytik', fr: 'analytique', it: 'analitica' },
    },
    {
        flag: 'enable_google_auth',
        key: 'auth_advanced',
        icon: '🛡️',
        slugs: { es: 'auth-avanzada', en: 'advanced-auth', de: 'erweiterte-auth', fr: 'auth-avancee', it: 'auth-avanzata' },
    },
    {
        flag: 'enable_online_payments',
        key: 'ecommerce',
        icon: '🛍️',
        slugs: { es: 'tienda-online', en: 'online-store', de: 'online-shop', fr: 'boutique-en-ligne', it: 'negozio-online' },
    },
] as const

const BSWEB_URL = process.env.NEXT_PUBLIC_BSWEB_URL || 'https://bootandstrap.com'

export default function SubscriptionClient({
    moduleFlags,
    planLimits,
    tenantStatus,
    maintenanceDaysRemaining,
    hasStripeCustomer,
    lang,
}: SubscriptionClientProps) {
    const { t } = useI18n()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Separate active from available modules
    const activeModules = MODULE_CATALOG.filter(m => moduleFlags[m.flag] === true)
    const availableModules = MODULE_CATALOG.filter(m => moduleFlags[m.flag] !== true)

    function handleManageBilling() {
        startTransition(async () => {
            setError(null)
            try {
                const res = await fetch('/api/billing/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ returnUrl: window.location.href }),
                })
                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                } else {
                    setError(data.error || t('panel.subscription.errorPortal'))
                }
            } catch {
                setError(t('panel.subscription.errorConnection'))
            }
        })
    }

    function getModuleUrl(mod: typeof MODULE_CATALOG[number]) {
        const slug = mod.slugs[lang as keyof typeof mod.slugs] || mod.slugs.en
        return `${BSWEB_URL}/${lang}/modulos/${slug}`
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                    <Puzzle className="w-6 h-6 text-primary" />
                    {t('panel.subscription.title')}
                </h1>
                <p className="text-sm text-text-muted mt-1">
                    {t('panel.subscription.subtitle')}
                </p>
            </div>

            {/* Maintenance banner */}
            {tenantStatus === 'maintenance_free' && maintenanceDaysRemaining != null && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400 flex items-center gap-2">
                    <Crown className="w-5 h-5 shrink-0" />
                    {t('panel.subscription.maintenanceFree').replace('{{days}}', String(maintenanceDaysRemaining))}
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
                    {error}
                </div>
            )}

            {/* Active Modules */}
            <section>
                <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    Módulos activos
                </h2>
                {activeModules.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                        <p className="text-text-muted text-sm">No hay módulos activos todavía.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeModules.map(mod => (
                            <div
                                key={mod.key}
                                className="glass rounded-xl p-4 border border-green-500/20 bg-green-500/5"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{mod.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-text-primary text-sm">{mod.key}</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Activo
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Available Modules */}
            {availableModules.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                        Módulos disponibles
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableModules.map(mod => (
                            <a
                                key={mod.key}
                                href={getModuleUrl(mod)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass rounded-xl p-4 border border-surface-3 hover:border-primary/40 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{mod.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-text-primary text-sm">{mod.key}</p>
                                        <p className="text-xs text-primary flex items-center gap-1 group-hover:underline">
                                            Contratar <ExternalLink className="w-3 h-3" />
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* Billing Management */}
            {hasStripeCustomer && (
                <section className="glass rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Facturación
                    </h2>
                    <p className="text-sm text-text-muted mb-4">
                        Gestiona tus métodos de pago, facturas y suscripciones activas.
                    </p>
                    <button
                        onClick={handleManageBilling}
                        disabled={isPending}
                        className="btn btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                {t('panel.subscription.manageBilling')}
                            </>
                        )}
                    </button>
                </section>
            )}
        </div>
    )
}
