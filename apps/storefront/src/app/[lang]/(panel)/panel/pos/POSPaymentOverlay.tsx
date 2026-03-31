'use client'

/**
 * POSPaymentOverlay — Payment processing overlay (SOTA)
 *
 * - Integrated POSAnimations: AnimatedCheck, ShakeOnError, CircularProgress, ConfettiBurst
 * - posLabel() for all strings
 * - Status-specific gradients and pulsating icons
 * - Twint QR code with countdown
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { X, CreditCard, Smartphone, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PaymentProcessingState } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'
import { AnimatedCheck, ShakeOnError, CircularProgress, ConfettiBurst } from '@/components/panel/POSAnimations'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface POSPaymentOverlayProps {
    state: PaymentProcessingState
    onCancel: () => void
    onRetry?: () => void
    labels: Record<string, string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POSPaymentOverlay({ state, onCancel, onRetry, labels }: POSPaymentOverlayProps) {
    const confettiRef = useRef<HTMLDivElement>(null)

    // ── Escape key to cancel ──
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && canCancel(state)) onCancel()
    }, [state, onCancel])

    useEffect(() => {
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [handleEscape])

    if (state.status === 'idle') return null

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                role="dialog"
                aria-modal="true"
                aria-label={getTitle(state, labels)}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                {/* Modal */}
                <motion.div
                    className="relative bg-sf-0 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-sf-2">
                        <h3 className="text-lg font-bold text-tx">
                            {getTitle(state, labels)}
                        </h3>
                        {canCancel(state) && (
                            <button
                                onClick={onCancel}
                                className="p-2 rounded-lg hover:bg-sf-1 text-tx-muted transition-colors
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                aria-label={posLabel('panel.pos.cancel', labels)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Body — AnimatePresence for smooth icon/message transitions */}
                    <div className="px-6 py-10 flex flex-col items-center gap-6" ref={confettiRef}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={state.status}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <StatusIcon state={state} />
                                <StatusMessage state={state} labels={labels} />
                            </motion.div>
                        </AnimatePresence>

                        {/* QR Code for Twint */}
                        {state.status === 'awaiting_twint_scan' && (
                            <TwintQRDisplay
                                qrUrl={state.qr_url}
                                expiresAt={state.expires_at}
                                labels={labels}
                            />
                        )}

                        {/* Confetti on success */}
                        {state.status === 'succeeded' && (
                            <ConfettiBurst trigger={true} />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-sf-2 flex gap-3">
                        {canCancel(state) && (
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 rounded-xl text-tx-sec font-medium min-h-[44px]
                                           bg-sf-1 hover:bg-sf-2 transition-colors
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                {posLabel('panel.pos.cancel', labels)}
                            </button>
                        )}

                        {(state.status === 'failed') && onRetry && (
                            <button
                                onClick={onRetry}
                                className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold min-h-[44px]
                                           hover:bg-brand transition-colors flex items-center justify-center gap-2
                                           focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {posLabel('panel.pos.retry', labels)}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

// ---------------------------------------------------------------------------
// Sub-components with POSAnimations integration
// ---------------------------------------------------------------------------

function StatusIcon({ state }: { state: PaymentProcessingState }) {
    switch (state.status) {
        case 'creating_intent':
        case 'processing':
            return (
                <motion.div
                    className="w-20 h-20 rounded-full bg-brand-subtle flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                </motion.div>
            )
        case 'awaiting_card':
            return (
                <motion.div
                    className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <CreditCard className="w-10 h-10 text-blue-500" />
                </motion.div>
            )
        case 'awaiting_twint_scan':
            return (
                <CircularProgress
                    progress={0.75}
                    size={80}
                    strokeWidth={4}
                    color="#8b5cf6"
                >
                    <QrCode className="w-8 h-8 text-violet-500" />
                </CircularProgress>
            )
        case 'succeeded':
            return (
                <div className="w-20 h-20">
                    <AnimatedCheck size={80} />
                </div>
            )
        case 'failed':
        case 'cancelled':
            return (
                <ShakeOnError trigger={true}>
                    <motion.div
                        className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    >
                        <X className="w-10 h-10 text-rose-500" />
                    </motion.div>
                </ShakeOnError>
            )
        default:
            return null
    }
}

function StatusMessage({
    state,
    labels,
}: {
    state: PaymentProcessingState
    labels: Record<string, string>
}) {
    const getMessage = () => {
        switch (state.status) {
            case 'creating_intent':
                return posLabel('panel.pos.creatingPayment', labels)
            case 'awaiting_card':
                return posLabel('panel.pos.presentCard', labels)
            case 'awaiting_twint_scan':
                return posLabel('panel.pos.scanTwint', labels)
            case 'processing':
                return posLabel('panel.pos.processing', labels)
            case 'succeeded':
                return posLabel('panel.pos.paymentSuccess', labels)
            case 'failed':
                return state.error || posLabel('panel.pos.paymentFailed', labels)
            case 'cancelled':
                return posLabel('panel.pos.paymentCancelled', labels)
            default:
                return ''
        }
    }

    return (
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-center text-sm font-medium ${
                state.status === 'succeeded' ? 'text-emerald-600'
                    : state.status === 'failed' || state.status === 'cancelled' ? 'text-rose-600'
                        : 'text-tx-sec'
            }`}
        >
            {getMessage()}
        </motion.p>
    )
}

/**
 * Twint QR code display with countdown timer.
 */
function TwintQRDisplay({
    qrUrl,
    expiresAt,
    labels,
}: {
    qrUrl: string
    expiresAt: string
    labels: Record<string, string>
}) {
    const [timeLeft, setTimeLeft] = useState('')
    const [progress, setProgress] = useState(100)

    useEffect(() => {
        const totalMs = new Date(expiresAt).getTime() - Date.now()

        const updateTimer = () => {
            const now = Date.now()
            const expiry = new Date(expiresAt).getTime()
            const diff = Math.max(0, expiry - now)

            if (diff <= 0) {
                setTimeLeft(posLabel('panel.pos.qrExpired', labels) || 'QR expirado')
                setProgress(0)
                return
            }

            const minutes = Math.floor(diff / 60000)
            const seconds = Math.floor((diff % 60000) / 1000)
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
            setProgress(Math.round((diff / totalMs) * 100))
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [expiresAt, labels])

    const qrImageUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(qrUrl)}&choe=UTF-8`

    return (
        <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
        >
            <div className="p-4 bg-white rounded-xl shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={qrImageUrl}
                    alt="Twint QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg"
                />
            </div>
            <div className="flex items-center gap-2 text-xs text-tx-muted">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{posLabel('panel.pos.twintScanHint', labels) || 'Abra la app Twint y escanee'}</span>
            </div>
            <div className="flex items-center gap-2">
                <CircularProgress progress={progress / 100} size={24} strokeWidth={3} color="#8b5cf6" />
                <span className="text-xs font-mono text-tx-muted">
                    {timeLeft}
                </span>
            </div>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTitle(state: PaymentProcessingState, labels: Record<string, string>): string {
    switch (state.status) {
        case 'creating_intent':
        case 'processing':
            return posLabel('panel.pos.processing', labels)
        case 'awaiting_card':
            return labels['panel.pos.terminalPayment'] || 'Pago con Terminal'
        case 'awaiting_twint_scan':
            return labels['panel.pos.twintPayment'] || 'Pago con Twint'
        case 'succeeded':
            return posLabel('panel.pos.paymentSuccess', labels)
        case 'failed':
            return labels['panel.pos.paymentError'] || 'Error de pago'
        case 'cancelled':
            return posLabel('panel.pos.paymentCancelled', labels)
        default:
            return ''
    }
}

function canCancel(state: PaymentProcessingState): boolean {
    return ['awaiting_card', 'awaiting_twint_scan', 'creating_intent'].includes(state.status)
}
