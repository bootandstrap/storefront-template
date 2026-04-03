/**
 * SectionHeader — Premium section header with gradient icon and decorative accent
 *
 * Provides a title, optional icon with gradient background, description,
 * and action button for visual hierarchy within panel pages.
 */

import type { ReactNode } from 'react'

interface SectionHeaderProps {
    /** Section title */
    title: string
    /** Optional icon to the left of the title */
    icon?: ReactNode
    /** Optional description below the title */
    description?: string
    /** Optional badge/count next to the title */
    badge?: string | number
    /** Optional action element on the right side */
    action?: ReactNode
    /** Show decorative accent line below header */
    accent?: boolean
    /** Extra CSS classes */
    className?: string
}

export default function SectionHeader({
    title,
    icon,
    description,
    badge,
    action,
    accent = false,
    className = '',
}: SectionHeaderProps) {
    return (
        <div className={`mb-5 ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-800/30 dark:to-brand-900/20 flex items-center justify-center text-brand dark:text-brand-300 shadow-sm transition-transform duration-300 hover:scale-105">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-semibold font-display text-tx truncate tracking-tight">
                                {title}
                            </h2>
                            {badge !== undefined && badge !== null && (
                                <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-50 dark:bg-brand-800/30 text-brand dark:text-brand-300 text-xs font-bold tabular-nums">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-sm text-tx-muted mt-0.5 truncate">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="flex-shrink-0">
                        {action}
                    </div>
                )}
            </div>
            {accent && (
                <div className="section-divider mt-4" />
            )}
        </div>
    )
}
