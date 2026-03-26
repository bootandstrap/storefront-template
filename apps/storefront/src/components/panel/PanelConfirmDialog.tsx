'use client'

/**
 * PanelConfirmDialog — Beautiful confirmation modal
 *
 * Replaces all raw `confirm()` calls across admin panels.
 * Glass backdrop + framer-motion entrance + danger/warning/info variants.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, type ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type DialogVariant = 'danger' | 'warning' | 'info'

interface PanelConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string | ReactNode
    confirmLabel?: string
    cancelLabel?: string
    variant?: DialogVariant
    loading?: boolean
}

// ─── Variant styling ────────────────────────────────────────────────────────

const variantConfig: Record<DialogVariant, {
    icon: ReactNode
    iconBg: string
    confirmBtn: string
}> = {
    danger: {
        icon: <Trash2 className="w-6 h-6" />,
        iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
        confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/30',
    },
    warning: {
        icon: <AlertTriangle className="w-6 h-6" />,
        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/30',
    },
    info: {
        icon: <Info className="w-6 h-6" />,
        iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        confirmBtn: 'bg-primary hover:bg-primary-light text-white focus:ring-primary/30',
    },
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PanelConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    loading = false,
}: PanelConfirmDialogProps) {
    const config = variantConfig[variant]

    const handleEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !loading) onClose()
    }, [onClose, loading])

    useEffect(() => {
        if (open) document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [open, handleEsc])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={loading ? undefined : onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="glass rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:bg-surface-1 hover:text-text-primary transition-colors disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center mb-4`}>
                                {config.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-bold font-display text-text-primary mb-1">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-sm text-text-muted leading-relaxed mb-6">
                                    {description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-3 text-sm font-medium text-text-secondary hover:bg-surface-1 transition-colors disabled:opacity-50"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${config.confirmBtn}`}
                                >
                                    {loading ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ...
                                        </span>
                                    ) : (
                                        confirmLabel
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── Hook for easy usage ────────────────────────────────────────────────────

import { useState } from 'react'

interface UseConfirmDialogOptions {
    title: string
    description?: string
    confirmLabel?: string
    variant?: DialogVariant
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
    const [isOpen, setIsOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

    const confirm = (action: () => void) => {
        setPendingAction(() => action)
        setIsOpen(true)
    }

    const handleConfirm = () => {
        pendingAction?.()
        setIsOpen(false)
        setPendingAction(null)
    }

    const handleClose = () => {
        setIsOpen(false)
        setPendingAction(null)
    }

    const dialogProps = {
        open: isOpen,
        onClose: handleClose,
        onConfirm: handleConfirm,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        variant: options.variant ?? 'danger' as DialogVariant,
    }

    return { confirm, dialogProps }
}
