'use client'

/**
 * CompletionStep — Success celebration with animated checkmark
 *
 * Shows store name, active module count summary,
 * and two CTAs: "Go to Dashboard" or "Take a Tour"
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PartyPopper } from 'lucide-react'

interface CompletionStepProps {
    storeName: string
    activeModuleCount: number
    onGoToDashboard: () => void
    onStartTour: () => void
    isCompleting: boolean
    t: (key: string, fallback?: string) => string
}

export default function CompletionStep({
    storeName,
    activeModuleCount,
    onGoToDashboard,
    onStartTour,
    isCompleting,
    t,
}: CompletionStepProps) {
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(true), 300)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="px-8 py-12 text-center flex flex-col items-center min-h-[420px] justify-center">
            {/* Animated checkmark */}
            <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                className="relative w-24 h-24 mb-8"
            >
                {/* Outer ring */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/20 to-brand/5"
                />
                {/* Inner circle */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
                    className="absolute inset-2 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-lg shadow-brand/30"
                >
                    <motion.svg
                        viewBox="0 0 24 24"
                        className="w-10 h-10 text-white"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.5, duration: 0.4 }}
                    >
                        <motion.path
                            d="M5 13l4 4L19 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                        />
                    </motion.svg>
                </motion.div>
            </motion.div>

            {/* Confetti particles */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                left: `${30 + Math.random() * 40}%`,
                                top: '40%',
                                backgroundColor: [
                                    '#22c55e', '#3b82f6', '#f59e0b', '#ec4899',
                                    '#8b5cf6', '#06b6d4', '#ef4444', '#10b981'
                                ][i % 8],
                            }}
                            initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                            animate={{
                                y: -100 - Math.random() * 200,
                                x: (Math.random() - 0.5) * 300,
                                opacity: 0,
                                scale: 0,
                                rotate: Math.random() * 720,
                            }}
                            transition={{
                                duration: 1.5 + Math.random(),
                                ease: 'easeOut',
                                delay: Math.random() * 0.3,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Success text */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <h2 className="text-2xl font-bold font-display text-tx mb-2 flex items-center gap-2 justify-center">
                    <PartyPopper className="w-6 h-6 text-brand" />
                    {t('onboarding.complete.title', '¡Todo listo!')}
                </h2>
                <p className="text-sm text-tx-muted max-w-md mb-2">
                    {t('onboarding.complete.subtitle', '{{store}} está configurado y listo para empezar.')
                        .replace('{{store}}', storeName)}
                </p>
                <p className="text-xs text-tx-faint mb-8">
                    {t('onboarding.complete.modulesSummary', '{{count}} módulos activos y configurados')
                        .replace('{{count}}', String(activeModuleCount))}
                </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col gap-3 w-full max-w-xs"
            >
                <button
                    type="button"
                    onClick={onGoToDashboard}
                    disabled={isCompleting}
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    {isCompleting
                        ? t('onboarding.completing', 'Finalizando...')
                        : t('onboarding.complete.dashboard', 'Ir al Dashboard')
                    }
                </button>
                <button
                    type="button"
                    onClick={onStartTour}
                    disabled={isCompleting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl border border-sf-3 text-tx-muted hover:text-tx hover:bg-sf-2 transition-all disabled:opacity-50"
                >
                    🎓 {t('onboarding.complete.tour', 'Hacer un tour guiado')}
                </button>
            </motion.div>
        </div>
    )
}
