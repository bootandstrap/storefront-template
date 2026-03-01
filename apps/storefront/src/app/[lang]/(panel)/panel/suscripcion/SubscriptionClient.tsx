'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Crown, ArrowUpRight, CreditCard, Check, Loader2, Puzzle, CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Subscription & Modules management page for store owners.
 * Shows active modules, available add-ons, and billing management.
 *
 * Business model: Web Base + Maintenance (€40/mo) + Module add-ons.
 * Module purchases use embedded Stripe Checkout with in-panel redirect.
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
        label: { es: 'CMS y Contenido', en: 'CMS & Content', de: 'CMS & Inhalte', fr: 'CMS & Contenu', it: 'CMS & Contenuto' },
    },
    {
        flag: 'enable_multi_language',
        key: 'i18n',
        icon: '🌐',
        label: { es: 'Multi-idioma', en: 'Multi-language', de: 'Mehrsprachig', fr: 'Multilingue', it: 'Multilingua' },
    },
    {
        flag: 'enable_reviews',
        key: 'reviews',
        icon: '⭐',
        label: { es: 'Reseñas de Producto', en: 'Product Reviews', de: 'Produktbewertungen', fr: 'Avis Produit', it: 'Recensioni' },
    },
    {
        flag: 'enable_self_service_returns',
        key: 'returns',
        icon: '🔄',
        label: { es: 'Devoluciones', en: 'Returns', de: 'Retouren', fr: 'Retours', it: 'Resi' },
    },
    {
        flag: 'enable_chatbot',
        key: 'chatbot',
        icon: '🤖',
        label: { es: 'Chatbot IA', en: 'AI Chatbot', de: 'KI-Chatbot', fr: 'Chatbot IA', it: 'Chatbot IA' },
    },
    {
        flag: 'enable_analytics',
        key: 'analytics',
        icon: '📊',
        label: { es: 'Analíticas', en: 'Analytics', de: 'Analytik', fr: 'Analytique', it: 'Analitica' },
    },
    {
        flag: 'enable_crm',
        key: 'crm',
        icon: '👥',
        label: { es: 'CRM', en: 'CRM', de: 'CRM', fr: 'CRM', it: 'CRM' },
    },
    {
        flag: 'enable_automation',
        key: 'automation',
        icon: '⚡',
        label: { es: 'Automatización', en: 'Automation', de: 'Automatisierung', fr: 'Automatisation', it: 'Automazione' },
    },
] as const

export default function SubscriptionClient({
    moduleFlags,
    planLimits: _planLimits,
    tenantStatus,
    maintenanceDaysRemaining,
    hasStripeCustomer,
    lang,
}: SubscriptionClientProps) {
    const { t } = useI18n()
    const searchParams = useSearchParams()
    const purchasedModule = searchParams?.get('module_purchased')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [purchasingModule, setPurchasingModule] = useState<string | null>(null)

    // Separate active from available modules
    const activeModules = MODULE_CATALOG.filter(m => moduleFlags[m.flag] === true)
    const availableModules = MODULE_CATALOG.filter(m => moduleFlags[m.flag] !== true)

    function getModuleLabel(mod: typeof MODULE_CATALOG[number]) {
        return mod.label[lang as keyof typeof mod.label] || mod.label.en
    }

    async function handleModulePurchase(moduleKey: string) {
        setPurchasingModule(moduleKey)
        setError(null)
        try {
            const res = await fetch('/api/module-purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-locale': lang,
                },
                body: JSON.stringify({ module_key: moduleKey }),
            })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url  // Redirect to Stripe Checkout
            } else {
                setError(data.error || t('panel.subscription.errorCheckout'))
                setPurchasingModule(null)
            }
        } catch {
            setError(t('panel.subscription.errorConnection'))
            setPurchasingModule(null)
        }
    }

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

            {/* Success banner — shows after returning from Stripe Checkout */}
            {purchasedModule && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    {t('panel.subscription.moduleActivated') || '¡Módulo activado correctamente! Los cambios se reflejan en tu tienda.'}
                </div>
            )}

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
                    {t('panel.subscription.activeModules') || 'Módulos activos'}
                </h2>
                {activeModules.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                        <p className="text-text-muted text-sm">
                            {t('panel.subscription.noActiveModules') || 'No hay módulos activos todavía.'}
                        </p>
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
                                        <p className="font-semibold text-text-primary text-sm">{getModuleLabel(mod)}</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> {t('panel.subscription.active') || 'Activo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Available Modules — embedded purchase via Stripe Checkout */}
            {availableModules.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                        {t('panel.subscription.availableModules') || 'Módulos disponibles'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableModules.map(mod => (
                            <button
                                key={mod.key}
                                onClick={() => handleModulePurchase(mod.key)}
                                disabled={purchasingModule === mod.key}
                                className="glass rounded-xl p-4 border border-surface-3 hover:border-primary/40 transition-all group text-left w-full disabled:opacity-70"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{mod.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-text-primary text-sm">{getModuleLabel(mod)}</p>
                                        <p className="text-xs text-primary flex items-center gap-1">
                                            {purchasingModule === mod.key ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> {t('panel.subscription.redirecting') || 'Redirigiendo...'}</>
                                            ) : (
                                                <><CreditCard className="w-3 h-3" /> {t('panel.subscription.purchase') || 'Contratar'}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Billing Management */}
            {hasStripeCustomer && (
                <section className="glass rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        {t('panel.subscription.billing') || 'Facturación'}
                    </h2>
                    <p className="text-sm text-text-muted mb-4">
                        {t('panel.subscription.billingDescription') || 'Gestiona tus métodos de pago, facturas y suscripciones activas.'}
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
