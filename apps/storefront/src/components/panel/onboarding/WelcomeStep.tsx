'use client'

/**
 * WelcomeStep — Animated brand splash for onboarding wizard
 *
 * Shows store name with typewriter effect, animated logo,
 * and a warm welcome message. Auto-advances after animation or on click.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface WelcomeStepProps {
    storeName: string
    onContinue: () => void
    onSkip: () => void
    t: (key: string, fallback?: string) => string
}

export default function WelcomeStep({ storeName, onContinue, onSkip, t }: WelcomeStepProps) {
    const [showName, setShowName] = useState(false)
    const [showSubtitle, setShowSubtitle] = useState(false)
    const [showCTA, setShowCTA] = useState(false)

    useEffect(() => {
        const t1 = setTimeout(() => setShowName(true), 400)
        const t2 = setTimeout(() => setShowSubtitle(true), 1200)
        const t3 = setTimeout(() => setShowCTA(true), 2000)
        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
        }
    }, [])

    return (
        <div className="px-8 py-12 text-center flex flex-col items-center min-h-[420px] justify-center">
            {/* Animated logo/icon */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center mb-8 shadow-lg shadow-brand/20"
            >
                <span className="text-4xl">🚀</span>
            </motion.div>

            {/* Welcome text */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl font-bold font-display text-tx mb-2"
            >
                {t('onboarding.welcome.title', '¡Bienvenido!')}
            </motion.h1>

            {/* Store name with typewriter */}
            {showName && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-4"
                >
                    <span className="text-3xl font-bold font-display bg-gradient-to-r from-brand to-brand-hover bg-clip-text text-transparent">
                        {storeName}
                    </span>
                </motion.div>
            )}

            {/* Subtitle */}
            {showSubtitle && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-sm text-tx-muted max-w-md leading-relaxed mb-8"
                >
                    {t('onboarding.welcome.subtitle', 'Tu plataforma está lista. Vamos a recorrer juntos las funciones de tu panel y configurar lo esencial para empezar.')}
                </motion.p>
            )}

            {/* Powered by badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-sf-2 border border-sf-3 mb-8"
            >
                <span className="text-xs text-tx-faint">
                    {t('onboarding.welcome.poweredBy', 'Potenciado por')}
                </span>
                <span className="text-xs font-bold text-brand">BootandStrap</span>
            </motion.div>

            {/* CTA */}
            {showCTA && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-3 w-full max-w-xs"
                >
                    <button
                        type="button"
                        onClick={onContinue}
                        className="btn btn-primary w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {t('onboarding.welcome.start', 'Empezar configuración')} →
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        className="text-xs text-tx-faint hover:text-tx-muted transition-colors py-2"
                    >
                        {t('onboarding.welcome.skipAll', 'Saltar e ir al panel')}
                    </button>
                </motion.div>
            )}
        </div>
    )
}
