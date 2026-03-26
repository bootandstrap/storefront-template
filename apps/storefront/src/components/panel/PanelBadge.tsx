'use client'

/**
 * PanelBadge — Semantic status badge using UUI design tokens.
 *
 * Variants: success, warning, error, info, neutral
 * Sizes: sm, md
 * Optional leading dot indicator
 *
 * Uses CSS vars from untitled-ui/theme.css for consistent color system.
 */

import { type ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'
type BadgeSize = 'sm' | 'md'

interface PanelBadgeProps {
    children: ReactNode
    variant?: BadgeVariant
    size?: BadgeSize
    /** Show a leading dot indicator */
    dot?: boolean
    /** Additional className */
    className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
    success:
        'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950 dark:text-success-300 dark:ring-success-800',
    warning:
        'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:ring-warning-800',
    error:
        'bg-error-50 text-error-700 ring-error-200 dark:bg-error-950 dark:text-error-300 dark:ring-error-800',
    info:
        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800',
    neutral:
        'bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600',
}

const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500',
}

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
}

export default function PanelBadge({
    children,
    variant = 'neutral',
    size = 'md',
    dot = false,
    className = '',
}: PanelBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-full ring-1 ring-inset
                whitespace-nowrap select-none
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `}
        >
            {dot && (
                <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    )
}
