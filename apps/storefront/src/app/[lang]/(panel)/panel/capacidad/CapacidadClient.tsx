'use client'

/**
 * Capacidad (Traffic / Performance) — Owner Panel (SOTA rewrite)
 *
 * Props match page.tsx: lang, businessName, featureFlags, limits, labels
 *
 * Fixes:
 * - Math.random() → deterministic simulated data from limits
 * - No animation → PageEntrance + ListStagger + StaggerItem
 * - Plain bars → animated width transitions
 * - No hover effects → hover-lift, micro-animations
 * - Feature cards: animated entrance
 */

import { Gauge, Wifi, Zap, BarChart3, Activity, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

interface Props {
    lang: string
    businessName: string
    featureFlags: {
        trafficExpansion: boolean
        trafficAnalytics: boolean
        trafficAutoscale: boolean
    }
    limits: {
        maxRequestsDay: number
    }
    labels: {
        title: string
        subtitle: string
        dailyTraffic: string
        requestsToday: string
        maxRequestsDay: string
        expansion: string
        expansionDesc: string
        analytics: string
        analyticsDesc: string
        autoscale: string
        autoscaleDesc: string
        active: string
        inactive: string
        comingSoon: string
        upgradeModule: string
    }
}

function AnimatedProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0
    const isHigh = percent >= 80
    const isMedium = percent >= 50

    return (
        <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className={`h-full rounded-full ${
                    isHigh ? 'bg-red-500' : isMedium ? color : 'bg-emerald-500'
                }`}
            />
        </div>
    )
}

export default function CapacidadClient({ featureFlags, limits, labels }: Props) {
    // Deterministic "simulated" usage — in production this would come from actual metrics
    const requestsToday = Math.round(limits.maxRequestsDay * 0.42)
    const percent = limits.maxRequestsDay > 0 ? Math.round((requestsToday / limits.maxRequestsDay) * 100) : 0

    const features = [
        {
            key: 'expansion',
            label: labels.expansion,
            description: labels.expansionDesc,
            enabled: featureFlags.trafficExpansion,
            icon: ArrowUpRight,
        },
        {
            key: 'analytics',
            label: labels.analytics,
            description: labels.analyticsDesc,
            enabled: featureFlags.trafficAnalytics,
            icon: BarChart3,
        },
        {
            key: 'autoscale',
            label: labels.autoscale,
            description: labels.autoscaleDesc,
            enabled: featureFlags.trafficAutoscale,
            icon: Activity,
        },
    ]

    return (
        <PageEntrance className="space-y-6">
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<Gauge className="w-5 h-5" />}
            />

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label={labels.requestsToday}
                    value={requestsToday.toLocaleString()}
                    icon={<Zap className="w-5 h-5" />}
                    stagger={0}
                />
                <StatCard
                    label={labels.maxRequestsDay}
                    value={limits.maxRequestsDay.toLocaleString()}
                    icon={<Wifi className="w-5 h-5" />}
                    stagger={1}
                />
                <StatCard
                    label={labels.dailyTraffic}
                    value={`${percent}%`}
                    icon={<Gauge className="w-5 h-5" />}
                    stagger={2}
                />
            </div>

            {/* Usage Bar */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5"
            >
                <div className="flex justify-between text-sm mb-3">
                    <span className="font-medium">{labels.requestsToday}</span>
                    <span className="text-text-muted">
                        {requestsToday.toLocaleString()} / {limits.maxRequestsDay.toLocaleString()}
                    </span>
                </div>
                <AnimatedProgressBar value={requestsToday} max={limits.maxRequestsDay} color="bg-primary" />
            </motion.div>

            {/* Features */}
            <div>
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3"
                >
                    {labels.expansion}
                </motion.h2>
                <ListStagger className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {features.map((feature) => {
                        const Icon = feature.icon
                        return (
                            <StaggerItem key={feature.key}>
                                <motion.div
                                    whileHover={{ y: -2, scale: 1.01 }}
                                    className="glass rounded-2xl p-5 transition-shadow hover:shadow-lg"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            feature.enabled ? 'bg-primary/10' : 'bg-surface-2'
                                        }`}>
                                            <Icon className={`w-5 h-5 ${feature.enabled ? 'text-primary' : 'text-text-muted'}`} />
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                            feature.enabled
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-surface-2 text-text-muted'
                                        }`}>
                                            {feature.enabled ? labels.active : labels.inactive}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-text-primary mb-1">{feature.label}</h3>
                                    <p className="text-xs text-text-secondary leading-relaxed">{feature.description}</p>
                                </motion.div>
                            </StaggerItem>
                        )
                    })}
                </ListStagger>
            </div>

            {/* Upgrade hint */}
            {features.some(f => !f.enabled) && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-sm text-text-muted"
                >
                    {labels.upgradeModule}
                </motion.p>
            )}
        </PageEntrance>
    )
}
