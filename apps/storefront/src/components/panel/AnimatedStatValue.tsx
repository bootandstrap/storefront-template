'use client'

/**
 * AnimatedStatValue — Client wrapper for spring-animated numeric stat display.
 *
 * Used by the Dashboard page to animate stat card numbers on initial render.
 * Wraps the CountUp component from PanelAnimations.
 *
 * For non-numeric values (currency strings, etc.), it falls back to a
 * fade-in animation instead of a count-up.
 */

import { CountUp } from './PanelAnimations'
import { motion, useReducedMotion } from 'framer-motion'

interface AnimatedStatValueProps {
    /** The numeric value to animate (count-up) */
    value: number
    /** Locale for Intl formatting */
    locale?: string
    /** Intl.NumberFormat options for formatting */
    formatOptions?: Intl.NumberFormatOptions
    /** Prefix string (e.g. currency symbol) */
    prefix?: string
    /** Suffix string */
    suffix?: string
    /** Additional class name */
    className?: string
}

/** Count-up for pure numeric values */
export function AnimatedStatValue({
    value,
    locale,
    formatOptions,
    prefix = '',
    suffix = '',
    className = '',
}: AnimatedStatValueProps) {
    return (
        <CountUp
            value={value}
            locale={locale}
            formatOptions={formatOptions}
            prefix={prefix}
            suffix={suffix}
            className={className}
            duration={1.4}
        />
    )
}

interface AnimatedStringValueProps {
    /** Pre-formatted string value (currency, etc.) */
    value: string
    /** Additional class name */
    className?: string
}

/** Fade-in for pre-formatted string values (currency, etc.) */
export function AnimatedStringValue({ value, className = '' }: AnimatedStringValueProps) {
    const prefersReduced = useReducedMotion()

    if (prefersReduced) {
        return <span className={`tabular-nums ${className}`}>{value}</span>
    }

    return (
        <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className={`tabular-nums ${className}`}
        >
            {value}
        </motion.span>
    )
}
