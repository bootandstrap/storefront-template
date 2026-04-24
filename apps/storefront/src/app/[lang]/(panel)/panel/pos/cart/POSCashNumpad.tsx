'use client'

/**
 * POSCashNumpad — Touch-first cash payment numpad (Step 3 of checkout)
 *
 * Extracted from POSCart.tsx. Features:
 * - Large LCD-style display with auto-formatted currency
 * - Quick denomination buttons (5, 10, 20, 50, 100, exact)
 * - 3x4 digit grid with backspace (double-tap to clear)
 * - Live change/short calculation
 * - Transitions to POSChangeConfirm on confirm
 *
 * @module pos/cart/POSCashNumpad
 */

import { useState } from 'react'
import { ArrowLeft, Delete, X, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Quick cash amounts (major units) ──
const QUICK_AMOUNTS = [5, 10, 20, 50, 100] as const

// ── Numpad digits ──
const NUMPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'] as const

interface POSCashNumpadProps {
    total: number
    processing: boolean
    onConfirm: (tenderedAmount: number) => void
    onBack: () => void
    labels: Record<string, string>
    defaultCurrency: string
}

export default function POSCashNumpad({
    total,
    processing,
    onConfirm,
    onBack,
    labels,
    defaultCurrency,
}: POSCashNumpadProps) {
    const [numpadValue, setNumpadValue] = useState('')

    const formatCurrency = (amount: number) => formatPOSCurrency(amount, defaultCurrency)

    // ── Numpad logic ──
    const handleDigit = (digit: string) => {
        if (digit === '.' && numpadValue.includes('.')) return
        if (numpadValue.includes('.') && numpadValue.split('.')[1].length >= 2) return
        setNumpadValue(prev => prev + digit)
    }
    const handleDelete = () => setNumpadValue(prev => prev.slice(0, -1))
    const handleClear = () => setNumpadValue('')
    const handleQuick = (amount: number) => setNumpadValue(amount.toFixed(2))

    const numpadNumeric = parseFloat(numpadValue) || 0
    const tenderedCents = Math.round(numpadNumeric * 100)
    const changeAmount = tenderedCents - total

    const handleConfirmClick = () => {
        if (changeAmount < 0 || processing) return
        onConfirm(tenderedCents)
    }

    return (
        <motion.div
            key="numpad"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1 min-h-0"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-sf-2 pos-footer-glass flex-shrink-0">
                <button
                    onClick={onBack}
                    className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-sf-1 text-tx-sec
                               flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-tx flex-1">
                    {posLabel('panel.pos.cashTendered', labels)}
                </span>
                <span className="text-xs text-tx-muted">
                    {posLabel('panel.pos.totalDue', labels) || 'Total'}: <span className="font-bold text-tx">{formatCurrency(total)}</span>
                </span>
            </div>

            {/* Display */}
            <div className="px-5 pt-4 pb-2 pos-glass-surface">
                <p className="text-3xl font-black text-tx tabular-nums text-right">
                    {numpadValue
                        ? formatCurrency(Math.round(parseFloat(numpadValue) * 100))
                        : <span className="text-tx-faint">0.00</span>
                    }
                </p>
                {numpadNumeric > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-right text-xs font-semibold mt-1"
                        style={{ color: changeAmount >= 0 ? 'var(--color-pos-accent)' : '#f43f5e' }}
                    >
                        {changeAmount >= 0
                            ? `${posLabel('panel.pos.change', labels)}: ${formatCurrency(changeAmount)}`
                            : `${posLabel('panel.pos.shortAmount', labels)}: ${formatCurrency(Math.abs(changeAmount))}`
                        }
                    </motion.div>
                )}
            </div>

            {/* Quick amounts */}
            <div className="flex gap-1.5 px-3 pt-3 pb-1">
                {QUICK_AMOUNTS.map(amount => (
                    <button
                        key={amount}
                        onClick={() => handleQuick(amount)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                                   active:scale-[0.95] ${
                            numpadValue === amount.toFixed(2)
                                ? 'bg-brand text-white shadow-sm'
                                : 'bg-brand-subtle text-brand hover:bg-brand-muted'
                        }`}
                    >
                        {amount}
                    </button>
                ))}
                {/* Exact button */}
                <button
                    onClick={() => handleQuick(total / 100)}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all active:scale-[0.95]"
                    style={numpadValue === (total / 100).toFixed(2)
                        ? { background: 'var(--color-pos-accent)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }
                        : { background: 'var(--color-pos-surface)', color: 'var(--color-pos-accent-dark)' }
                    }
                >
                    {posLabel('panel.pos.exact', labels) || 'Exacto'}
                </button>
            </div>

            {/* Digit grid */}
            <div className="grid grid-cols-3 gap-1.5 px-3 py-2 flex-1 min-h-0">
                {NUMPAD_DIGITS.map(d => (
                    <button
                        key={d}
                        onClick={() => handleDigit(d)}
                        className="rounded-xl bg-sf-1 text-lg font-bold text-tx
                                   hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                                   transition-all duration-100 min-h-[48px]"
                    >
                        {d}
                    </button>
                ))}
                {/* Backspace */}
                <button
                    onClick={handleDelete}
                    onDoubleClick={handleClear}
                    className="rounded-xl bg-sf-1 flex items-center justify-center
                               text-tx-sec hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                               transition-all duration-100 min-h-[48px]"
                    title={posLabel('panel.pos.deleteHint', labels) || 'Tap: borrar · Doble-tap: limpiar'}
                >
                    <Delete className="w-5 h-5" />
                </button>
            </div>

            {/* Bottom buttons */}
            <div className="border-t border-sf-2 px-3 py-3 pos-footer-glass flex-shrink-0 flex gap-2">
                <button
                    onClick={onBack}
                    className="flex-1 h-[52px] rounded-2xl bg-sf-1 text-sm font-semibold text-tx-sec
                               hover:bg-sf-2 transition-colors flex items-center justify-center gap-2"
                >
                    <X className="w-4 h-4" />
                    {posLabel('panel.pos.cancel', labels)}
                </button>
                <button
                    onClick={handleConfirmClick}
                    disabled={changeAmount < 0 || processing}
                    className="pos-pay-btn pos-pay-btn-active flex-[2] h-[56px] rounded-2xl text-white text-sm font-bold
                               active:scale-[0.97]
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-150 flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    {posLabel('panel.pos.confirmCharge', labels)} {total > 0 ? formatCurrency(total) : ''}
                </button>
            </div>
        </motion.div>
    )
}
