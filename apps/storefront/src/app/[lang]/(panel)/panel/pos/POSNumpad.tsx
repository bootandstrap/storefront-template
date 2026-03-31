'use client'

/**
 * POSNumpad — Touch-optimized numeric keypad for POS (SOTA)
 *
 * - Calculator aesthetic with live formatted display
 * - Quick-amount preset buttons (5, 10, 20, 50, 100)
 * - posLabel() for all strings
 * - Large digit buttons (min 56px) for reliable touch
 * - Backspace tap / double-tap clear
 */

import { useEffect } from 'react'
import { Delete, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { posLabel } from '@/lib/pos/pos-i18n'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface POSNumpadProps {
    value: string
    onChange: (value: string) => void
    onConfirm: (value: number) => void
    onClose: () => void
    title?: string
    currency?: string
    labels?: Record<string, string>
    /** Total due — shown as reference above the display */
    totalDue?: number
}

// ---------------------------------------------------------------------------
// Quick amounts (in major units)
// ---------------------------------------------------------------------------

const QUICK_AMOUNTS = [5, 10, 20, 50, 100]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POSNumpad({
    value,
    onChange,
    onConfirm,
    onClose,
    title,
    currency = 'EUR',
    labels,
    totalDue,
}: POSNumpadProps) {
    const handleDigit = (digit: string) => {
        // Prevent multiple decimal points
        if (digit === '.' && value.includes('.')) return
        // Limit to 2 decimal places
        if (value.includes('.') && value.split('.')[1].length >= 2) return
        onChange(value + digit)
    }

    const handleDelete = () => {
        onChange(value.slice(0, -1))
    }

    const handleClear = () => {
        onChange('')
    }

    const handleConfirm = () => {
        const num = parseFloat(value)
        if (!isNaN(num) && num > 0) {
            onConfirm(num)
        }
    }

    const handleQuickAmount = (amount: number) => {
        onChange(amount.toFixed(2))
    }

    const formatDisplay = (v: string) => {
        if (!v) return '0.00'
        const num = parseFloat(v)
        if (isNaN(num)) return '0.00'
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(num)
    }

    const numericValue = parseFloat(value) || 0
    const changeAmount = totalDue ? numericValue - totalDue : 0

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                role="dialog"
                aria-modal="true"
                aria-label={title || 'Cash numpad'}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />

                {/* Numpad panel */}
                <motion.div
                    className="relative w-full max-w-sm sm:mx-4 rounded-t-2xl sm:rounded-2xl bg-sf-0
                               border border-sf-2 shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* ── Header: Calculator display ── */}
                    <div className="px-5 pt-5 pb-3 bg-glass">
                        <p className="text-xs text-tx-muted font-medium uppercase tracking-wider">
                            {title || posLabel('panel.pos.cashTendered', labels)}
                        </p>
                        <p className="text-3xl font-black text-tx tabular-nums mt-1">
                            {formatDisplay(value)}
                        </p>

                        {/* Change / Short indicator */}
                        {totalDue != null && numericValue > 0 && (
                            <div className={`text-xs font-semibold mt-1.5 ${
                                changeAmount >= 0 ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                                {changeAmount >= 0
                                    ? `${posLabel('panel.pos.change', labels)}: ${formatDisplay(changeAmount.toFixed(2))}`
                                    : `${posLabel('panel.pos.shortAmount', labels)}: ${formatDisplay(Math.abs(changeAmount).toFixed(2))}`
                                }
                            </div>
                        )}
                    </div>

                    {/* ── Quick amount buttons ── */}
                    <div className="flex gap-1.5 px-3 pt-3 pb-1">
                        {QUICK_AMOUNTS.map(amount => (
                            <button
                                key={amount}
                                onClick={() => handleQuickAmount(amount)}
                                className="flex-1 py-2 rounded-lg bg-brand-subtle text-brand text-xs font-bold
                                           hover:bg-brand-muted active:scale-[0.95] transition-all duration-100"
                            >
                                {amount}
                            </button>
                        ))}
                    </div>

                    {/* ── Digit grid ── */}
                    <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
                        {digits.map(d => (
                            <button
                                key={d}
                                onClick={() => handleDigit(d)}
                                className="h-14 rounded-xl bg-sf-1 text-lg font-bold text-tx
                                           hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                                           transition-all duration-100"
                            >
                                {d}
                            </button>
                        ))}
                        {/* Backspace */}
                        <button
                            onClick={handleDelete}
                            onDoubleClick={handleClear}
                            aria-label={posLabel('panel.pos.deleteHint', labels) || 'Delete digit'}
                            className="h-14 rounded-xl bg-sf-1 flex items-center justify-center
                                       text-tx-sec hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                                       transition-all duration-100
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            title={posLabel('panel.pos.deleteHint', labels) || 'Tap: borrar · Doble-tap: limpiar'}
                        >
                            <Delete className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="flex gap-2 px-3 pb-4">
                        <button
                            onClick={onClose}
                            aria-label={posLabel('panel.pos.cancel', labels)}
                            className="flex-1 py-3.5 rounded-xl bg-sf-1 text-sm font-semibold text-tx-sec min-h-[48px]
                                       hover:bg-sf-2 transition-colors flex items-center justify-center gap-2
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <X className="w-4 h-4" />
                            {posLabel('panel.pos.cancel', labels)}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!value || parseFloat(value) <= 0}
                            className="flex-[2] py-3.5 rounded-xl bg-emerald-500 text-sm font-bold text-white min-h-[48px]
                                       hover:bg-emerald-600 active:scale-[0.97]
                                       disabled:opacity-30 disabled:cursor-not-allowed
                                       transition-all duration-150 flex items-center justify-center gap-2
                                       focus-visible:ring-2 focus-visible:ring-emerald-300/50 focus-visible:outline-none"
                        >
                            <Check className="w-4.5 h-4.5" />
                            {posLabel('panel.pos.confirmCharge', labels)}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
