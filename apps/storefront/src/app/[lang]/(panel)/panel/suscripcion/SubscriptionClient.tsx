'use client'

import { useState, useTransition } from 'react'
import { Crown, ArrowUpRight, CreditCard, Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Subscription management page for store owners.
 * Shows current plan, usage, and upgrade options.
 * All copy via i18n dictionary keys.
 */

interface SubscriptionClientProps {
    currentPlan: string
    planLimits: Record<string, number | string>
    tenantStatus: string
    maintenanceDaysRemaining?: number
    hasStripeCustomer: boolean
}

const PLAN_TIERS = [
    { id: 'starter', name: 'Starter', price: '29', features: 'starterFeatures' },
    { id: 'pro', name: 'Pro', price: '79', popular: true, features: 'proFeatures' },
    { id: 'enterprise', name: 'Enterprise', price: '199', features: 'enterpriseFeatures' },
]

export default function SubscriptionClient({
    currentPlan,
    planLimits,
    tenantStatus,
    maintenanceDaysRemaining,
    hasStripeCustomer,
}: SubscriptionClientProps) {
    const { t } = useI18n()
    const [isPending, startTransition] = useTransition()
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

    const handleUpgrade = (planId: string) => {
        if (planId === currentPlan) return

        setLoadingPlan(planId)
        startTransition(async () => {
            try {
                const res = await fetch('/api/billing/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan: planId,
                        returnUrl: window.location.href,
                    }),
                })

                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                } else {
                    alert(data.error || t('panel.subscription.errorCheckout'))
                }
            } catch {
                alert(t('panel.subscription.errorConnection'))
            } finally {
                setLoadingPlan(null)
            }
        })
    }

    const handleManageBilling = () => {
        startTransition(async () => {
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
                    alert(data.error || t('panel.subscription.errorPortal'))
                }
            } catch {
                alert(t('panel.subscription.errorConnection'))
            }
        })
    }

    const planIndex = PLAN_TIERS.findIndex(p => p.id === currentPlan)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Crown className="w-6 h-6 text-amber-500" />
                        {t('panel.subscription.title')}
                    </h1>
                    <p className="text-text-muted mt-1">
                        {t('panel.subscription.subtitle')}
                    </p>
                </div>

                {hasStripeCustomer && (
                    <button
                        onClick={handleManageBilling}
                        disabled={isPending}
                        className="btn btn-secondary inline-flex items-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        {t('panel.subscription.manageBilling')}
                        <ArrowUpRight className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Current plan banner */}
            <div className="glass rounded-xl p-6 border border-primary/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-muted">{t('panel.subscription.currentPlan')}</p>
                        <p className="text-xl font-bold text-text-primary capitalize mt-1">{currentPlan}</p>
                        {tenantStatus === 'maintenance_free' && maintenanceDaysRemaining !== undefined && (
                            <p className="text-sm text-blue-600 mt-2 font-medium">
                                🎁 {t('panel.subscription.maintenanceFree').replace('{{days}}', String(maintenanceDaysRemaining))}
                            </p>
                        )}
                    </div>

                    {/* Key limits */}
                    <div className="flex gap-6">
                        {[
                            { label: t('panel.subscription.products'), value: planLimits.max_products },
                            { label: t('panel.subscription.customers'), value: planLimits.max_customers },
                            { label: t('panel.subscription.ordersMonth'), value: planLimits.max_orders_month },
                        ].map(item => (
                            <div key={item.label} className="text-center">
                                <p className="text-lg font-bold text-text-primary">{item.value}</p>
                                <p className="text-xs text-text-muted">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLAN_TIERS.map((plan, index) => {
                    const isCurrent = plan.id === currentPlan
                    const isDowngrade = index < planIndex
                    const isUpgrade = index > planIndex
                    const featureKey = `panel.subscription.${plan.features}` as const
                    const features = t(featureKey).split(', ')

                    return (
                        <div
                            key={plan.id}
                            className={`
                                relative rounded-xl border-2 p-6 transition-all
                                ${isCurrent ? 'border-primary bg-primary/5 shadow-lg' : 'border-surface-2 hover:border-primary/30'}
                                ${plan.popular ? 'ring-2 ring-primary/20' : ''}
                            `}
                        >
                            {plan.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {t('panel.subscription.popular')}
                                </span>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                                <p className="mt-2">
                                    <span className="text-3xl font-bold text-text-primary">{plan.price}€</span>
                                    <span className="text-text-muted text-sm">{t('panel.subscription.perMonth')}</span>
                                </p>
                            </div>

                            <ul className="space-y-2 mb-6">
                                {features.map(feat => (
                                    <li key={feat} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        {feat}
                                    </li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <button
                                    disabled
                                    className="w-full py-2 px-4 rounded-lg bg-primary/10 text-primary font-medium cursor-default"
                                >
                                    {t('panel.subscription.current')}
                                </button>
                            ) : isUpgrade ? (
                                <button
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={isPending}
                                    className="w-full py-2 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loadingPlan === plan.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            {t('panel.subscription.upgrade').replace('{{plan}}', plan.name)}
                                            <ArrowUpRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            ) : isDowngrade ? (
                                <button
                                    onClick={handleManageBilling}
                                    disabled={isPending || !hasStripeCustomer}
                                    className="w-full py-2 px-4 rounded-lg border border-surface-2 text-text-muted font-medium hover:bg-surface-1 transition-colors text-sm"
                                >
                                    {t('panel.subscription.changePlan')}
                                </button>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
