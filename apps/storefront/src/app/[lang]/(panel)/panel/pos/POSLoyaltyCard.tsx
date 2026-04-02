/**
 * POSLoyaltyCard — Digital Stamp Card Visualization
 *
 * Shows the customer's loyalty progress as an animated stamp grid.
 * Supports redeem actions and displays reward info.
 * Feature-gated: Pro tier (`enable_pos_reports`).
 */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    X, Award, Star, Gift, Stamp, ChevronRight,
    Sparkles, History, User, Crown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getLoyaltyConfig,
    getCustomerLoyalty,
    addStamp,
    redeemReward,
    getStampProgress,
    getRedemptionHistory,
    type LoyaltyConfig,
    type LoyaltyCustomer,
    type LoyaltyRedemption,
} from '@/lib/pos/loyalty-engine'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'

interface POSLoyaltyCardProps {
    customerId: string | null
    customerName: string | null
    onClose: () => void
    onRewardApplied?: (rewardDescription: string) => void
    labels: Record<string, string>
    defaultCurrency: string
}

type LoyaltyTab = 'card' | 'history'

export default function POSLoyaltyCard({
    customerId,
    customerName,
    onClose,
    onRewardApplied,
    labels,
    defaultCurrency,
}: POSLoyaltyCardProps) {
    const [config] = useState<LoyaltyConfig>(() => getLoyaltyConfig())
    const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null)
    const [history, setHistory] = useState<LoyaltyRedemption[]>([])
    const [activeTab, setActiveTab] = useState<LoyaltyTab>('card')
    const [justStamped, setJustStamped] = useState(false)
    const [justRedeemed, setJustRedeemed] = useState(false)

    useEffect(() => {
        if (customerId) {
            setCustomer(getCustomerLoyalty(customerId))
            setHistory(getRedemptionHistory().filter(r => r.customerId === customerId))
        }
    }, [customerId])

    const progress = useMemo(() => {
        if (!customer) return null
        return getStampProgress(customer, config)
    }, [customer, config])

    const handleAddStamp = useCallback(() => {
        if (!customerId || !customerName) return
        const updated = addStamp(customerId, customerName)
        setCustomer(updated)
        setJustStamped(true)
        setTimeout(() => setJustStamped(false), 1500)
    }, [customerId, customerName])

    const handleRedeem = useCallback(() => {
        if (!customerId) return
        const redemption = redeemReward(customerId)
        if (redemption) {
            setCustomer(getCustomerLoyalty(customerId))
            setHistory(prev => [redemption, ...prev])
            setJustRedeemed(true)
            onRewardApplied?.(redemption.rewardDescription)
            setTimeout(() => setJustRedeemed(false), 3000)
        }
    }, [customerId, onRewardApplied])

    const formatCurrency = useCallback((amount: number) =>
        formatPOSCurrency(amount, defaultCurrency),
    [defaultCurrency])

    if (!customerId) {
        return (
            <LoyaltyShell onClose={onClose} labels={labels}>
                <div className="p-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                        <User className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-tx text-base">
                            {labels['panel.pos.noCustomer'] || 'Sin cliente seleccionado'}
                        </h3>
                        <p className="text-xs text-tx-muted mt-1 max-w-[200px] mx-auto">
                            {labels['panel.pos.selectCustomerLoyalty'] || 'Selecciona un cliente para ver su tarjeta de fidelidad'}
                        </p>
                    </div>
                </div>
            </LoyaltyShell>
        )
    }

    return (
        <LoyaltyShell onClose={onClose} labels={labels}>
            {/* Customer info bar */}
            <div className="px-5 py-3 bg-glass border-b border-sf-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-subtle to-brand-subtle flex items-center justify-center">
                    <span className="text-sm font-bold text-brand">
                        {(customerName || '?')[0].toUpperCase()}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-tx truncate">{customerName}</div>
                    {customer && (
                        <div className="text-[10px] text-tx-muted">
                            {customer.totalRedeemed} {labels['panel.pos.rewardsRedeemed'] || 'recompensas canjeadas'}
                        </div>
                    )}
                </div>
                {progress && progress.percentage >= 80 && (
                    <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {labels['panel.pos.almostThere'] || '¡Casi!'}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex px-5 py-2 gap-1.5 border-b border-sf-2">
                {(['card', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px]
                                   ${activeTab === tab
                                ? 'text-brand'
                                : 'text-tx-muted hover:text-tx-sec hover:bg-sf-1'
                            }`}
                    >
                        {tab === 'card'
                            ? (labels['panel.pos.stampCard'] || 'Tarjeta')
                            : (labels['panel.pos.history'] || 'Historial')}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="loyalty-tab"
                                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand"
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'card' ? (
                        <motion.div
                            key="card"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            className="p-5 space-y-5"
                        >
                            {/* ── Stamp Grid ── */}
                            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200/40 p-4 relative overflow-hidden">
                                {/* Decorative shine */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/40 to-transparent rounded-bl-full" />

                                <div className="flex items-center justify-between mb-3 relative z-10">
                                    <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wider">
                                        {config.businessName || labels['panel.pos.loyaltyCard'] || 'Tarjeta de fidelidad'}
                                    </h3>
                                    <Star className="w-3.5 h-3.5 text-violet-400" />
                                </div>

                                <div className="grid grid-cols-5 gap-2 relative z-10">
                                    {Array.from({ length: config.stampsRequired }, (_, i) => {
                                        const filled = customer ? i < customer.stamps : false
                                        const isLast = i === config.stampsRequired - 1
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: i * 0.04, type: 'spring', damping: 15, stiffness: 200 }}
                                                className={`aspect-square rounded-xl flex items-center justify-center border-2
                                                           transition-all duration-300
                                                           ${filled
                                                        ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/30'
                                                        : isLast
                                                            ? 'bg-white/60 border-amber-300 border-dashed'
                                                            : 'bg-white/60 border-violet-200/60 border-dashed'
                                                    }`}
                                            >
                                                {filled ? (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -45 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                                                    >
                                                        <Stamp className="w-4 h-4" />
                                                    </motion.div>
                                                ) : isLast ? (
                                                    <Gift className="w-4 h-4 text-amber-400" />
                                                ) : (
                                                    <span className="text-[10px] text-violet-300 font-bold">{i + 1}</span>
                                                )}
                                            </motion.div>
                                        )
                                    })}
                                </div>

                                {/* Progress bar */}
                                {progress && (
                                    <div className="mt-3 relative z-10">
                                        <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${progress.percentage}%` }}
                                                transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[10px] text-violet-600 font-medium">
                                                {progress.current}/{progress.required}
                                            </span>
                                            <span className="text-[10px] text-violet-500">
                                                {progress.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Reward info ── */}
                            <div className="rounded-2xl bg-glass border border-sf-2 p-4 flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <Gift className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-tx">
                                        {labels['panel.pos.reward'] || 'Recompensa'}
                                    </h4>
                                    <p className="text-[11px] text-tx-muted mt-0.5">
                                        {config.rewardDescription}
                                        {config.rewardType === 'percentage_discount' && ` (${config.rewardValue}%)`}
                                        {config.rewardType === 'fixed_discount' && ` (${formatCurrency(config.rewardValue)})`}
                                    </p>
                                </div>
                            </div>

                            {/* ── Actions ── */}
                            <div className="flex gap-2.5">
                                <button
                                    onClick={handleAddStamp}
                                    disabled={progress?.isComplete}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                                               border border-brand bg-brand-subtle text-brand text-sm font-bold
                                               hover:bg-brand hover:text-white
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               transition-all duration-300 min-h-[48px]"
                                >
                                    <Stamp className="w-4 h-4" />
                                    {justStamped
                                        ? (labels['panel.pos.stamped'] || '✓ Sellado')
                                        : (labels['panel.pos.addStamp'] || 'Añadir sello')}
                                </button>

                                {progress?.isComplete && (
                                    <motion.button
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={handleRedeem}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                                                   bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold
                                                   shadow-lg shadow-amber-500/30
                                                   hover:shadow-xl hover:-translate-y-0.5
                                                   transition-all duration-300 min-h-[48px]"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {labels['panel.pos.redeemReward'] || '¡Canjear!'}
                                    </motion.button>
                                )}
                            </div>

                            {/* Redeem celebration */}
                            <AnimatePresence>
                                {justRedeemed && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-center py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50
                                                   border border-amber-200/40"
                                    >
                                        <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                        <h4 className="text-sm font-bold text-amber-800">
                                            {labels['panel.pos.rewardRedeemed'] || '¡Recompensa canjeada!'}
                                        </h4>
                                        <p className="text-xs text-amber-600 mt-0.5">
                                            {config.rewardDescription}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        /* ── History tab ── */
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            className="p-5"
                        >
                            {history.length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <History className="w-8 h-8 text-tx-faint mx-auto" />
                                    <p className="text-sm text-tx-muted">
                                        {labels['panel.pos.noRedemptions'] || 'Sin canjes anteriores'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-sf-2"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                                <Award className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-tx truncate">
                                                    {item.rewardDescription}
                                                </div>
                                                <div className="text-[10px] text-tx-muted">
                                                    {new Date(item.redeemedAt).toLocaleDateString(undefined, {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-tx-faint" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Just-stamped toast */}
            <AnimatePresence>
                {justStamped && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-6 left-5 right-5 py-3 px-4 rounded-2xl
                                   bg-violet-600 text-white text-center text-xs font-bold shadow-xl"
                    >
                        <Stamp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                        {labels['panel.pos.stampAdded'] || 'Sello añadido'} — {progress?.current}/{progress?.required}
                    </motion.div>
                )}
            </AnimatePresence>
        </LoyaltyShell>
    )
}

/* ─── Shell wrapper ─── */

function LoyaltyShell({
    onClose,
    labels,
    children,
}: {
    onClose: () => void
    labels: Record<string, string>
    children: React.ReactNode
}) {
    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <motion.div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
            />
            <motion.div
                className="relative w-full max-w-md bg-sf-0 shadow-2xl flex flex-col overflow-hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2 bg-glass-heavy backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base leading-tight">
                                {labels['panel.pos.loyaltyProgram'] || 'Programa de fidelidad'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">
                                {labels['panel.pos.loyaltySubtitle'] || 'Sellos y recompensas'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close'}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    )
}
