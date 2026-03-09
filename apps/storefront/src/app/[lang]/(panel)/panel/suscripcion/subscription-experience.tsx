import { ArrowUpRight, Check, CreditCard, Crown, Lightbulb, Loader2, Puzzle, Sparkles } from 'lucide-react'
import type { ActiveModuleInfo } from '@/lib/active-modules'
import type { ModuleCatalogEntry } from '@/lib/governance-contract'

export function getSelectedTier(
    module: ModuleCatalogEntry,
    selectedTierKey?: string | null
) {
    return module.tiers.find((tier) => tier.key === selectedTierKey) || module.tiers[0]
}

export function calculateActiveMonthlyEstimate(
    activeModuleOrders: ActiveModuleInfo[],
    catalog: ModuleCatalogEntry[],
    maintenancePrice: number
): number {
    const catalogByKey = new Map(catalog.map((module) => [module.key, module]))
    const modulesTotal = activeModuleOrders.reduce((acc, order) => {
        const module = catalogByKey.get(order.moduleKey)
        if (!module) return acc
        const selectedTier = getSelectedTier(module, order.tierKey)
        return acc + (selectedTier?.price_chf || 0)
    }, 0)
    return maintenancePrice + modulesTotal
}

export function pickRecommendedModule(
    availableModules: ModuleCatalogEntry[],
    activeModuleKeys: Set<string>
): ModuleCatalogEntry | null {
    if (availableModules.length === 0) return null

    const ecommerce = availableModules.find((module) => module.key === 'ecommerce')
    if (!activeModuleKeys.has('ecommerce') && ecommerce) {
        return ecommerce
    }

    const dependencyReady = availableModules.filter((module) =>
        !module.requires?.length || module.requires.every((req) => activeModuleKeys.has(req))
    )

    return dependencyReady.find((module) => module.popular)
        || dependencyReady[0]
        || availableModules[0]
}

interface SubscriptionExperienceProps {
    t: (key: string) => string
    purchasedModule: string | null
    tenantStatus: string
    maintenanceDaysRemaining?: number
    error: string | null
    activeModules: ModuleCatalogEntry[]
    activeModuleOrders: ActiveModuleInfo[]
    availableModules: ModuleCatalogEntry[]
    selectedTiers: Record<string, string>
    purchasingModule: string | null
    hasStripeCustomer: boolean
    isPending: boolean
    recommendedModule: ModuleCatalogEntry | null
    activeMonthlyEstimate: number
    maintenancePrice: number
    onTierChange: (moduleKey: string, tierKey: string) => void
    onPurchase: (moduleKey: string) => void
    onManageBilling: () => void
}

function formatChf(amount: number): string {
    return new Intl.NumberFormat('es-CH', {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 0,
    }).format(amount)
}

export function SubscriptionExperience({
    t,
    purchasedModule,
    tenantStatus,
    maintenanceDaysRemaining,
    error,
    activeModules,
    activeModuleOrders,
    availableModules,
    selectedTiers,
    purchasingModule,
    hasStripeCustomer,
    isPending,
    recommendedModule,
    activeMonthlyEstimate,
    maintenancePrice,
    onTierChange,
    onPurchase,
    onManageBilling,
}: SubscriptionExperienceProps) {
    const activeOrdersByModule = new Map(activeModuleOrders.map((order) => [order.moduleKey, order]))

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                    <Puzzle className="w-6 h-6 text-primary" />
                    {t('panel.subscription.title')}
                </h1>
                <p className="text-sm text-text-muted">
                    {t('panel.subscription.subtitle')}
                </p>
            </div>

            {purchasedModule && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400 flex items-center gap-2">
                    <Check className="w-5 h-5 shrink-0" />
                    {t('panel.subscription.moduleActivated') || '¡Módulo activado correctamente!'}
                </div>
            )}

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

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="glass rounded-xl p-4 border border-surface-3">
                    <p className="text-xs uppercase tracking-wider text-text-muted">Tu stack activo</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{activeModules.length} módulos</p>
                    <p className="text-xs text-text-muted mt-1">Base mantenimiento: {formatChf(maintenancePrice)}/mes</p>
                </div>
                <div className="glass rounded-xl p-4 border border-surface-3">
                    <p className="text-xs uppercase tracking-wider text-text-muted">Precio mensual estimado</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatChf(activeMonthlyEstimate)}/mes</p>
                    <p className="text-xs text-text-muted mt-1">Incluye mantenimiento + módulos activos</p>
                </div>
                <div className="glass rounded-xl p-4 border border-primary/30 bg-primary/5">
                    <p className="text-xs uppercase tracking-wider text-primary/80">Siguiente recomendación</p>
                    <p className="text-lg font-semibold text-text-primary mt-1">
                        {recommendedModule?.name || 'Ya tienes el stack principal'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Elegida según dependencias y prioridad comercial</p>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
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
                        {activeModules.map((module) => {
                            const activeOrder = activeOrdersByModule.get(module.key)
                            const tier = getSelectedTier(module, activeOrder?.tierKey)
                            return (
                                <div
                                    key={module.key}
                                    className="glass rounded-xl p-4 border border-green-500/20 bg-green-500/5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-text-primary text-sm">{module.icon} {module.name}</p>
                                            <p className="text-xs text-green-400">{t('panel.subscription.active') || 'Activo'} · {tier.name}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-text-primary">{formatChf(tier.price_chf)}/mes</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {recommendedModule && (
                <section className="glass rounded-xl p-5 border border-primary/30 bg-primary/5">
                    <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        Recomendado para tu tienda
                    </h2>
                    <p className="text-sm text-text-secondary">
                        {recommendedModule.icon} <span className="font-semibold text-text-primary">{recommendedModule.name}</span>:
                        {' '}impacto rápido con una configuración sencilla para equipo no técnico.
                    </p>
                </section>
            )}

            {availableModules.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                        {t('panel.subscription.availableModules') || 'Módulos disponibles'}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableModules.map((module) => {
                            const selectedTier = getSelectedTier(module, selectedTiers[module.key])
                            const buying = purchasingModule === module.key
                            return (
                                <article
                                    key={module.key}
                                    className="glass rounded-xl p-5 border border-surface-3 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-text-primary">{module.icon} {module.name}</p>
                                            <p className="text-xs text-text-muted mt-1">{module.description}</p>
                                        </div>
                                        {recommendedModule?.key === module.key && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                                                <Sparkles className="w-3 h-3" /> Recomendado
                                            </span>
                                        )}
                                    </div>

                                    {module.tiers.length > 1 && (
                                        <div className="mt-3">
                                            <label className="text-xs text-text-muted block mb-1">Selecciona nivel</label>
                                            <select
                                                value={selectedTier.key}
                                                onChange={(e) => onTierChange(module.key, e.target.value)}
                                                className="w-full bg-surface-2 border border-surface-3 text-text-primary text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/50 transition-colors"
                                                disabled={buying}
                                            >
                                                {module.tiers.map((tier) => (
                                                    <option key={tier.key} value={tier.key}>
                                                        {tier.name} — {tier.price_chf} CHF/mes
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-4 space-y-2">
                                        <p className="text-xs uppercase tracking-wider text-text-muted">Qué incluye</p>
                                        <ul className="space-y-1.5">
                                            {selectedTier.features.slice(0, 3).map((feature) => (
                                                <li key={feature} className="text-sm text-text-secondary flex items-start gap-2">
                                                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-text-muted">Precio mensual estimado</p>
                                            <p className="text-lg font-semibold text-text-primary">{formatChf(selectedTier.price_chf)}/mes</p>
                                        </div>
                                        <button
                                            onClick={() => onPurchase(module.key)}
                                            disabled={buying}
                                            className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60"
                                        >
                                            {buying ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> {t('panel.subscription.redirecting') || 'Redirigiendo...'}</>
                                            ) : (
                                                <><CreditCard className="w-4 h-4" /> {t('panel.subscription.purchase') || 'Contratar'}</>
                                            )}
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </section>
            )}

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
                        onClick={onManageBilling}
                        disabled={isPending}
                        className="btn btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('panel.subscription.manageBilling')}
                    </button>
                </section>
            )}
        </div>
    )
}
