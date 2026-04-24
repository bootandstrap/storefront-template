'use client'

/**
 * CelebrationToast — SOTA achievement unlock notification
 *
 * Glassmorphism card with Framer Motion enter/exit, tier-aware gradient
 * accent, module-themed confetti, haptic pulse on emoji, gradient
 * progress bar, module icon, and "Go to module" CTA.
 *
 * Stacks bottom-up with smooth reflow. Auto-dismiss after 6s.
 *
 * @module components/panel/CelebrationToast
 * @version 2.0 — SOTA Design System (2026-04-15)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Sparkles, Trophy, Star, Zap, Crown } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CelebrationItem {
    id: string
    emoji: string
    title: string
    description: string
    /** Module key for navigation (e.g. 'chatbot') */
    moduleKey?: string
    /** Tier for gradient accent (basic/pro/enterprise) */
    tier?: 'basic' | 'pro' | 'enterprise'
    /** Panel page href to navigate to (e.g. '/panel/chatbot') */
    panelHref?: string
}

interface CelebrationToastProps {
    items: CelebrationItem[]
    onDismiss: (id: string) => void
    /** i18n label for "Achievement Unlocked!" */
    unlockLabel?: string
    /** i18n label for "Go to module" CTA */
    ctaLabel?: string
    /** Language for routing */
    lang?: string
}

// ── Tier-Aware Design Tokens ───────────────────────────────────────────────

const TIER_GRADIENTS: Record<string, { border: string; accent: string; confetti: string[] }> = {
    basic: {
        border: 'from-blue-500/40 via-cyan-400/30 to-blue-500/40',
        accent: 'from-blue-500 to-cyan-500',
        confetti: ['#3b82f6', '#06b6d4', '#22d3ee', '#0ea5e9', '#38bdf8', '#67e8f9'],
    },
    pro: {
        border: 'from-violet-500/40 via-purple-400/30 to-violet-500/40',
        accent: 'from-violet-500 to-purple-500',
        confetti: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9', '#ddd6fe'],
    },
    enterprise: {
        border: 'from-amber-500/40 via-yellow-400/30 to-amber-500/40',
        accent: 'from-amber-500 to-yellow-500',
        confetti: ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#fef3c7'],
    },
}

const TIER_ICONS: Record<string, typeof Star> = {
    basic: Zap,
    pro: Star,
    enterprise: Crown,
}

function getTierDesign(tier?: string) {
    return TIER_GRADIENTS[tier || 'basic'] || TIER_GRADIENTS.basic
}

// ── Confetti Burst (elevated) ──────────────────────────────────────────────

function ConfettiBurst({ colors }: { colors: string[] }) {
    const particles = useMemo(() =>
        Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * 360
            const distance = 35 + Math.random() * 60
            const x = Math.cos((angle * Math.PI) / 180) * distance
            const y = Math.sin((angle * Math.PI) / 180) * distance * -1
            const rotation = Math.random() * 720 - 360
            const size = 4 + Math.random() * 4
            const isCircle = Math.random() > 0.5

            return { x, y, rotation, color: colors[i % colors.length], delay: i * 25, size, isCircle }
        }),
    [colors])

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        left: '12%',
                        top: '50%',
                        width: p.size,
                        height: p.size,
                        borderRadius: p.isCircle ? '50%' : '2px',
                        backgroundColor: p.color,
                    }}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                    animate={{
                        opacity: 0,
                        x: p.x,
                        y: p.y,
                        scale: 0.2,
                        rotate: p.rotation,
                    }}
                    transition={{
                        duration: 0.9,
                        delay: p.delay / 1000,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    )
}

// ── Single Toast ───────────────────────────────────────────────────────────

function SingleToast({
    item,
    onDismiss,
    index,
    unlockLabel,
    ctaLabel,
    lang = 'es',
}: {
    item: CelebrationItem
    onDismiss: () => void
    index: number
    unlockLabel?: string
    ctaLabel?: string
    lang?: string
}) {
    const [exiting, setExiting] = useState(false)
    const design = getTierDesign(item.tier)
    const TierIcon = TIER_ICONS[item.tier || 'basic'] || Zap

    // Auto-dismiss after 6s
    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true)
        }, 6000 + index * 1000)

        return () => clearTimeout(timer)
    }, [index])

    const handleClose = useCallback(() => {
        setExiting(true)
    }, [])

    const handleCTA = useCallback(() => {
        if (item.panelHref) {
            window.location.href = `/${lang}${item.panelHref}`
        }
    }, [item.panelHref, lang])

    if (exiting) {
        // Wait for exit animation then dismiss
        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 1, x: 0, scale: 1 }}
                animate={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 1, 1] }}
                onAnimationComplete={onDismiss}
                className="w-full max-w-sm"
            />
        )
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.85, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                delay: index * 0.15,
            }}
            className="relative w-full max-w-sm"
        >
            {/* Glass card with tier gradient border */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/10">
                {/* Gradient border overlay */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${design.border} opacity-60 -z-10`} />

                {/* Glass background */}
                <div className="relative bg-sf-0/85 backdrop-blur-xl rounded-2xl">
                    {/* Confetti burst */}
                    <ConfettiBurst colors={design.confetti} />

                    <div className="flex items-start gap-3 p-4 relative z-10">
                        {/* Emoji with haptic pulse */}
                        <motion.div
                            className="text-3xl flex-shrink-0 relative"
                            animate={{
                                scale: [1, 1.15, 0.95, 1.05, 1],
                                rotate: [0, -8, 8, -4, 0],
                            }}
                            transition={{
                                duration: 0.8,
                                delay: 0.3 + index * 0.15,
                                ease: 'easeInOut',
                            }}
                        >
                            {item.emoji}
                            {/* Glow ring behind emoji */}
                            <motion.div
                                className={`absolute inset-0 rounded-full bg-gradient-to-br ${design.accent} blur-xl -z-10`}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.5, 1.8] }}
                                transition={{ duration: 1.2, delay: 0.5 }}
                            />
                        </motion.div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Category label with tier icon */}
                            <div className="flex items-center gap-1.5 mb-1">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                <span className={`text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r ${design.accent} bg-clip-text text-transparent`}>
                                    {unlockLabel || '¡Desbloqueado!'}
                                </span>
                                {item.tier && (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sf-2/80 text-[10px] font-semibold text-tx-sec">
                                        <TierIcon className="w-2.5 h-2.5" />
                                        {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-bold text-tx-pri truncate">{item.title}</h4>

                            {/* Description */}
                            <p className="text-xs text-tx-sec mt-0.5 line-clamp-2 leading-relaxed">
                                {item.description}
                            </p>

                            {/* CTA button */}
                            {item.panelHref && (
                                <motion.button
                                    onClick={handleCTA}
                                    className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${design.accent} hover:shadow-lg transition-shadow`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {ctaLabel || 'Ir al módulo'}
                                    <ArrowRight className="w-3 h-3" />
                                </motion.button>
                            )}
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-shrink-0 p-1 rounded-lg text-tx-faint hover:text-tx-sec hover:bg-sf-2/50 transition-all relative z-10"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Gradient progress bar */}
                    <div className="h-[3px] bg-sf-2/30 rounded-b-2xl overflow-hidden">
                        <motion.div
                            className={`h-full bg-gradient-to-r ${design.accent} rounded-full`}
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{
                                duration: 6 + index * 1,
                                ease: 'linear',
                            }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ── Toast Stack ────────────────────────────────────────────────────────────

export default function CelebrationToast({
    items,
    onDismiss,
    unlockLabel,
    ctaLabel,
    lang = 'es',
}: CelebrationToastProps) {
    if (items.length === 0) return null

    return (
        <AnimatePresence mode="popLayout">
            <motion.div
                layout
                className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-3 items-end"
            >
                {items.map((item, index) => (
                    <SingleToast
                        key={item.id}
                        item={item}
                        index={index}
                        onDismiss={() => onDismiss(item.id)}
                        unlockLabel={unlockLabel}
                        ctaLabel={ctaLabel}
                        lang={lang}
                    />
                ))}
            </motion.div>
        </AnimatePresence>
    )
}
