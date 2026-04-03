'use client'

/**
 * ModulesMarketplaceClient — SOTA Module Marketplace for Owners
 *
 * Features:
 * - AnimatePresence + PageEntrance for SOTA transitions
 * - Category filter tabs with layoutId animation
 * - Module cards with gradient coloring, status badges, and hover effects
 * - Tier comparison in expandable detail view
 * - Animated StatCards with PanelStatGrid  
 * - Power User banner with shimmer
 * - Recently activated celebration glow
 */

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
    Check,
    ChevronDown,
    ChevronUp,
    Lock,
    Sparkles,
    TrendingUp,
    Wallet,
    Zap,
    Blocks,
    ShoppingBag,
    Users,
    BarChart3,
    Settings,
    PartyPopper,
} from 'lucide-react'
import type { OwnerModuleInfo } from '@/lib/owner-modules'
import ModuleCheckoutButton from '@/components/panel/ModuleCheckoutButton'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { PageEntrance, CountUp } from '@/components/panel/PanelAnimations'
import dynamic from 'next/dynamic'
import type { SkillTreeModule } from '@/components/panel/SkillTree'

// Lazy-load SkillTree to avoid SSR issues with React Flow
const SkillTreeCanvas = dynamic(
    () => import('@/components/panel/SkillTree/SkillTreeCanvas').then(m => m.SkillTreeCanvas),
    { ssr: false, loading: () => <div className="h-[70vh] flex items-center justify-center bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl"><div className="animate-pulse text-tx-muted text-sm">Cargando árbol de habilidades...</div></div> }
)

interface ModulesMarketplaceClientProps {
    catalog: OwnerModuleInfo[]
    activeModules: Record<string, { tierKey: string }>
    monthlySpend: number
    locale: string
    labels: Record<string, string>
    /** Module keys activated within last 7 days — shows glow effect */
    recentlyActivated?: string[]
}

const CATEGORIES = ['all', 'sell', 'engage', 'grow', 'automate'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
    all: <Blocks className="w-3.5 h-3.5" />,
    sell: <ShoppingBag className="w-3.5 h-3.5" />,
    engage: <Users className="w-3.5 h-3.5" />,
    grow: <BarChart3 className="w-3.5 h-3.5" />,
    automate: <Settings className="w-3.5 h-3.5" />,
}

export default function ModulesMarketplaceClient({
    catalog,
    activeModules,
    monthlySpend,
    locale,
    labels,
    recentlyActivated = [],
}: ModulesMarketplaceClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<Category>('all')
    const [expandedModule, setExpandedModule] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')

    const categoryLabels: Record<Category, string> = {
        all: labels.allCategories,
        sell: labels.categorySell,
        engage: labels.categoryEngage,
        grow: labels.categoryGrow,
        automate: labels.categoryAutomate,
    }

    const filteredModules = useMemo(() => {
        const validCatalog = catalog.filter(m => m.key)
        if (selectedCategory === 'all') return validCatalog
        return validCatalog.filter(m => m.category === selectedCategory)
    }, [catalog, selectedCategory])

    const activeCount = Object.keys(activeModules).length
    const totalModules = catalog.filter(m => m.key).length
    const availableCount = totalModules - activeCount
    const isPowerUser = activeCount >= 5

    // Transform catalog to SkillTree format
    const skillTreeModules: SkillTreeModule[] = useMemo(() => {
        const validCatalog = catalog.filter(m => m.key)
        return validCatalog.map(mod => {
            const activeTier = activeModules[mod.key]
            const tierIndex = activeTier
                ? mod.tiers.findIndex(t => t.key === activeTier.tierKey)
                : -1
            return {
                key: mod.key,
                name: mod.name,
                icon: mod.emoji,
                description: mod.description,
                category: mod.category,
                payment_type: mod.payment_type,
                requires: mod.requires,
                tiers: mod.tiers.map(t => ({
                    key: t.key,
                    name: t.name,
                    price_chf: t.price,
                    features: t.features,
                    recommended: t.is_recommended,
                })),
                currentTierIndex: tierIndex,
                isActive: !!activeTier,
            }
        })
    }, [catalog, activeModules])

    const handleSkillTreeClick = useCallback((moduleKey: string) => {
        setExpandedModule(prev => prev === moduleKey ? null : moduleKey)
        // If in tree view, switch to list view and expand the module
        if (viewMode === 'tree') {
            setViewMode('list')
            setTimeout(() => setExpandedModule(moduleKey), 100)
        }
    }, [viewMode])

    return (
        <PageEntrance className="space-y-6">
            {/* ── Power User Banner ── */}
            <AnimatePresence>
                {isPowerUser && (
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12 }}
                    >
                        <SotaGlassCard glowColor="warning" className="relative overflow-hidden bg-gradient-to-r from-brand-subtle via-sf-0 to-brand-subtle border-brand-soft p-5">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10">
                                <Zap className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-tx">
                                    {labels.powerUserTitle || 'Power User!'}
                                </p>
                                <p className="text-xs text-tx-muted mt-0.5">
                                    {labels.powerUserDesc || `Tienes ${activeCount} módulos activos. ¡Sigue explorando para desbloquear todo el potencial de tu tienda!`}
                                </p>
                            </div>
                        </div>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                        </SotaGlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Recently Activated Celebration ── */}
            <AnimatePresence>
                {recentlyActivated.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <SotaGlassCard glowColor="emerald" className="p-4 bg-brand-subtle">
                        <div className="flex items-center gap-3">
                            <PartyPopper className="w-5 h-5 text-green-400 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-tx">
                                    {labels.recentlyActivated || '¡Recién activado!'}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {recentlyActivated.map(key => {
                                        const mod = catalog.find(m => m.key === key)
                                        return mod ? (
                                            <span key={key} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                                                {mod.emoji} {mod.name}
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            </div>
                        </div>
                        </SotaGlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Summary Stats ── */}
            <SotaBentoGrid>
                <SotaBentoItem colSpan={4}>
                    <SotaMetric
                        label={labels.activeModules || 'Módulos activos'}
                        value={`${activeCount} / ${totalModules}`}
                        icon={<Blocks className="w-5 h-5" />}
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={4}>
                    <SotaMetric
                        label={labels.monthlySpend || 'Gasto mensual'}
                        value={monthlySpend > 0 ? `${monthlySpend} CHF` : '—'}
                        icon={<Wallet className="w-5 h-5" />}
                        trend={monthlySpend > 0 ? { value: 0, label: labels.monthly || '/mes' } : undefined}
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={4}>
                    <SotaMetric
                        label={labels.availableModules || 'Disponibles'}
                        value={availableCount.toString()}
                        icon={<TrendingUp className="w-5 h-5" />}
                    />
                </SotaBentoItem>
            </SotaBentoGrid>

            {/* ── Progress Bar ── */}
            <SotaGlassCard glowColor="none" className="p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-tx-muted font-medium">{labels.activeModules || 'Módulos activos'}</span>
                    <span className="font-semibold text-tx">{activeCount}/{totalModules}</span>
                </div>
                <div className="h-2 bg-sf-2 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalModules > 0 ? (activeCount / totalModules) * 100 : 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-brand to-accent rounded-full"
                    />
                </div>
            </SotaGlassCard>

            {/* ── View Mode Toggle ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-tx">
                        {viewMode === 'tree' ? '🏰 Árbol de Habilidades' : labels.activeModules || 'Módulos'}
                    </h3>
                    <span className="text-xs text-tx-muted font-medium px-2 py-0.5 bg-sf-2 rounded-full">
                        {activeCount}/{totalModules}
                    </span>
                </div>
                <div className="flex gap-1 bg-sf-1 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('tree')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            viewMode === 'tree'
                                ? 'bg-brand text-white shadow-sm'
                                : 'text-tx-muted hover:text-tx'
                        }`}
                    >
                        ⚔️ Skill Tree
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            viewMode === 'list'
                                ? 'bg-brand text-white shadow-sm'
                                : 'text-tx-muted hover:text-tx'
                        }`}
                    >
                        📋 Lista
                    </button>
                </div>
            </div>

            {/* ── Skill Tree View ── */}
            {viewMode === 'tree' && (
                <SkillTreeCanvas
                    modules={skillTreeModules}
                    onModuleClick={handleSkillTreeClick}
                />
            )}

            {/* ── Legacy List View ── */}
            {viewMode === 'list' && (
            <>
            {/* Category Tabs */}
            <LayoutGroup>
                <SotaGlassCard glowColor="none" className="flex gap-1.5 overflow-x-auto pb-1 p-1.5 backdrop-blur-md">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            aria-pressed={selectedCategory === cat}
                            className={`
                                relative px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium whitespace-nowrap
                                transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med
                                inline-flex items-center gap-2
                                ${selectedCategory === cat
                                    ? 'text-white'
                                    : 'text-tx-muted hover:text-tx'
                                }
                            `}
                        >
                            {selectedCategory === cat && (
                                <motion.div
                                    layoutId="category-pill"
                                    className="absolute inset-0 bg-brand rounded-xl shadow-sm"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10 inline-flex items-center gap-2">
                                {CATEGORY_ICONS[cat]}
                                {categoryLabels[cat]}
                            </span>
                        </button>
                    ))}
                </SotaGlassCard>
            </LayoutGroup>

            {/* ── Module Grid ── */}
            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                <AnimatePresence mode="popLayout">
                    {filteredModules.map((mod, idx) => {
                        const isActive = mod.key in activeModules
                        const activeTierKey = activeModules[mod.key]?.tierKey
                        const activeTier = mod.tiers.find(t => t.key === activeTierKey)
                        const canUpgrade = isActive && mod.tiers.some(t => {
                            const tierIndex = mod.tiers.findIndex(tt => tt.key === t.key)
                            const activeIndex = mod.tiers.findIndex(tt => tt.key === activeTierKey)
                            return tierIndex > activeIndex
                        })
                        const isExpanded = expandedModule === mod.key
                        const isRecent = recentlyActivated.includes(mod.key)

                        return (
                            <motion.div
                                key={mod.key}
                                layout
                                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className={`
                                    relative transition-all duration-300
                                    ${isRecent
                                        ? 'ring-2 ring-brand/20 shadow-brand-soft'
                                        : isActive
                                            ? 'shadow-sm'
                                            : 'hover:shadow-lg hover:-translate-y-0.5'
                                    }
                                `}
                            >
                                <SotaGlassCard 
                                    glowColor={isRecent ? 'warning' : isActive ? 'emerald' : 'none'}
                                    className={isActive ? 'border-success/30' : ''}
                                >
                                {/* Recent glow decoration */}
                                {isRecent && (
                                    <div className="absolute -top-px -right-px">
                                        <span className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand" />
                                        </span>
                                    </div>
                                )}

                                {/* Module card header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                text-2xl w-11 h-11 flex items-center justify-center rounded-xl
                                                bg-gradient-to-br ${mod.color_gradient} bg-opacity-10 shadow-sm
                                            `}>
                                                {mod.emoji}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-semibold text-tx">{mod.name}</h3>
                                                    {isActive && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400">
                                                            <Check className="w-2.5 h-2.5" />
                                                            {labels.active}
                                                        </span>
                                                    )}
                                                    {isRecent && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-subtle text-brand">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            {labels.recentlyActivated || 'Nuevo'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-tx-muted mt-0.5 line-clamp-2">{mod.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price preview + CTAs */}
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div>
                                            {isActive && activeTier ? (
                                                <div>
                                                    <span className="text-sm font-semibold text-tx">{activeTier.price} CHF</span>
                                                    <span className="text-xs text-tx-muted">{labels.monthly}</span>
                                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-sf-2 text-tx-muted">{activeTier.name}</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="text-sm font-semibold text-tx">
                                                        {mod.has_free_tier
                                                            ? labels.free
                                                            : `${Math.min(...mod.tiers.map(t => t.price))} CHF`
                                                        }
                                                    </span>
                                                    {!mod.has_free_tier && (
                                                        <span className="text-xs text-tx-muted">{labels.monthly}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {!isActive && (
                                                <ModuleCheckoutButton
                                                    moduleKey={mod.key}
                                                    tierKey={mod.tiers[0]?.key}
                                                    label={labels.activate}
                                                    variant="activate"
                                                    colorGradient={mod.color_gradient}
                                                    locale={locale}
                                                />
                                            )}
                                            {canUpgrade && (
                                                <ModuleCheckoutButton
                                                    moduleKey={mod.key}
                                                    tierKey={mod.tiers[mod.tiers.findIndex(t => t.key === activeTierKey) + 1]?.key}
                                                    label={labels.upgrade}
                                                    variant="upgrade"
                                                    locale={locale}
                                                />
                                            )}
                                            <button
                                                onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                                                aria-expanded={isExpanded}
                                                aria-label={`${labels.viewDetails} — ${mod.name}`}
                                                className="px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium bg-sf-2 text-tx-muted hover:text-tx transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med inline-flex items-center gap-1.5"
                                            >
                                                {labels.viewDetails}
                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dependencies */}
                                    {mod.requires.length > 0 && (
                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-tx-muted">
                                            <Lock className="w-3 h-3" />
                                            {labels.requires}: {mod.requires.map(r => {
                                                const dep = catalog.find(m => m.key === r)
                                                return dep?.name || r
                                            }).join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* ── Expanded Tier Comparison ── */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-sf-2 px-5 py-4 bg-sf-1/50 rounded-b-2xl">
                                                <h4 className="text-sm font-semibold text-tx mb-3 flex items-center gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                                                    {labels.features}
                                                </h4>

                                                <div className="grid gap-3" style={{
                                                    gridTemplateColumns: `repeat(${Math.min(mod.tiers.length, 3)}, 1fr)`,
                                                }}>
                                                    {mod.tiers.map((tier, tierIdx) => {
                                                        const isCurrentTier = activeTierKey === tier.key

                                                        return (
                                                            <motion.div
                                                                key={tier.key}
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: tierIdx * 0.1 }}
                                                                className={`
                                                                    rounded-xl p-4 border transition-all
                                                                    ${isCurrentTier
                                                                        ? 'border-brand bg-brand-subtle shadow-sm'
                                                                        : 'border-sf-3 bg-sf-0 hover:border-brand/30'
                                                                    }
                                                                `}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-semibold text-tx">{tier.name}</span>
                                                                    {tier.is_recommended && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand font-medium inline-flex items-center gap-0.5">
                                                                            <Sparkles className="w-2.5 h-2.5" />
                                                                            {labels.recommended}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="text-lg font-bold text-tx">
                                                                    {tier.price > 0 ? `${tier.price} CHF` : labels.free}
                                                                    <span className="text-xs font-normal text-tx-muted">{tier.price > 0 ? labels.monthly : ''}</span>
                                                                </div>

                                                                {isCurrentTier && (
                                                                    <div className="mt-1.5 text-xs text-brand font-medium inline-flex items-center gap-1">
                                                                        <Check className="w-3 h-3" />
                                                                        {labels.currentPlan}
                                                                    </div>
                                                                )}

                                                                <ul className="mt-3 space-y-1.5">
                                                                    {tier.features.map((feature, fidx) => (
                                                                        <li key={fidx} className="text-xs text-tx-muted flex items-start gap-1.5">
                                                                            <Check className={`w-3 h-3 mt-0.5 shrink-0 ${isCurrentTier ? 'text-brand' : 'text-tx-muted'}`} />
                                                                            {feature}
                                                                        </li>
                                                                    ))}
                                                                </ul>

                                                                {!isCurrentTier && (
                                                                    <div className="mt-3">
                                                                        <ModuleCheckoutButton
                                                                            moduleKey={mod.key}
                                                                            tierKey={tier.key}
                                                                            label={isActive ? labels.upgrade : labels.activate}
                                                                            variant={isActive && mod.tiers.indexOf(tier) > mod.tiers.findIndex(t => t.key === activeTierKey) ? 'upgrade' : 'activate'}
                                                                            colorGradient={mod.color_gradient}
                                                                            locale={locale}
                                                                            className="w-full"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                </SotaGlassCard>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </motion.div>

            {filteredModules.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <SotaGlassCard glowColor="none" className="p-12 text-center">
                    <Blocks className="w-12 h-12 text-tx-muted mx-auto mb-3 opacity-30" />
                    <p className="text-tx-muted text-sm font-medium">
                        {labels.noModulesAvailable || 'No hay módulos en esta categoría'}
                    </p>
                    </SotaGlassCard>
                </motion.div>
            )}
            </> /* end list view */
            )}
        </PageEntrance>
    )
}
