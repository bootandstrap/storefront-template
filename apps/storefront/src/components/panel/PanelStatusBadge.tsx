/**
 * PanelStatusBadge — Unified status badge component
 *
 * Replaces all inline badge styling (bg-green-100 text-green-700, etc.)
 * across admin panels for consistent status indicators.
 */

import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending'
type BadgeSize = 'sm' | 'md'

interface PanelStatusBadgeProps {
    variant: BadgeVariant
    label: string
    icon?: ReactNode
    dot?: boolean
    size?: BadgeSize
    className?: string
}

// ─── Variant styles ─────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    error:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    info:    'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    neutral: 'bg-surface-2 text-text-muted',
    pending: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
}

const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    neutral: 'bg-text-muted',
    pending: 'bg-amber-500',
}

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PanelStatusBadge({
    variant,
    label,
    icon,
    dot = false,
    size = 'md',
    className = '',
}: PanelStatusBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center gap-1.5 rounded-full font-medium
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
            )}
            {icon}
            {label}
        </span>
    )
}

// ─── Status mapping helpers ─────────────────────────────────────────────────

/** Map common order/fulfillment statuses to badge variants */
export function orderStatusVariant(status: string): BadgeVariant {
    switch (status) {
        case 'completed':
        case 'fulfilled':
        case 'shipped':
            return 'success'
        case 'pending':
        case 'not_fulfilled':
            return 'pending'
        case 'canceled':
        case 'refunded':
            return 'error'
        case 'requires_action':
            return 'info'
        default:
            return 'neutral'
    }
}

/** Map publish status to variant */
export function publishStatusVariant(published: boolean): BadgeVariant {
    return published ? 'success' : 'neutral'
}

/** Map active/inactive to variant */
export function activeStatusVariant(active: boolean): BadgeVariant {
    return active ? 'success' : 'neutral'
}
