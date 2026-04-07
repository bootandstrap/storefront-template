'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowUpRight,
    Check,
    CreditCard,
    Crown,
    ExternalLink,
    Lightbulb,
    Loader2,
    PartyPopper,
    Puzzle,
    Receipt,
    Shield,
    Sparkles,
    TrendingUp,
    Wallet,
    Zap,
} from 'lucide-react'
import type { ActiveModuleInfo } from '@/lib/active-modules'
import type { ModuleCatalogEntry } from '@/lib/governance-contract'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import PanelStatGrid from '@/components/panel/PanelStatGrid'
import StatCard from '@/components/panel/StatCard'
import PanelChart, { makeDoughnutDataset } from '@/components/panel/PanelChart'
import { PageEntrance, ListStagger, StaggerItem, CountUp } from '@/components/panel/PanelAnimations'
import type { ChartData } from 'chart.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getSelectedTier(
    module: ModuleCatalogEntry,
    selectedTierKey?: string | null
) {
    return module.tiers.find((tier) => tier.key === selectedTierKey)
        || module.tiers[0]
        || { key: 'default', name: module.name, price_chf: 0, features: [], recommended: false }
}

export function calculateActiveMonthlyEstimate(
    activeModuleOrders: ActiveModuleInfo[],
    catalog: ModuleCatalogEntry[],
    maintenancePrice: number
): number {
    const catalogByKey = new Map(catalog.map((catalogEntry) => [catalogEntry.key, catalogEntry]))
    const modulesTotal = activeModuleOrders.reduce((acc, order) => {
        const catalogEntry = catalogByKey.get(order.moduleKey)
        if (!catalogEntry) return acc
        const selectedTier = getSelectedTier(catalogEntry, order.tierKey)
        return acc + (selectedTier?.price_chf || 0)
    }, 0)
    return maintenancePrice + modulesTotal
}

export function pickRecommendedModule(
    availableModules: ModuleCatalogEntry[],
    activeModuleKeys: Set<string>
): ModuleCatalogEntry | null {
    if (availableModules.length === 0) return null

    const ecommerce = availableModules.find((catalogEntry) => catalogEntry.key === 'ecommerce')
    if (!activeModuleKeys.has('ecommerce') && ecommerce) {
        return ecommerce
    }

    const dependencyReady = availableModules.filter((catalogEntry) =>
        !catalogEntry.requires?.length || catalogEntry.requires.every((req) => activeModuleKeys.has(req))
    )

    return dependencyReady.find((catalogEntry) => catalogEntry.popular)
        || dependencyReady[0]
        || availableModules[0]
}

function formatChf(amount: number): string {
    return new Intl.NumberFormat('es-CH', {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 0,
    }).format(amount)
}

// ─── Chart Colors ───────────────────────────────────────────────────────────

const MODULE_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#06b6d4',
    '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
    '#e11d48', '#84cc16', '#0ea5e9', '#a855f7',
]

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

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

    // ── Cost Breakdown Doughnut Data ──
    const costBreakdownData = useMemo((): ChartData<'doughnut'> => {
        const labels: string[] = [t('panel.subscription.maintenanceBase') || 'Mantenimiento']
        const values: number[] = [maintenancePrice]
        const colors: string[] = ['#6366f1']

        activeModuleOrders.forEach((order, idx) => {
            const cat = activeModules.find(m => m.key === order.moduleKey)
            if (!cat) return
            const tier = getSelectedTier(cat, order.tierKey)
            labels.push(`${cat.icon || '📦'} ${cat.name}`)
            values.push(tier?.price_chf || 0)
            colors.push(MODULE_COLORS[(idx + 1) % MODULE_COLORS.length])
        })

        return {
            labels,
            datasets: [makeDoughnutDataset(values, colors)],
        }
    }, [activeModules, activeModuleOrders, maintenancePrice, t])

    // ── Modules cost (without maintenance) ──
    const modulesCost = activeMonthlyEstimate - maintenancePrice

    return (
        <PageEntrance className="space-y-8">
            <PanelPageHeader
                title={t('panel.subscription.title')}
                subtitle={t('panel.subscription.subtitle')}
                icon={<Puzzle className="w-5 h-5" />}
                badge={activeModules.length}
            />

            {/* ── Success Banner (module just purchased) ── */}
            <AnimatePresence>
                {purchasedModule && (
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="backdrop-blur-md shadow-sm rounded-2xl p-5 border border-success/30 bg-brand-subtle"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-green-500/10">
                                <PartyPopper className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-tx text-sm">
                                    {t('panel.subscription.moduleActivated') || '¡Módulo activado correctamente!'}
                                </p>
                                <p className="text-xs text-tx-muted mt-0.5">
                                    {t('panel.subscription.moduleActivatedDesc') || 'Ya puedes usar todas las funcionalidades de este módulo.'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Maintenance Free Banner ── */}
            {tenantStatus === 'maintenance_free' && maintenanceDaysRemaining != null && (
                <div className="backdrop-blur-md shadow-sm rounded-2xl p-4 border border-info/30 bg-brand-subtle">
                    <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-brand shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-tx">
                                {t('panel.subscription.maintenanceFree').replace('{{days}}', String(maintenanceDaysRemaining))}
                            </p>
                            <div className="mt-2 h-1.5 bg-sf-2 rounded-full overflow-hidden max-w-xs">
                                <div
                                    className="h-full bg-gradient-to-r from-brand to-accent rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.max(5, (maintenanceDaysRemaining / 30) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl p-4 flex items-center gap-2"
                    >
                        <Shield className="w-4 h-4 shrink-0" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Stat Cards ── */}
            <PanelStatGrid columns={3}>
                <StatCard
                    label={t('panel.subscription.activeStack') || 'Stack activo'}
                    value={<CountUp value={activeModules.length} suffix={` ${t('panel.subscription.modulesLabel') || 'módulos'}`} />}
                    icon={<Puzzle className="w-5 h-5" />}
                    stagger={0}
                />
                <StatCard
                    label={t('panel.subscription.monthlyEstimate') || 'Estimación mensual'}
                    value={<CountUp value={activeMonthlyEstimate} prefix="CHF " />}
                    icon={<Wallet className="w-5 h-5" />}
                    trend={modulesCost > 0 ? { value: Math.round((modulesCost / maintenancePrice) * 100), label: t('panel.subscription.modulesLabel') || 'módulos' } : undefined}
                    stagger={1}
                />
                <StatCard
                    label={t('panel.subscription.nextRecommendation') || 'Próximo paso'}
                    value={recommendedModule?.name || t('panel.subscription.fullStack') || 'Stack completo'}
                    icon={<Sparkles className="w-5 h-5" />}
                    stagger={2}
                    variant="compact"
                />
            </PanelStatGrid>

            {/* ── Cost Breakdown Chart ── */}
            {activeModules.length > 0 && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6"
                >
                    <h2 className="text-base font-semibold text-tx mb-1 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-brand" />
                        {t('panel.subscription.costBreakdown') || 'Desglose de costos'}
                    </h2>
                    <p className="text-xs text-tx-muted mb-4">
                        {t('panel.subscription.costBreakdownDesc') || 'Distribución mensual de tu suscripción'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <PanelChart
                            type="doughnut"
                            data={costBreakdownData}
                            height={220}
                            hideLegend={false}
                            ariaLabel={t('panel.subscription.costBreakdown') || 'Cost breakdown chart'}
                        />
                        <div className="space-y-3">
                            {/* Maintenance line */}
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                                    <span className="text-tx-sec">{t('panel.subscription.maintenanceBase') || 'Mantenimiento'}</span>
                                </div>
                                <span className="font-semibold text-tx">{formatChf(maintenancePrice)}/mes</span>
                            </div>
                            {/* Module lines */}
                            {activeModuleOrders.map((order, idx) => {
                                const cat = activeModules.find(m => m.key === order.moduleKey)
                                if (!cat) return null
                                const tier = getSelectedTier(cat, order.tierKey)
                                return (
                                    <div key={order.moduleKey} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODULE_COLORS[(idx + 1) % MODULE_COLORS.length] }} />
                                            <span className="text-tx-sec">{cat.icon} {cat.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sf-2 text-tx-muted">{tier.name}</span>
                                        </div>
                                        <span className="font-semibold text-tx">{formatChf(tier.price_chf)}/mes</span>
                                    </div>
                                )
                            })}
                            {/* Total */}
                            <div className="border-t border-sf-2 pt-3 flex items-center justify-between text-sm">
                                <span className="font-semibold text-tx">{t('panel.subscription.total') || 'Total mensual'}</span>
                                <span className="text-lg font-bold text-brand">{formatChf(activeMonthlyEstimate)}/mes</span>
                            </div>
                        </div>
                    </div>
                </motion.section>
            )}

            {/* ── Active Modules ── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-tx">
                        {t('panel.subscription.activeModules') || 'Módulos activos'}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                        {activeModules.length}
                    </span>
                </div>

                {activeModules.length === 0 ? (
                    <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-8 text-center">
                        <Puzzle className="w-12 h-12 text-tx-muted mx-auto mb-3 opacity-30" />
                        <p className="text-tx-muted text-sm font-medium">
                            {t('panel.subscription.noActiveModules') || 'No hay módulos activos todavía.'}
                        </p>
                        <p className="text-tx-muted text-xs mt-1">
                            {t('panel.subscription.exploreModules') || 'Explora el marketplace para potenciar tu tienda'}
                        </p>
                    </div>
                ) : (
                    <ListStagger>
                        {activeModules.map((catalogEntry) => {
                            const activeOrder = activeOrdersByModule.get(catalogEntry.key)
                            const tier = getSelectedTier(catalogEntry, activeOrder?.tierKey)
                            const activatedDate = activeOrder?.activatedAt
                                ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(activeOrder.activatedAt))
                                : null

                            return (
                                <StaggerItem key={catalogEntry.key}>
                                    <div className="bg-sf-0/50 backdrop-blur-md shadow-sm rounded-2xl p-4 border border-success/30 hover:border-success/60 transition-all group">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xl shrink-0">{catalogEntry.icon}</span>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-tx text-sm">{catalogEntry.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                                                            <Check className="w-2.5 h-2.5" />
                                                            {t('panel.subscription.active') || 'Activo'}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sf-2 text-tx-muted font-medium">
                                                            {tier.name}
                                                        </span>
                                                        {activatedDate && (
                                                            <span className="text-[10px] text-tx-muted hidden sm:inline">
                                                                · {activatedDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-tx shrink-0">{formatChf(tier.price_chf)}/mes</p>
                                        </div>

                                        {/* Usage/Limits — Mini progress bar */}
                                        {tier?.features?.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-sf-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {tier.features.slice(0, 3).map((feature, idx) => (
                                                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-sf-2 text-tx-muted">
                                                            ✓ {feature}
                                                        </span>
                                                    ))}
                                                    {tier.features.length > 3 && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sf-2 text-tx-muted">
                                                            +{tier.features.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </StaggerItem>
                            )
                        })}
                    </ListStagger>
                )}
            </section>

            {/* ── Recommended Module Card ── */}
            {recommendedModule && !purchasedModule && (
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="backdrop-blur-md shadow-sm rounded-2xl p-5 border border-brand/50 bg-brand-subtle relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand/5 to-transparent rounded-bl-full" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 text-brand" />
                            <h2 className="text-base font-semibold text-tx">
                                {t('panel.subscription.recommendedForStore') || 'Recomendado para tu tienda'}
                            </h2>
                        </div>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <p className="text-sm text-tx-sec">
                                {recommendedModule.icon} <span className="font-semibold text-tx">{recommendedModule.name}</span>
                                {' — '}{t('panel.subscription.recommendedDescription') || 'El siguiente paso ideal para potenciar tu negocio.'}
                            </p>
                            <button
                                onClick={() => onPurchase(recommendedModule.key)}
                                disabled={purchasingModule === recommendedModule.key}
                                className="btn btn-primary px-4 py-2 text-sm shrink-0 inline-flex items-center gap-2"
                            >
                                {purchasingModule === recommendedModule.key
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('panel.subscription.redirecting') || 'Redirigiendo...'}</>
                                    : <><Zap className="w-4 h-4" /> {t('panel.subscription.purchase') || 'Contratar'}</>
                                }
                            </button>
                        </div>
                    </div>
                </motion.section>
            )}

            {/* ── Available Modules ── */}
            {availableModules.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-brand" />
                        <h2 className="text-lg font-semibold text-tx">
                            {t('panel.subscription.availableModules') || 'Módulos disponibles'}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-subtle text-brand font-medium">
                            {availableModules.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableModules.map((catalogEntry) => {
                            const selectedTier = getSelectedTier(catalogEntry, selectedTiers[catalogEntry.key])
                            const buying = purchasingModule === catalogEntry.key

                            return (
                                <motion.article
                                    key={catalogEntry.key}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ y: -2 }}
                                    className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-5 hover:border-brand/50 transition-all hover:shadow-lg group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{catalogEntry.icon}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-tx text-sm">{catalogEntry.name}</p>
                                                    {recommendedModule?.key === catalogEntry.key && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-subtle px-2 py-0.5 text-[10px] text-brand font-medium">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            {t('panel.subscription.recommended') || 'Recomendado'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-tx-muted mt-0.5 line-clamp-2">{catalogEntry.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tier selector */}
                                    {catalogEntry.tiers.length > 1 && (
                                        <div className="mt-3">
                                            <label className="text-xs text-tx-muted block mb-1">{t('panel.subscription.selectTier') || 'Selecciona tier'}</label>
                                            <select
                                                value={selectedTier.key}
                                                onChange={(e) => onTierChange(catalogEntry.key, e.target.value)}
                                                className="w-full bg-sf-2 border border-sf-3 text-tx text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand transition-colors"
                                                disabled={buying}
                                            >
                                                {catalogEntry.tiers.map((tier) => (
                                                    <option key={tier.key} value={tier.key}>
                                                        {tier.name} — {tier.price_chf} CHF/mes
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Features preview */}
                                    {(selectedTier?.features?.length ?? 0) > 0 && (
                                    <div className="mt-3">
                                        <ul className="space-y-1">
                                            {selectedTier.features.slice(0, 3).map((feature) => (
                                                <li key={feature} className="text-xs text-tx-sec flex items-start gap-2">
                                                    <Check className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                            {selectedTier.features.length > 3 && (
                                                <li className="text-xs text-tx-muted pl-5.5">
                                                    +{selectedTier.features.length - 3} {t('panel.subscription.moreFeatures') || 'más'}
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    )}

                                    {/* Price + CTA */}
                                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-sf-2">
                                        <div>
                                            <p className="text-lg font-bold text-tx">{formatChf(selectedTier.price_chf)}</p>
                                            <p className="text-[10px] text-tx-muted uppercase tracking-wider">{t('panel.subscription.perMonth') || 'al mes'}</p>
                                        </div>
                                        <button
                                            onClick={() => onPurchase(catalogEntry.key)}
                                            disabled={buying}
                                            className="btn btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60 transition-transform active:scale-95"
                                        >
                                            {buying ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> {t('panel.subscription.redirecting') || 'Redirigiendo...'}</>
                                            ) : (
                                                <><CreditCard className="w-4 h-4" /> {t('panel.subscription.purchase') || 'Contratar'}</>
                                            )}
                                        </button>
                                    </div>
                                </motion.article>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* ── Billing Management ── */}
            {hasStripeCustomer && (
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-sf-0/50 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-sf-3/30"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-brand-muted to-brand-subtle text-brand shrink-0">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-semibold text-tx">
                                {t('panel.subscription.billing') || 'Facturación'}
                            </h2>
                            <p className="text-sm text-tx-muted mt-1">
                                {t('panel.subscription.billingDescription') || 'Gestiona tus métodos de pago, facturas y suscripciones activas.'}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-tx-muted">
                                <span className="inline-flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    {t('panel.subscription.paymentMethods') || 'Métodos de pago'}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5" />
                                    {t('panel.subscription.invoiceHistory') || 'Historial de facturas'}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {t('panel.subscription.cancelOrUpgrade') || 'Cancelar o mejorar'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-sf-2">
                        <button
                            onClick={onManageBilling}
                            disabled={isPending}
                            className="btn btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                            {t('panel.subscription.manageBilling') || 'Gestionar facturación'}
                        </button>
                    </div>
                </motion.section>
            )}
        </PageEntrance>
    )
}
