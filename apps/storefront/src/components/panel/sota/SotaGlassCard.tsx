'use client'

/**
 * SotaGlassCard — Clean premium card (SOTA 2026 Revamp)
 *
 * Clean white card with subtle border and shadow.
 * No glassmorphism, no noise texture — just premium clean design.
 */

interface SotaGlassCardProps {
    children: React.ReactNode
    className?: string
    animated?: boolean
    borderGlow?: boolean
    glowColor?: 'brand' | 'accent' | 'danger' | 'warning' | 'blue' | 'purple' | 'gold' | 'emerald' | 'none'
    overflowHidden?: boolean
}

export function SotaGlassCard({
    children,
    className = '',
    animated = false,
    overflowHidden = false,
}: SotaGlassCardProps) {
    const animatedClass = animated ? 'reveal-on-scroll-scale' : ''
    const overflowClass = overflowHidden ? 'overflow-hidden' : ''

    return (
        <div className={`sota-glass-card ${animatedClass} ${overflowClass} ${className}`}>
            {children}
        </div>
    )
}

