import Link from 'next/link'
import { cloneElement, ReactElement, ReactNode } from 'react'

interface EmptyStateProps {
    /** Icon to display — should be a Lucide React element */
    icon: ReactNode
    /** Main headline */
    title: string
    /** Supporting description */
    description: string
    /** Primary CTA button text */
    actionLabel?: string
    /** Primary CTA link destination */
    actionHref?: string
    /** Optional secondary link */
    secondaryLabel?: string
    secondaryHref?: string
}

/**
 * EmptyState — Premium placeholder for modules with no data
 *
 * Replaces bland "No data" messages with a friendly, guided experience
 * that helps store owners understand what to do next.
 */
export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    actionHref,
    secondaryLabel,
    secondaryHref,
}: EmptyStateProps) {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-surface-0 border border-surface-2 p-8 md:p-12 lg:p-16 flex flex-col items-center justify-center text-center group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
            {/* Subtle organic background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] max-w-3xl h-full bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-surface-1 text-text-muted mb-8 shadow-inner shadow-surface-3/20 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:text-primary">
                    {/* Cloning the icon to force a consistent, elegant size if it's a lucide icon */}
                    {icon && typeof icon === 'object' && 'props' in icon
                        ? cloneElement(icon as ReactElement<{ className?: string }>, { className: 'w-10 h-10 md:w-12 md:h-12 stroke-[1.5]' })
                        : icon
                    }
                </div>

                <h3 className="text-2xl md:text-3xl font-display text-text-primary mb-4 tracking-tight">
                    {title}
                </h3>

                <p className="text-base text-text-secondary leading-relaxed mb-10 font-light">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {actionLabel && actionHref && (
                        <Link
                            href={actionHref}
                            className="group/btn relative overflow-hidden rounded-full bg-text-primary text-surface-0 px-8 py-3.5 text-sm font-medium transition-all duration-300 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {actionLabel}
                            </span>
                        </Link>
                    )}

                    {secondaryLabel && secondaryHref && (
                        <Link
                            href={secondaryHref}
                            className="px-6 py-3.5 text-sm font-medium text-text-muted hover:text-text-primary transition-colors duration-300 underline-offset-4 hover:underline"
                        >
                            {secondaryLabel}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
