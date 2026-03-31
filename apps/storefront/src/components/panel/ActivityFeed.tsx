'use client'

/**
 * ActivityFeed — Recent store activity mini-feed.
 * Shows last N events from audit_log with relative timestamps.
 * Falls back to recent orders if no audit_log data.
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

const EVENT_ICONS: Record<string, React.ReactNode> = {
    order_created: <ShoppingCart className="w-4 h-4 text-blue-500" />,
    order_completed: <ShoppingCart className="w-4 h-4 text-green-500" />,
    order_canceled: <ShoppingCart className="w-4 h-4 text-red-500" />,
    product_created: <Package className="w-4 h-4 text-indigo-500" />,
    product_updated: <Package className="w-4 h-4 text-amber-500" />,
    category_created: <Tag className="w-4 h-4 text-purple-500" />,
    module_activated: <Zap className="w-4 h-4 text-yellow-500" />,
    settings_updated: <Settings className="w-4 h-4 text-gray-500" />,
    customer_registered: <Users className="w-4 h-4 text-teal-500" />,
    payment_received: <CreditCard className="w-4 h-4 text-green-500" />,
    notification: <Bell className="w-4 h-4 text-blue-400" />,
}

function getEventIcon(type: string) {
    return EVENT_ICONS[type] ?? <Activity className="w-4 h-4 text-tx-muted" />
}

function relativeTime(dateStr: string, lang: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    // Use Intl.RelativeTimeFormat for proper localization
    try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
        if (days > 0) return rtf.format(-days, 'day')
        if (hours > 0) return rtf.format(-hours, 'hour')
        if (minutes > 0) return rtf.format(-minutes, 'minute')
        return rtf.format(-seconds, 'second')
    } catch {
        // Fallback for unsupported locales
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
            <div className="glass rounded-2xl p-6 text-center">
                <Activity className="w-8 h-8 text-tx-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-tx">{labels.noActivity}</p>
                <p className="text-xs text-tx-muted mt-1">{labels.noActivityDesc}</p>
            </div>
        )
    }

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-surface-2">
                {events.map((event, i) => (
                    <div
                        key={event.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-glass transition-colors"
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-sf-1 flex items-center justify-center">
                            {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-tx leading-snug">
                                {event.description}
                            </p>
                            <p className="text-xs text-tx-muted mt-0.5">
                                {relativeTime(event.timestamp, lang)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export type { ActivityEvent }
