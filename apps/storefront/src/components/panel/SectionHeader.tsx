/**
 * SectionHeader — Consistent section header for panel pages
 *
 * Provides a title, optional icon, description, and action button
 * for visual hierarchy within panel pages.
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
    /** Extra CSS classes */
    className?: string
}

export default function SectionHeader({
    title,
    icon,
    description,
    badge,
    action,
    className = '',
}: SectionHeaderProps) {
    return (
        <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
            <div className="flex items-center gap-3 min-w-0">
                {icon && (
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-subtle to-brand-subtle flex items-center justify-center text-brand">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold font-display text-tx truncate">
                            {title}
                        </h2>
                        {badge !== undefined && badge !== null && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-subtle text-brand text-xs font-bold">
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
    )
}
