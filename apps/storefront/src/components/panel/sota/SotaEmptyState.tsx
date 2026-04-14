/**
 * SotaEmptyState — Premium empty state for panel sections
 *
 * Features:
 * - Animated floating icon with gentle bob
 * - Contextual messaging based on section
 * - Brand gradient CTA button
 * - Light/dark mode aware
 */

import Link from 'next/link'
import { SotaGlassCard } from './SotaGlassCard'

interface SotaEmptyStateProps {
    /** Icon element (lucide or emoji) */
    icon: React.ReactNode
    /** Title text */
    title: string
    /** Description text */
    description?: string
    /** CTA button label */
    actionLabel?: string
    /** CTA button href */
    actionHref?: string
    /** CTA button onClick */
    onAction?: () => void
    /** Additional class */
    className?: string
}

export function SotaEmptyState({
    icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    className = '',
}: SotaEmptyStateProps) {
    const cta = actionLabel && (actionHref || onAction) ? (
        actionHref ? (
            <Link
                href={actionHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold text-sm shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 hover:scale-105 transition-all duration-300"
            >
                {actionLabel}
                <span className="text-white/60">→</span>
            </Link>
        ) : (
            <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold text-sm shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 hover:scale-105 transition-all duration-300"
            >
                {actionLabel}
                <span className="text-white/60">→</span>
            </button>
        )
    ) : null

    return (
        <SotaGlassCard className={`items-center text-center py-12 md:py-16 ${className}`}>
            {/* Floating icon container */}
            <div className="relative mb-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-muted to-brand-subtle flex items-center justify-center text-brand animate-float">
                    <div className="text-3xl opacity-70">{icon}</div>
                </div>
                {/* Subtle glow behind icon */}
                <div className="absolute inset-0 rounded-3xl bg-brand/5 blur-xl scale-150 -z-10" />
            </div>

            <h3 className="text-lg font-bold font-display text-tx mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-tx-muted max-w-sm mx-auto leading-relaxed mb-6">
                    {description}
                </p>
            )}
            {cta}
        </SotaGlassCard>
    )
}
