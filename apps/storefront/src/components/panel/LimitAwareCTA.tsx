'use client'

/**
 * LimitAwareCTA — Button that checks governance limits before allowing action
 *
 * Instead of letting the owner click "Add Product" and THEN showing a modal
 * that says "limit reached", this button proactively shows the current usage
 * and disables itself when the limit is reached. It also shows a mini progress
 * indicator so the owner always knows how close they are to their limit.
 *
 * Integrates with:
 *   - limits.ts → checkLimit() + getLimitSeverity()
 *   - feature-gate-config.ts → getModuleActivationUrl()
 *
 * Usage:
 *   <LimitAwareCTA
 *       label="Add Product"
 *       icon={<Plus />}
 *       limitResult={checkLimit(planLimits, 'max_products', productCount)}
 *       onClick={() => setShowCreateModal(true)}
 *       upgradeHref={`/${lang}/panel/modulos`}
 *   />
 *
 * Visual states:
 *   OK:       Normal button + subtle "3/50" counter
 *   Warning:  Amber tinted + "45/50 — approaching limit" 
 *   Critical: Red + blocked + "Upgrade" link
 *
 * @module LimitAwareCTA
 * @locked 🟡 YELLOW — governance UX layer
 */

import { useState } from 'react'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import type { LimitCheckResult } from '@/lib/limits'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

interface LimitAwareCTAProps {
    /** Button label */
    label: string
    /** Lucide icon element */
    icon?: React.ReactNode
    /** Result from checkLimit() */
    limitResult: LimitCheckResult
    /** Click handler (only fires if not blocked) */
    onClick?: () => void
    /** Link alternative (if onClick not needed) */
    href?: string
    /** Upgrade link for when limit is exceeded */
    upgradeHref?: string
    /** Upgrade label */
    upgradeLabel?: string
    /** Feature gate flag (for upsell modal) */
    gateFlag?: string
    /** Whether the action is loading */
    isLoading?: boolean
    /** Additional classNames */
    className?: string
    /** Visual variant */
    variant?: 'primary' | 'secondary' | 'ghost'
    /** Size */
    size?: 'sm' | 'md' | 'lg'
    /** Always show the usage counter (default: only on warning+) */
    showCounter?: boolean
    /** Disabled state */
    disabled?: boolean
}

const SEVERITY_STYLES = {
    ok: {
        button: 'bg-brand text-white hover:bg-brand-600 shadow-sm hover:shadow-md',
        counter: 'bg-white/20 text-white/80',
    },
    warning: {
        button: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20',
        counter: 'bg-amber-700/30 text-amber-100',
    },
    critical: {
        button: 'bg-sf-2 text-tx-muted cursor-not-allowed opacity-60',
        counter: 'bg-red-100 text-red-600',
    },
} as const

const SIZE_STYLES = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
    lg: 'text-sm px-5 py-3 rounded-xl gap-2.5',
} as const

export default function LimitAwareCTA({
    label,
    icon,
    limitResult,
    onClick,
    href,
    upgradeHref,
    upgradeLabel = 'Upgrade →',
    gateFlag,
    isLoading = false,
    className = '',
    variant = 'primary',
    size = 'md',
    showCounter = false,
    disabled = false,
}: LimitAwareCTAProps) {
    const [showGate, setShowGate] = useState(false)
    const { current, limit, percentage, allowed } = limitResult
    const isUnlimited = limit === -1
    const severity = !allowed ? 'critical' : percentage >= 80 ? 'warning' : 'ok'
    const isBlocked = !allowed || disabled
    const showUsage = showCounter || severity !== 'ok'

    const handleClick = () => {
        if (isBlocked) {
            if (gateFlag) {
                setShowGate(true)
            }
            return
        }
        onClick?.()
    }

    // Determine base styles by variant
    const variantBase = variant === 'secondary'
        ? 'border border-sf-3 bg-sf-0 text-tx hover:bg-sf-1'
        : variant === 'ghost'
        ? 'bg-transparent text-tx hover:bg-sf-1'
        : '' // primary uses severity styles

    const buttonStyles = variant === 'primary'
        ? SEVERITY_STYLES[severity].button
        : variantBase

    const Element = href && !isBlocked ? 'a' : 'button'

    return (
        <>
            <div className={`inline-flex items-center ${className}`}>
                <Element
                    {...(Element === 'a' ? { href } : { type: 'button' as const })}
                    onClick={handleClick}
                    disabled={Element === 'button' ? (isBlocked || isLoading) : undefined}
                    className={`
                        inline-flex items-center font-semibold transition-all duration-200
                        ${SIZE_STYLES[size]}
                        ${buttonStyles}
                        ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        icon
                    )}
                    <span>{label}</span>

                    {/* Inline usage counter */}
                    {showUsage && !isUnlimited && (
                        <span className={`
                            ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums
                            ${variant === 'primary' ? SEVERITY_STYLES[severity].counter : 'bg-sf-2 text-tx-muted'}
                        `}>
                            {current}/{limit}
                        </span>
                    )}
                </Element>

                {/* Upgrade link for critical */}
                {severity === 'critical' && upgradeHref && (
                    <a
                        href={upgradeHref}
                        className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
                    >
                        <ArrowUpRight className="w-3 h-3" />
                        {upgradeLabel}
                    </a>
                )}
            </div>

            {/* Feature gate modal for blocked state */}
            {gateFlag && (
                <ClientFeatureGate
                    isOpen={showGate}
                    onClose={() => setShowGate(false)}
                    flag={gateFlag}
                />
            )}
        </>
    )
}
