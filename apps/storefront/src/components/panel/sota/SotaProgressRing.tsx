'use client'

/**
 * SotaProgressRing — Animated SVG radial progress indicator
 *
 * Used in: Store Health, Usage Meters, Setup Progress
 * Features:
 * - Spring-animated fill from 0 → target
 * - Optional center content (percentage, icon)
 * - Configurable colors via CSS custom properties
 * - prefers-reduced-motion safe
 */

import { useEffect, useRef, useState } from 'react'

interface SotaProgressRingProps {
    /** Progress value 0-100 */
    value: number
    /** Ring size in px */
    size?: number
    /** Stroke thickness in px */
    thickness?: number
    /** Stroke color (CSS color string) */
    color?: string
    /** Track color override */
    trackColor?: string
    /** Show percentage label in center */
    showLabel?: boolean
    /** Custom center content */
    children?: React.ReactNode
    /** Additional class */
    className?: string
}

export function SotaProgressRing({
    value,
    size = 64,
    thickness = 6,
    color = '#8BC34A',
    trackColor,
    showLabel = false,
    children,
    className = '',
}: SotaProgressRingProps) {
    const [animatedValue, setAnimatedValue] = useState(0)
    const rafRef = useRef<number>(0)

    const radius = (size - thickness) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (animatedValue / 100) * circumference

    useEffect(() => {
        // Check reduced motion
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setAnimatedValue(Math.min(100, Math.max(0, value)))
            return
        }

        const target = Math.min(100, Math.max(0, value))
        const start = animatedValue
        const startTime = performance.now()
        const duration = 1000

        const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease out expo
            const eased = 1 - Math.pow(1 - progress, 3)
            setAnimatedValue(start + (target - start) * eased)

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate)
            }
        }

        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    // Color gradient based on value
    const resolvedColor = value >= 80 ? (color || '#22c55e') : value >= 40 ? '#f59e0b' : '#ef4444'

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Track */}
                <circle
                    className="progress-ring-track"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    style={trackColor ? { stroke: trackColor } : undefined}
                    strokeWidth={thickness}
                />
                {/* Fill */}
                <circle
                    className="progress-ring-fill"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={thickness}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ stroke: resolvedColor }}
                />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children || (showLabel && (
                    <span className="text-xs font-bold tabular-nums text-tx" style={{ fontSize: size * 0.22 }}>
                        {Math.round(animatedValue)}%
                    </span>
                ))}
            </div>
        </div>
    )
}
