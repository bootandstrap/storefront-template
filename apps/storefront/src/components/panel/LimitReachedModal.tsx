'use client'

/**
 * LimitReachedModal — Shows when a tenant hits a plan limit
 *
 * Reusable modal that displays:
 *  - Progress bar (current/limit)
 *  - Contextual message with resource name
 *  - Upgrade CTA → module subscription page
 *
 * Uses the same design language as FeatureGate upsell modals.
 *
 * @module components/panel/LimitReachedModal
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrendingUp, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LimitReachedModalProps {
    /** Whether the modal is open */
    open: boolean
    /** Called when the modal should close */
    onClose: () => void
    /** Resource label (e.g. "Productos") */
    resourceLabel: string
    /** Current count */
    current: number
    /** Plan limit */
    limit: number
    /** Module key for upsell CTA (e.g. "ecommerce") */
    moduleKey?: string
    /** Language for routing */
    lang?: string
}

export default function LimitReachedModal({
    open,
    onClose,
    resourceLabel,
    current,
    limit,
    moduleKey,
    lang = 'es',
}: LimitReachedModalProps) {
    const router = useRouter()
    const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0
    const isExceeded = current >= limit

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    const handleUpgrade = () => {
        onClose()
        if (moduleKey) {
            router.push(`/${lang}/panel/ajustes?tab=suscripcion&module=${moduleKey}`)
        } else {
            router.push(`/${lang}/panel/ajustes?tab=suscripcion`)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center z-[101] p-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                    >
                        <div className="bg-sf-pri rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-brd-pri">
                            {/* Header */}
                            <div className={`px-6 pt-6 pb-4 ${isExceeded ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${isExceeded ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-tx-pri">
                                                {isExceeded ? 'Límite alcanzado' : 'Cerca del límite'}
                                            </h3>
                                            <p className="text-sm text-tx-sec mt-0.5">
                                                {resourceLabel}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg hover:bg-sf-sec transition-colors"
                                    >
                                        <X className="w-4 h-4 text-tx-ter" />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-5">
                                {/* Progress bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-tx-sec">Uso actual</span>
                                        <span className={`font-mono font-semibold ${isExceeded ? 'text-red-500' : 'text-amber-500'}`}>
                                            {current} / {limit}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-sf-ter rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${
                                                isExceeded
                                                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                                                    : percentage >= 80
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                        : 'bg-gradient-to-r from-green-500 to-emerald-400'
                                            }`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </div>
                                    <p className="text-xs text-tx-ter mt-1.5 text-right">
                                        {percentage}% utilizado
                                    </p>
                                </div>

                                {/* Message */}
                                <p className="text-sm text-tx-sec leading-relaxed">
                                    {isExceeded ? (
                                        <>
                                            Has alcanzado el límite de <strong>{limit} {resourceLabel.toLowerCase()}</strong> de tu plan actual.
                                            Para añadir más, actualiza tu suscripción a un tier superior.
                                        </>
                                    ) : (
                                        <>
                                            Estás utilizando <strong>{percentage}%</strong> de tu capacidad de {resourceLabel.toLowerCase()}.
                                            Considera actualizar tu plan antes de alcanzar el límite.
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-brd-pri text-sm font-medium text-tx-sec hover:bg-sf-sec transition-colors"
                                >
                                    Entendido
                                </button>
                                <button
                                    onClick={handleUpgrade}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Mejorar plan
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ── Hook for easy integration ─────────────────────────────────────────

export interface UseLimitGuardOptions {
    tenantId: string
    resource: string
    lang?: string
}

/**
 * Hook that checks resource limits via API and provides modal state.
 *
 * Usage:
 *   const { canCreate, showModal, modalProps, checkBeforeCreate } = useLimitGuard({
 *       tenantId, resource: 'products'
 *   })
 *   
 *   // Before creating: 
 *   if (!checkBeforeCreate()) return // Modal auto-opens
 *   
 *   // In render:
 *   <LimitReachedModal {...modalProps} />
 */
export function useLimitGuard({ tenantId, resource, lang = 'es' }: UseLimitGuardOptions) {
    const [limitData, setLimitData] = useState<{
        current: number; limit: number; allowed: boolean; label: string; percentage: number
    } | null>(null)
    const [showModal, setShowModal] = useState(false)

    // Fetch limit data on mount
    useEffect(() => {
        if (!tenantId) return
        fetch(`/api/panel/limits?resource=${resource}`)
            .then(r => r.json())
            .then(data => {
                if (data && typeof data.allowed === 'boolean') {
                    setLimitData(data)
                }
            })
            .catch(() => {
                // Fail-open
                setLimitData({ current: 0, limit: Infinity, allowed: true, label: resource, percentage: 0 })
            })
    }, [tenantId, resource])

    const checkBeforeCreate = (): boolean => {
        if (!limitData || limitData.allowed) return true
        setShowModal(true)
        return false
    }

    return {
        canCreate: limitData?.allowed ?? true,
        showModal,
        limitData,
        checkBeforeCreate,
        modalProps: {
            open: showModal,
            onClose: () => setShowModal(false),
            resourceLabel: limitData?.label || resource,
            current: limitData?.current ?? 0,
            limit: limitData?.limit ?? Infinity,
            lang,
        },
    }
}
