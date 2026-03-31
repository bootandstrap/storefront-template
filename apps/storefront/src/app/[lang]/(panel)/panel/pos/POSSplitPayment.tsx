/**
 * POSSplitPayment — Split payment across multiple methods
 *
 * Enterprise-gated modal that lets the cashier split a total
 * across cash + card, cash + Twint, etc.
 * Validates that the sum of splits = total before allowing confirmation.
 */
'use client'

import { useState, useCallback, useMemo } from 'react'
import {
    X, SplitSquareVertical, Plus, Trash2, Check,
    Banknote, CreditCard, Smartphone,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PaymentMethod, SplitPaymentEntry } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

interface POSSplitPaymentProps {
    total: number                          // cart total in minor units
    defaultCurrency: string
    enabledPaymentMethods: PaymentMethod[]
    onConfirm: (splits: SplitPaymentEntry[]) => void
    onCancel: () => void
    labels: Record<string, string>
}

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
    cash: Banknote,
    card_terminal: CreditCard,
    twint: Smartphone,
    manual_card: CreditCard,
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
    cash: '#22c55e',
    card_terminal: '#3b82f6',
    twint: '#8b5cf6',
    manual_card: '#f59e0b',
}

const METHOD_LABEL_KEYS: Record<PaymentMethod, string> = {
    cash: 'panel.pos.cash',
    card_terminal: 'panel.pos.cardTerminal',
    twint: 'panel.pos.twint',
    manual_card: 'panel.pos.manualCard',
}

export default function POSSplitPayment({
    total,
    defaultCurrency,
    enabledPaymentMethods,
    onConfirm,
    onCancel,
    labels,
}: POSSplitPaymentProps) {
    const [splits, setSplits] = useState<SplitPaymentEntry[]>(() => {
        // Start with 2 splits: first method gets total, second starts at 0
        const first = enabledPaymentMethods[0] || 'cash'
        const second = enabledPaymentMethods.find(m => m !== first) || enabledPaymentMethods[1] || first
        return [
            { method: first, amount: total },
            { method: second, amount: 0 },
        ]
    })

    // ── Editable input value (major units string) ──
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editValue, setEditValue] = useState('')

    const formatCurrency = useCallback((amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: defaultCurrency,
        }).format(amount / 100),
    [defaultCurrency])

    const assigned = useMemo(() => splits.reduce((s, e) => s + e.amount, 0), [splits])
    const remaining = total - assigned
    const isValid = remaining === 0 && splits.every(s => s.amount >= 0)
    const isOverage = remaining < 0

    // ── Update split amount ──
    const updateSplitAmount = useCallback((index: number, amount: number) => {
        setSplits(prev => prev.map((s, i) => i === index ? { ...s, amount } : s))
    }, [])

    // ── Update split method ──
    const updateSplitMethod = useCallback((index: number, method: PaymentMethod) => {
        setSplits(prev => prev.map((s, i) => i === index ? { ...s, method } : s))
    }, [])

    // ── Add split ──
    const addSplit = useCallback(() => {
        const usedMethods = new Set(splits.map(s => s.method))
        const next = enabledPaymentMethods.find(m => !usedMethods.has(m)) || enabledPaymentMethods[0] || 'cash'
        setSplits(prev => [...prev, { method: next, amount: 0 }])
    }, [splits, enabledPaymentMethods])

    // ── Remove split ──
    const removeSplit = useCallback((index: number) => {
        setSplits(prev => prev.filter((_, i) => i !== index))
    }, [])

    // ── Auto-fill remaining to last split ──
    const autoFillRemaining = useCallback((targetIndex: number) => {
        if (remaining <= 0) return
        setSplits(prev => prev.map((s, i) => i === targetIndex ? { ...s, amount: s.amount + remaining } : s))
    }, [remaining])

    // ── Split evenly ──
    const splitEvenly = useCallback(() => {
        const each = Math.floor(total / splits.length)
        const remainder = total - (each * splits.length)
        setSplits(prev => prev.map((s, i) => ({
            ...s,
            amount: each + (i === 0 ? remainder : 0),
        })))
    }, [total, splits.length])

    // ── Start editing ──
    const startEdit = (index: number) => {
        setEditingIndex(index)
        setEditValue((splits[index].amount / 100).toFixed(2))
    }

    // ── Commit edit ──
    const commitEdit = () => {
        if (editingIndex === null) return
        const val = parseFloat(editValue)
        if (!isNaN(val) && val >= 0) {
            updateSplitAmount(editingIndex, Math.round(val * 100))
        }
        setEditingIndex(null)
        setEditValue('')
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={labels['panel.pos.splitPayment'] || 'Split payment'}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onCancel}
            />

            {/* Modal */}
            <motion.div
                className="relative bg-sf-0 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-sf-2"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2 bg-glass-heavy">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 flex items-center justify-center">
                            <SplitSquareVertical className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base">
                                {labels['panel.pos.splitPayment'] || 'Pago dividido'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">
                                Total: <span className="font-bold">{formatCurrency(total)}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        aria-label={labels['panel.pos.close'] || 'Close'}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* ── Split entries ── */}
                    <AnimatePresence initial={false}>
                        {splits.map((split, idx) => {
                            const Icon = METHOD_ICONS[split.method]
                            const color = METHOD_COLORS[split.method]
                            const pct = total > 0 ? Math.round((split.amount / total) * 100) : 0
                            return (
                                <motion.div
                                    key={`${idx}-${split.method}`}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-2xl border border-sf-2 bg-glass overflow-hidden"
                                >
                                    <div className="p-3.5 space-y-3">
                                        {/* Method selector + amount */}
                                        <div className="flex items-center gap-2.5">
                                            {/* Method pill */}
                                            <select
                                                value={split.method}
                                                onChange={e => updateSplitMethod(idx, e.target.value as PaymentMethod)}
                                                className="min-h-[40px] px-3 pr-7 rounded-xl bg-sf-1 border border-sf-2
                                                           text-xs font-semibold text-tx appearance-none cursor-pointer
                                                           focus:outline-none focus:ring-2 focus:ring-soft"
                                                style={{ color }}
                                            >
                                                {enabledPaymentMethods.map(m => (
                                                    <option key={m} value={m}>
                                                        {posLabel(METHOD_LABEL_KEYS[m], labels)}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Amount */}
                                            <div className="flex-1">
                                                {editingIndex === idx ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={commitEdit}
                                                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                                                        autoFocus
                                                        className="w-full px-3 py-2 rounded-xl text-right text-base font-bold
                                                                   border border-brand bg-sf-0 focus:outline-none focus:ring-2 focus:ring-soft"
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(idx)}
                                                        className="w-full text-right px-3 py-2 rounded-xl text-base font-bold
                                                                   text-tx tabular-nums hover:bg-sf-1 transition-colors"
                                                    >
                                                        {formatCurrency(split.amount)}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Remove */}
                                            {splits.length > 2 && (
                                                <button
                                                    onClick={() => removeSplit(idx)}
                                                    className="p-2 rounded-xl text-tx-faint hover:text-rose-500 hover:bg-rose-50
                                                               transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                                                    aria-label="Remove split"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-sf-2 overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: color }}
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-tx-muted font-semibold tabular-nums w-8 text-right">
                                                {pct}%
                                            </span>
                                            {/* Quick fill remaining */}
                                            {remaining > 0 && split.amount === 0 && (
                                                <button
                                                    onClick={() => autoFillRemaining(idx)}
                                                    className="text-[9px] px-2 py-0.5 rounded bg-brand-subtle text-brand font-semibold
                                                               hover:bg-brand-soft transition-colors"
                                                >
                                                    +{formatCurrency(remaining)}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {/* ── Add split / Split evenly ── */}
                    <div className="flex items-center gap-2">
                        {splits.length < enabledPaymentMethods.length && (
                            <button
                                onClick={addSplit}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                                           border border-dashed border-sf-3 text-xs font-medium text-tx-muted
                                           hover:border-brand hover:text-brand transition-colors min-h-[44px]"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {labels['panel.pos.addMethod'] || 'Añadir método'}
                            </button>
                        )}
                        <button
                            onClick={splitEvenly}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                                       bg-sf-1 text-xs font-medium text-tx-sec
                                       hover:bg-sf-2 transition-colors min-h-[44px]"
                        >
                            <SplitSquareVertical className="w-3.5 h-3.5" />
                            {labels['panel.pos.splitEvenly'] || 'Dividir igual'}
                        </button>
                    </div>

                    {/* ── Remaining indicator ── */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold
                                    ${isValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : isOverage
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}
                    >
                        <span>
                            {isValid
                                ? (labels['panel.pos.fullyAllocated'] || '✓ Totalmente asignado')
                                : isOverage
                                    ? (labels['panel.pos.overage'] || 'Excede el total')
                                    : (labels['panel.pos.remaining'] || 'Restante')}
                        </span>
                        {!isValid && (
                            <span className="font-bold tabular-nums">
                                {formatCurrency(Math.abs(remaining))}
                            </span>
                        )}
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex gap-2.5">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-2xl border border-sf-2
                                       text-tx-sec text-sm font-medium hover:bg-sf-1 transition-colors min-h-[48px]"
                        >
                            {labels['panel.pos.cancel'] || 'Cancelar'}
                        </button>
                        <button
                            onClick={() => onConfirm(splits.filter(s => s.amount > 0))}
                            disabled={!isValid}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                                       bg-brand text-white text-sm font-bold shadow-lg shadow-brand-soft
                                       hover:shadow-xl hover:-translate-y-0.5
                                       disabled:opacity-40 disabled:shadow-none disabled:translate-y-0
                                       transition-all duration-300 min-h-[48px]
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <Check className="w-4 h-4" />
                            {labels['panel.pos.confirmSplit'] || 'Confirmar pago'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
