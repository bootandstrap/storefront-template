'use client'

/**
 * ActivityFeed — Premium timeline-style activity feed.
 * Replaces flat list with connected vertical timeline,
 * colored icon backgrounds, and staggered entrance animation.
 */

import { useEffect, useState } from 'react'
import {
    ShoppingCart, Package, Settings, CreditCard,
    Users, Tag, Zap, Bell, Activity
} from 'lucide-react'

interface ActivityEvent {
    id: string
    type: string
    description: string
    timestamp: string
    /** Optional metadata for extra context */
    meta?: Record<string, unknown>
}

interface ActivityFeedProps {
    events: ActivityEvent[]
    labels: {
        title: string
        noActivity: string
        noActivityDesc: string
    }
    lang: string
}

// Icon config with background colors for the timeline dots
const EVENT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; darkBg: string }> = {
    order_created:       { icon: <ShoppingCart className="w-3.5 h-3.5" />, bg: 'bg-blue-50 text-blue-600',       darkBg: 'dark:bg-blue-900/30 dark:text-blue-400' },
    order_completed:     { icon: <ShoppingCart className="w-3.5 h-3.5" />, bg: 'bg-green-50 text-green-600',     darkBg: 'dark:bg-green-900/30 dark:text-green-400' },
    order_canceled:      { icon: <ShoppingCart className="w-3.5 h-3.5" />, bg: 'bg-red-50 text-red-600',         darkBg: 'dark:bg-red-900/30 dark:text-red-400' },
    product_created:     { icon: <Package className="w-3.5 h-3.5" />,     bg: 'bg-indigo-50 text-indigo-600',   darkBg: 'dark:bg-indigo-900/30 dark:text-indigo-400' },
    product_updated:     { icon: <Package className="w-3.5 h-3.5" />,     bg: 'bg-amber-50 text-amber-600',     darkBg: 'dark:bg-amber-900/30 dark:text-amber-400' },
    category_created:    { icon: <Tag className="w-3.5 h-3.5" />,         bg: 'bg-purple-50 text-purple-600',   darkBg: 'dark:bg-purple-900/30 dark:text-purple-400' },
    module_activated:    { icon: <Zap className="w-3.5 h-3.5" />,         bg: 'bg-yellow-50 text-yellow-600',   darkBg: 'dark:bg-yellow-900/30 dark:text-yellow-400' },
    settings_updated:    { icon: <Settings className="w-3.5 h-3.5" />,    bg: 'bg-gray-50 text-gray-600',       darkBg: 'dark:bg-gray-800/30 dark:text-gray-400' },
    customer_registered: { icon: <Users className="w-3.5 h-3.5" />,       bg: 'bg-teal-50 text-teal-600',       darkBg: 'dark:bg-teal-900/30 dark:text-teal-400' },
    payment_received:    { icon: <CreditCard className="w-3.5 h-3.5" />,  bg: 'bg-emerald-50 text-emerald-600', darkBg: 'dark:bg-emerald-900/30 dark:text-emerald-400' },
    notification:        { icon: <Bell className="w-3.5 h-3.5" />,        bg: 'bg-sky-50 text-sky-600',         darkBg: 'dark:bg-sky-900/30 dark:text-sky-400' },
}

const DEFAULT_CONFIG = {
    icon: <Activity className="w-3.5 h-3.5" />,
    bg: 'bg-sf-2 text-tx-muted',
    darkBg: 'dark:bg-sf-3/30 dark:text-tx-faint',
}

function getEventConfig(type: string) {
    return EVENT_CONFIG[type] ?? DEFAULT_CONFIG
}

function relativeTime(dateStr: string, lang: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
        if (days > 0) return rtf.format(-days, 'day')
        if (hours > 0) return rtf.format(-hours, 'hour')
        if (minutes > 0) return rtf.format(-minutes, 'minute')
        return rtf.format(-seconds, 'second')
    } catch {
        if (days > 0) return `${days}d`
        if (hours > 0) return `${hours}h`
        if (minutes > 0) return `${minutes}m`
        return 'now'
    }
}

export default function ActivityFeed({ events, labels, lang }: ActivityFeedProps) {
    // Re-render every 60s to update relative timestamps
    const [, setTick] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60_000)
        return () => clearInterval(interval)
    }, [])

    if (events.length === 0) {
        return (
            <div className="glass-premium rounded-2xl p-8 text-center relative overflow-hidden">
                <div className="animate-float">
                    <Activity className="w-10 h-10 text-tx-faint mx-auto mb-3" />
                </div>
                <p className="text-sm font-semibold text-tx">{labels.noActivity}</p>
                <p className="text-xs text-tx-muted mt-1.5 max-w-[200px] mx-auto">{labels.noActivityDesc}</p>
            </div>
        )
    }

    return (
        <div className="glass-premium rounded-2xl overflow-hidden relative">
            <div className="p-1">
                {events.map((event, i) => {
                    const config = getEventConfig(event.type)
                    const isLast = i === events.length - 1

                    return (
                        <div
                            key={event.id}
                            className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-sf-1/50 dark:hover:bg-sf-2/20 transition-colors animate-fade-in-up relative"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            {/* Timeline dot + connector */}
                            <div className="relative flex flex-col items-center flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.darkBg} ring-2 ring-sf-0 dark:ring-sf-1 z-10`}>
                                    {config.icon}
                                </div>
                                {/* Connector line */}
                                {!isLast && (
                                    <div className="w-0.5 flex-1 min-h-[16px] bg-gradient-to-b from-sf-3 to-transparent dark:from-brand-800/20 mt-1" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm text-tx leading-snug">
                                    {event.description}
                                </p>
                                <p className="text-[11px] text-tx-faint mt-1 tabular-nums">
                                    {relativeTime(event.timestamp, lang)}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export type { ActivityEvent }
