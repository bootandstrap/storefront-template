'use client'

/**
 * PanelTimeline — Vertical timeline for audit logs and activity feeds
 *
 * Displays a vertical timeline of events with icons, timestamps, and descriptions.
 * Used for: order history, customer activity, return flow, deployment logs.
 *
 * Usage:
 *   <PanelTimeline
 *     items={[
 *       { title: 'Order placed', description: 'Customer #1234', time: '2 hours ago', icon: <ShoppingBag />, status: 'success' },
 *       { title: 'Payment received', time: '1 hour ago', icon: <CreditCard />, status: 'success' },
 *       { title: 'Awaiting fulfillment', time: 'Now', icon: <Package />, status: 'pending' },
 *     ]}
 *   />
 */

import type { ReactNode } from 'react'

type TimelineStatus = 'success' | 'warning' | 'error' | 'pending' | 'neutral'

export interface TimelineItem {
    /** Event title */
    title: string
    /** Optional description */
    description?: string
    /** Timestamp string */
    time: string
    /** Icon (lucide-react element) */
    icon?: ReactNode
    /** Status determines the icon circle color */
    status?: TimelineStatus
    /** Optional extra content rendered below */
    extra?: ReactNode
}

interface PanelTimelineProps {
    items: TimelineItem[]
    /** Additional className */
    className?: string
}

const statusStyles: Record<TimelineStatus, string> = {
    success: 'bg-success-100 text-success-600 border-success-200 dark:bg-success-950 dark:text-success-400 dark:border-success-800',
    warning: 'bg-warning-100 text-warning-600 border-warning-200 dark:bg-warning-950 dark:text-warning-400 dark:border-warning-800',
    error: 'bg-error-100 text-error-600 border-error-200 dark:bg-error-950 dark:text-error-400 dark:border-error-800',
    pending: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    neutral: 'bg-sf-1 text-tx-muted border-sf-3',
}

const lineColors: Record<TimelineStatus, string> = {
    success: 'bg-success-200 dark:bg-success-800',
    warning: 'bg-warning-200 dark:bg-warning-800',
    error: 'bg-error-200 dark:bg-error-800',
    pending: 'bg-blue-200 dark:bg-blue-800',
    neutral: 'bg-sf-3',
}

export default function PanelTimeline({ items, className = '' }: PanelTimelineProps) {
    if (items.length === 0) return null

    return (
        <div className={`relative ${className}`}>
            {items.map((item, i) => {
                const status = item.status || 'neutral'
                const isLast = i === items.length - 1

                return (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Vertical line */}
                        {!isLast && (
                            <div
                                className={`absolute left-[17px] top-[36px] bottom-0 w-[2px] ${lineColors[status]}`}
                            />
                        )}

                        {/* Icon circle */}
                        <div
                            className={`relative z-10 shrink-0 w-[36px] h-[36px] rounded-full border-2 flex items-center justify-center ${statusStyles[status]}`}
                        >
                            {item.icon ? (
                                <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-current" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-tx truncate">
                                    {item.title}
                                </h4>
                                <time className="text-[11px] text-tx-faint whitespace-nowrap shrink-0">
                                    {item.time}
                                </time>
                            </div>
                            {item.description && (
                                <p className="text-sm text-tx-muted mt-0.5">
                                    {item.description}
                                </p>
                            )}
                            {item.extra && (
                                <div className="mt-2">{item.extra}</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
