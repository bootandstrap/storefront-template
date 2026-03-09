'use client'

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Subscription & Modules management page for store owners.
 * Shows active modules, available add-ons, and billing management.
 *
 * Business model: Web Base + Maintenance (€40/mo) + Module add-ons.
 * Module purchases use embedded Stripe Checkout with in-panel redirect.
 */

import type { ActiveModuleInfo } from '@/lib/active-modules'
import {
    calculateActiveMonthlyEstimate,
    pickRecommendedModule,
    SubscriptionExperience,
} from './subscription-experience'

interface SubscriptionClientProps {
    activeModuleOrders: ActiveModuleInfo[]
    tenantStatus: string
    maintenanceDaysRemaining?: number
    hasStripeCustomer: boolean
    lang: string
}

// ---------------------------------------------------------------------------
// Canonical Module Catalog — sourced from governance-contract.json
// Keys match BSWEB module-catalog.ts exactly. No legacy aliases.
// ---------------------------------------------------------------------------
import contract, { type ModuleCatalogEntry } from '@/lib/governance-contract'

const MODULE_CATALOG: ModuleCatalogEntry[] = contract.modules.catalog
const MAINTENANCE_PRICE_CHF = contract.pricing.maintenance_chf_month

export default function SubscriptionClient({
    activeModuleOrders,
    tenantStatus,
    maintenanceDaysRemaining,
    hasStripeCustomer,
    lang,
}: SubscriptionClientProps) {
    const { t } = useI18n()
    const searchParams = useSearchParams()
    const purchasedModule = searchParams?.get('module_purchased')
    const requestedModule = searchParams?.get('module')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [purchasingModule, setPurchasingModule] = useState<string | null>(null)
    const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({})

    // Separate active from available modules using the Commercial Source of Truth (orders)
    const activeModuleKeys = useMemo(() => new Set(activeModuleOrders.map(m => m.moduleKey)), [activeModuleOrders])
    const activeModules = MODULE_CATALOG.filter(m => activeModuleKeys.has(m.key))
    const rawAvailableModules = MODULE_CATALOG.filter(m => !activeModuleKeys.has(m.key))
    const recommendedModule = pickRecommendedModule(rawAvailableModules, activeModuleKeys)
    const availableModules = useMemo(() => {
        const modules = [...rawAvailableModules]
        modules.sort((a, b) => {
            if (requestedModule && a.key === requestedModule) return -1
            if (requestedModule && b.key === requestedModule) return 1
            if (recommendedModule && a.key === recommendedModule.key) return -1
            if (recommendedModule && b.key === recommendedModule.key) return 1
            if (a.popular && !b.popular) return -1
            if (!a.popular && b.popular) return 1
            return a.name.localeCompare(b.name)
        })
        return modules
    }, [rawAvailableModules, requestedModule, recommendedModule])
    const activeMonthlyEstimate = calculateActiveMonthlyEstimate(activeModuleOrders, MODULE_CATALOG, MAINTENANCE_PRICE_CHF)

    async function handleModulePurchase(moduleKey: string) {
        setPurchasingModule(moduleKey)
        setError(null)
        try {
            const tierId = selectedTiers[moduleKey] || MODULE_CATALOG.find(m => m.key === moduleKey)?.tiers?.[0]?.key
            const res = await fetch('/api/module-purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-locale': lang,
                },
                body: JSON.stringify({ module_key: moduleKey, tier_id: tierId }),
            })
            const data = await res.json()
            if (data.url) {
                window.location.assign(data.url)  // Redirect to Stripe Checkout
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

    function handleTierChange(moduleKey: string, tierKey: string) {
        setSelectedTiers((current) => ({ ...current, [moduleKey]: tierKey }))
    }

    return (
        <SubscriptionExperience
            t={t}
            purchasedModule={purchasedModule}
            tenantStatus={tenantStatus}
            maintenanceDaysRemaining={maintenanceDaysRemaining}
            error={error}
            activeModules={activeModules}
            activeModuleOrders={activeModuleOrders}
            availableModules={availableModules}
            selectedTiers={selectedTiers}
            purchasingModule={purchasingModule}
            hasStripeCustomer={hasStripeCustomer}
            isPending={isPending}
            recommendedModule={recommendedModule}
            activeMonthlyEstimate={activeMonthlyEstimate}
            maintenancePrice={MAINTENANCE_PRICE_CHF}
            onTierChange={handleTierChange}
            onPurchase={handleModulePurchase}
            onManageBilling={handleManageBilling}
        />
    )
}
