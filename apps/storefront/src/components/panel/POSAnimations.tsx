'use client'

/**
 * POSAnimations — POS-specific animation components
 *
 * Components:
 * - AnimatedNumber:     Spring-animated counter for totals / KPIs
 * - AnimatedCheck:      Draw circle + check SVG path on mount
 * - ShakeOnError:       Red shake for payment failures
 * - CircularProgress:   SVG ring for countdown timers (Twint)
 * - ConfettiBurst:      Particle celebration on successful sale
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion'

// ─── Animated Number (spring counter) ───────────────────────────────────────

interface AnimatedNumberProps {
    value: number
    /** Format function, e.g. currency formatter */
    format?: (n: number) => string
    className?: string
    /** Duration in seconds */
    duration?: number
}

export function AnimatedNumber({
    value,
    format = (n) => n.toLocaleString(),
    className = '',
    duration = 0.6,
}: AnimatedNumberProps) {
    const spring = useSpring(0, {
        stiffness: 100,
        damping: 30,
        duration: duration * 1000,
    })
    const display = useTransform(spring, (v) => format(Math.round(v)))
    const [rendered, setRendered] = useState(format(0))

    useEffect(() => {
        spring.set(value)
    }, [value, spring])

    useEffect(() => {
        const unsubscribe = display.on('change', (v) => setRendered(v))
        return unsubscribe
    }, [display])

    return (
        <span className={className} aria-live="polite">
            {rendered}
        </span>
    )
}

// ─── Animated Check (success indicator) ─────────────────────────────────────

interface AnimatedCheckProps {
    size?: number
    className?: string
    strokeWidth?: number
}

export function AnimatedCheck({ size = 64, className = '', strokeWidth = 3 }: AnimatedCheckProps) {
    const r = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * r

    return (
        <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={className}
            initial="hidden"
            animate="visible"
        >
            {/* Circle */}
            <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                variants={{
                    hidden: { strokeDasharray: circumference, strokeDashoffset: circumference },
                    visible: {
                        strokeDashoffset: 0,
                        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                    },
                }}
            />
            {/* Check */}
            <motion.path
                d={`M${size * 0.28} ${size * 0.5} L${size * 0.44} ${size * 0.65} L${size * 0.72} ${size * 0.35}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 0.35, delay: 0.4, ease: [0.22, 1, 0.36, 1] },
                    },
                }}
            />
        </motion.svg>
    )
}

// ─── Shake on error ─────────────────────────────────────────────────────────

interface ShakeOnErrorProps {
    trigger: boolean
    children: ReactNode
    className?: string
}

export function ShakeOnError({ trigger, children, className = '' }: ShakeOnErrorProps) {
    return (
        <motion.div
            className={className}
            animate={trigger ? {
                x: [0, -8, 8, -6, 6, -3, 3, 0],
                transition: { duration: 0.5, ease: 'easeInOut' },
            } : { x: 0 }}
        >
            <>{children}</>
        </motion.div>
    )
}

// ─── Circular Progress (Twint countdown) ────────────────────────────────────

interface CircularProgressProps {
    /** Progress 0-1 */
    progress: number
    size?: number
    strokeWidth?: number
    className?: string
    color?: string
    bgColor?: string
    children?: ReactNode
}

export function CircularProgress({
    progress,
    size = 120,
    strokeWidth = 4,
    className = '',
    color = 'var(--color-primary)',
    bgColor = 'var(--color-surface-2)',
    children,
}: CircularProgressProps) {
    const r = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * r
    const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background ring */}
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
                {/* Progress ring */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </svg>
            {children && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children}
                </div>
            )}
        </div>
    )
}

// ─── Confetti Burst (sale success) — canvas-confetti edition ─────────────────

interface ConfettiBurstProps {
    trigger: boolean
    count?: number
    className?: string
}

export function ConfettiBurst({ trigger, count = 80, className = '' }: ConfettiBurstProps) {
    const hasTriggered = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (trigger && !hasTriggered.current) {
            hasTriggered.current = true

            // Lazy-load canvas-confetti (3kb)
            import('canvas-confetti').then(({ default: confetti }) => {
                const rect = containerRef.current?.getBoundingClientRect()
                const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5
                const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5

                confetti({
                    particleCount: count,
                    spread: 80,
                    origin: { x, y },
                    colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'],
                    gravity: 1.2,
                    drift: 0,
                    ticks: 200,
                    disableForReducedMotion: true,
                })
            })

            const timer = setTimeout(() => {
                hasTriggered.current = false
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [trigger, count])

    return <div ref={containerRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden />
}

