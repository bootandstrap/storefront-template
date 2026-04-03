'use client'

/**
 * PanelAnimations — Shared animation primitives for admin panels (SOTA)
 *
 * Components:
 * - PageEntrance:        Page-level fade-in + slide-up
 * - ListStagger:         Staggered entrance for children (grids, lists)
 * - StaggerItem:         Individual item within ListStagger
 * - ExpandableSection:   AnimatePresence expand/collapse
 * - SlideOver:           Right-side panel with backdrop blur, focus trap, aria-modal
 * - CountUp:             Spring-animated numeric display for stat cards
 * - SkeletonPulse:       Shimmer-gradient skeleton loader
 */

import { AnimatePresence, motion, useSpring, useTransform, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

// ─── Shared easing ──────────────────────────────────────────────────────────

const EASE_EXPO_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Page-level entrance ────────────────────────────────────────────────────

interface PageEntranceProps {
    children: ReactNode
    className?: string
    delay?: number
}

export function PageEntrance({ children, className = '', delay = 0 }: PageEntranceProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_EXPO_OUT, delay }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// ─── Staggered children entrance ────────────────────────────────────────────

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
}

const staggerItem: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: EASE_EXPO_OUT },
    },
}

interface ListStaggerProps {
    children: ReactNode
    className?: string
}

export function ListStagger({ children, className = '' }: ListStaggerProps) {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.div>
    )
}

/** Wrap each child in this for staggered entrance inside ListStagger */
export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div variants={staggerItem} className={className}>
            {children}
        </motion.div>
    )
}

// ─── Expandable section (collapse/expand) ───────────────────────────────────

interface ExpandableSectionProps {
    isOpen: boolean
    children: ReactNode
    className?: string
}

export function ExpandableSection({ isOpen, children, className = '' }: ExpandableSectionProps) {
    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_EXPO_OUT }}
                    className={`overflow-hidden ${className}`}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── Slide-over panel (SOTA: focus trap, aria-modal, role=dialog) ───────────

interface SlideOverProps {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: ReactNode
    width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
}

export function SlideOver({ isOpen, onClose, title, subtitle, children, width = 'md' }: SlideOverProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    const handleEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    // Focus trap: keep Tab cycling within the panel
    const handleTabTrap = useCallback((e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !panelRef.current) return
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
            document.addEventListener('keydown', handleTabTrap)
            document.body.style.overflow = 'hidden'
            // Autofocus close button for accessibility
            requestAnimationFrame(() => closeButtonRef.current?.focus())
        }
        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.removeEventListener('keydown', handleTabTrap)
            document.body.style.overflow = ''
        }
    }, [isOpen, handleEsc, handleTabTrap])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.3, ease: EASE_EXPO_OUT }}
                        className={`fixed inset-y-0 right-0 z-50 w-full ${widthMap[width]} bg-sf-0 shadow-2xl flex flex-col`}
                    >
                        {/* Header — 56px aligned with panel topbar for visual harmony */}
                        <div className="flex items-center justify-between px-6 h-14 border-b border-sf-2 flex-shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold font-display text-tx truncate">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-xs text-tx-muted mt-0.5 truncate">{subtitle}</p>
                                )}
                            </div>
                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                aria-label="Close panel"
                                className="ml-3 p-2 rounded-xl hover:bg-sf-1 text-tx-muted
                                           hover:text-tx transition-colors flex-shrink-0
                                           focus-visible:ring-2 focus-visible:ring-med"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── CountUp — Spring-animated number for stat cards ────────────────────────

interface CountUpProps {
    /** Target number to animate to */
    value: number
    /** Optional Intl.NumberFormat options for formatting (currency, etc.) */
    formatOptions?: Intl.NumberFormatOptions
    /** Locale for number formatting */
    locale?: string
    /** Additional className */
    className?: string
    /** Duration in seconds (controls spring stiffness) */
    duration?: number
    /** Prefix string (e.g. currency symbol) */
    prefix?: string
    /** Suffix string (e.g. '%') */
    suffix?: string
}

export function CountUp({
    value,
    formatOptions,
    locale,
    className = '',
    duration = 1.2,
    prefix = '',
    suffix = '',
}: CountUpProps) {
    const spring = useSpring(0, {
        stiffness: Math.max(30, 180 / duration),
        damping: 30,
        mass: 1,
    })

    const [displayValue, setDisplayValue] = useState('0')
    const prefersReducedMotion = useRef(false)

    useEffect(() => {
        prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }, [])

    useEffect(() => {
        if (prefersReducedMotion.current) {
            // Skip animation for reduced motion
            const formatted = formatOptions
                ? new Intl.NumberFormat(locale, formatOptions).format(value)
                : value.toLocaleString(locale)
            setDisplayValue(formatted)
            return
        }
        spring.set(value)
    }, [value, spring, formatOptions, locale])

    const display = useTransform(spring, (latest) => {
        if (formatOptions) {
            return new Intl.NumberFormat(locale, formatOptions).format(Math.round(latest))
        }
        return Math.round(latest).toLocaleString(locale)
    })

    useEffect(() => {
        const unsubscribe = display.on('change', (v) => setDisplayValue(v))
        return unsubscribe
    }, [display])

    return (
        <span className={`tabular-nums ${className}`} aria-label={`${prefix}${value}${suffix}`}>
            {prefix}{displayValue}{suffix}
        </span>
    )
}

// ─── SkeletonPulse — Shimmer gradient skeleton loader ───────────────────────

interface SkeletonPulseProps {
    /** Width class (e.g. 'w-32', 'w-full') */
    width?: string
    /** Height class (e.g. 'h-4', 'h-8') */
    height?: string
    /** Border radius class */
    rounded?: string
    /** Additional className */
    className?: string
}

export function SkeletonPulse({
    width = 'w-full',
    height = 'h-4',
    rounded = 'rounded-lg',
    className = '',
}: SkeletonPulseProps) {
    return (
        <div
            className={`${width} ${height} ${rounded} ${className} bg-glass relative overflow-hidden`}
            aria-hidden="true"
        >
            <div
                className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                }}
            />
        </div>
    )
}

/**
 * SkeletonCard — Full card skeleton with image placeholder + text lines.
 * Use in product grids, stat cards, and list views during loading.
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-sf-0 rounded-xl border border-sf-2 overflow-hidden ${className}`} aria-hidden="true">
            <SkeletonPulse width="w-full" height="h-0" className="!pb-[75%]" rounded="rounded-none" />
            <div className="p-3 space-y-2">
                <SkeletonPulse width="w-3/4" height="h-3" />
                <SkeletonPulse width="w-1/2" height="h-4" />
            </div>
        </div>
    )
}

// ─── ScrollReveal — IntersectionObserver-based entrance animation ────────────

interface ScrollRevealProps {
    children: ReactNode
    className?: string
    /** Animation direction */
    direction?: 'up' | 'scale'
    /** Delay in ms */
    delay?: number
    /** Threshold for intersection (0-1) */
    threshold?: number
}

export function ScrollReveal({
    children,
    className = '',
    direction = 'up',
    delay = 0,
    threshold = 0.1,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        // Check if user prefers reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setIsVisible(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.unobserve(el)
                }
            },
            { threshold }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [threshold])

    const animClass = direction === 'scale' ? 'reveal-on-scroll-scale' : 'reveal-on-scroll'

    return (
        <div
            ref={ref}
            className={`${isVisible ? animClass : 'opacity-0'} ${className}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

// ─── HoverScale — Tactile hover wrapper with spring easing ──────────────────

interface HoverScaleProps {
    children: ReactNode
    className?: string
    /** Scale on hover (default 1.02) */
    scale?: number
}

export function HoverScale({ children, className = '', scale = 1.02 }: HoverScaleProps) {
    return (
        <motion.div
            className={className}
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            {children}
        </motion.div>
    )
}

// ─── GlowPulse — Animated glow ring for status indicators ───────────────────

interface GlowPulseProps {
    /** Color of the glow ring (CSS color) */
    color?: string
    /** Size in px */
    size?: number
    /** Additional class */
    className?: string
    children?: ReactNode
}

export function GlowPulse({
    color = '#22c55e',
    size = 10,
    className = '',
    children,
}: GlowPulseProps) {
    return (
        <span className={`relative inline-flex ${className}`}>
            {children}
            <motion.span
                className="absolute rounded-full"
                style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                    bottom: 0,
                    right: 0,
                }}
                animate={{
                    boxShadow: [
                        `0 0 0 0 ${color}66`,
                        `0 0 0 4px ${color}00`,
                    ],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </span>
    )
}

// ─── FloatAnimation — Gentle floating effect for icons & illustrations ──────

interface FloatAnimationProps {
    children: ReactNode
    className?: string
    /** Duration in seconds */
    duration?: number
    /** Float distance in px */
    distance?: number
}

export function FloatAnimation({
    children,
    className = '',
    duration = 3,
    distance = 8,
}: FloatAnimationProps) {
    return (
        <motion.div
            className={className}
            animate={{ y: [-distance / 2, distance / 2, -distance / 2] }}
            transition={{
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            {children}
        </motion.div>
    )
}

// ─── FadeInStagger — Alternative stagger with configurable delay ────────────

interface FadeInStaggerProps {
    children: ReactNode
    className?: string
    /** Stagger delay between children in seconds */
    staggerDelay?: number
}

export function FadeInStagger({
    children,
    className = '',
    staggerDelay = 0.08,
}: FadeInStaggerProps) {
    return (
        <motion.div
            className={className}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: staggerDelay, delayChildren: 0.05 },
                },
            }}
        >
            {children}
        </motion.div>
    )
}

export function FadeInStaggerItem({
    children,
    className = '',
}: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4, ease: EASE_EXPO_OUT },
                },
            }}
        >
            {children}
        </motion.div>
    )
}
