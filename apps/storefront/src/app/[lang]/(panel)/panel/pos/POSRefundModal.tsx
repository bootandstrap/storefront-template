'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, RotateCcw, Check, Minus, Plus, Loader2, AlertCircle, HeartCrack, RefreshCw, Frown, FileText } from 'lucide-react'
import type { POSRefund, RefundReason } from '@/lib/pos/pos-config'
import type { RefundableItem } from '@/lib/pos/refunds/refund-actions'
import { posLabel } from '@/lib/pos/pos-i18n'

interface POSRefundModalProps {
    orderId: string
    onClose: () => void
    onComplete: (refund: POSRefund) => void
    labels: Record<string, string>
    defaultCurrency: string
}

const REASONS: { key: RefundReason; label_key: string; Icon: typeof HeartCrack }[] = [
    { key: 'damaged', label_key: 'panel.pos.refundDamaged', Icon: HeartCrack },
    { key: 'wrong_item', label_key: 'panel.pos.refundWrongItem', Icon: RefreshCw },
    { key: 'dissatisfied', label_key: 'panel.pos.refundDissatisfied', Icon: Frown },
    { key: 'other', label_key: 'panel.pos.refundOther', Icon: FileText },
]

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(amount / 100)
}

export default function POSRefundModal({
    orderId,
    onClose,
    onComplete,
    labels,
    defaultCurrency,
}: POSRefundModalProps) {
    const [step, setStep] = useState<'items' | 'reason' | 'confirm' | 'processing' | 'done'>('items')
    const [items, setItems] = useState<RefundableItem[]>([])
    const [loading, setLoading] = useState(true)
    const [orderTotal, setOrderTotal] = useState(0)
    const [currency, setCurrency] = useState(defaultCurrency)
    const [error, setError] = useState('')

    // Selected items + quantities
    const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
    const [reason, setReason] = useState<RefundReason>('damaged')
    const [reasonNote, setReasonNote] = useState('')
    const [processing, setProcessing] = useState(false)

    // ── Load refundable items ──
    useEffect(() => {
        ;(async () => {
            try {
                const { getRefundableItemsAction } = await import('@/lib/pos/refunds/refund-actions')
                const result = await getRefundableItemsAction(orderId)
                if (result.error) { setError(result.error); setLoading(false); return }
                setItems(result.items)
                setOrderTotal(result.order_total)
                setCurrency(result.currency_code)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading order')
            }
            setLoading(false)
        })()
    }, [orderId])

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && step !== 'processing') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose, step])

    // ── Toggle item ──
    const toggleItem = useCallback((itemId: string, maxQty: number) => {
        setSelectedItems(prev => {
            const next = new Map(prev)
            if (next.has(itemId)) {
                next.delete(itemId)
            } else {
                next.set(itemId, maxQty)
            }
            return next
        })
    }, [])

    const updateQty = useCallback((itemId: string, delta: number) => {
        setSelectedItems(prev => {
            const next = new Map(prev)
            const current = next.get(itemId) || 0
            const item = items.find(i => i.id === itemId)
            const maxQty = item?.refundable_quantity || 1
            const newQty = Math.max(1, Math.min(maxQty, current + delta))
            next.set(itemId, newQty)
            return next
        })
    }, [items])

    // ── Calculate refund amount ──
    const refundAmount = Array.from(selectedItems.entries()).reduce((sum, [id, qty]) => {
        const item = items.find(i => i.id === id)
        return sum + (item?.unit_price || 0) * qty
    }, 0)

    const isFullRefund = refundAmount >= orderTotal

    // ── Select all ──
    const handleSelectAll = useCallback(() => {
        const next = new Map<string, number>()
        items.forEach(item => next.set(item.id, item.refundable_quantity))
        setSelectedItems(next)
    }, [items])

    // ── Process refund ──
    const handleSubmit = useCallback(async () => {
        setProcessing(true)
        setError('')
        try {
            const { createPOSRefundAction } = await import('@/lib/pos/refunds/refund-actions')
            const result = await createPOSRefundAction({
                order_id: orderId,
                items: Array.from(selectedItems.entries()).map(([id, qty]) => ({
                    item_id: id,
                    quantity: qty,
                })),
                reason,
                reason_note: reasonNote || undefined,
                refund_amount: refundAmount,
            })

            if (result.error || !result.refund) {
                setError(result.error || 'Refund failed')
                setProcessing(false)
                return
            }

            setStep('done')
            setTimeout(() => onComplete(result.refund!), 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error')
        }
        setProcessing(false)
    }, [orderId, selectedItems, reason, reasonNote, refundAmount, onComplete])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={labels['panel.pos.refund'] || 'Refund'}
        >
            <div className="bg-sf-0 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2">
                    <h3 className="text-base font-bold text-tx flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-rose-500" />
                        {labels['panel.pos.refund'] || 'Devolución'}
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close'}
                        className="p-1.5 rounded-lg hover:bg-sf-1 text-tx-sec min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <div className="space-y-3 w-full px-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-14 rounded-xl bg-sf-1 animate-pulse" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-5 mt-4 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Step 1: Select items */}
                {!loading && step === 'items' && (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-medium text-tx-muted uppercase tracking-wider">
                                    {posLabel('panel.pos.selectItems', labels)}
                                </p>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-[11px] text-brand font-medium hover:underline"
                                >
                                    {posLabel('panel.pos.selectAll', labels)}
                                </button>
                            </div>

                            {items.map(item => {
                                const isSelected = selectedItems.has(item.id)
                                const qty = selectedItems.get(item.id) || 0
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                            isSelected ? 'bg-rose-50 border border-rose-200' : 'border border-transparent hover:bg-sf-1'
                                        }`}
                                        onClick={() => toggleItem(item.id, item.refundable_quantity)}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                            isSelected ? 'bg-rose-500 border-rose-500' : 'border-sf-3 bg-sf-0'
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        {/* Thumbnail */}
                                        {item.thumbnail ? (
                                            <img src={item.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-sf-2" />
                                        )}

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-tx truncate">{item.title}</p>
                                            {item.variant_title && (
                                                <p className="text-[11px] text-tx-muted">{item.variant_title}</p>
                                            )}
                                        </div>

                                        {/* Qty controls (when selected) */}
                                        {isSelected && item.refundable_quantity > 1 && (
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => updateQty(item.id, -1)}
                                                    aria-label="Decrease quantity"
                                                    className="w-7 h-7 rounded bg-sf-1 flex items-center justify-center text-tx-sec
                                                               hover:bg-sf-2 focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-mono w-5 text-center">{qty}</span>
                                                <button
                                                    onClick={() => updateQty(item.id, 1)}
                                                    aria-label="Increase quantity"
                                                    className="w-7 h-7 rounded bg-sf-1 flex items-center justify-center text-tx-sec
                                                               hover:bg-sf-2 focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Price */}
                                        <span className="text-sm font-medium text-tx-sec whitespace-nowrap">
                                            {formatPrice(item.unit_price * (qty || item.quantity), currency)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="px-5 py-3 border-t border-sf-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-tx-muted">
                                    {isFullRefund
                                        ? posLabel('panel.pos.fullRefund', labels)
                                        : posLabel('panel.pos.partialRefund', labels)}
                                </span>
                                <span className="text-base font-bold text-rose-600">
                                    -{formatPrice(refundAmount, currency)}
                                </span>
                            </div>
                            <button
                                onClick={() => setStep('reason')}
                                disabled={selectedItems.size === 0}
                                className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium min-h-[44px]
                                           hover:bg-rose-600 transition-colors disabled:opacity-40
                                           focus-visible:ring-2 focus-visible:ring-rose-300/50 focus-visible:outline-none"
                            >
                                {posLabel('panel.pos.continue', labels)}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Select reason */}
                {step === 'reason' && (
                    <>
                        <div className="flex-1 px-5 py-4 space-y-2">
                            <p className="text-[11px] font-medium text-tx-muted uppercase tracking-wider mb-3">
                                {posLabel('panel.pos.refundReason', labels)}
                            </p>
                            {REASONS.map(r => (
                                <button
                                    key={r.key}
                                    onClick={() => setReason(r.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                                        reason === r.key
                                            ? 'bg-rose-50 border border-rose-200'
                                            : 'border border-sf-2 hover:bg-sf-1'
                                    }`}
                                >
                                    <r.Icon className="w-5 h-5 text-tx-muted" />
                                    <span className="text-sm font-medium text-tx">{posLabel(r.label_key, labels)}</span>
                                    {reason === r.key && (
                                        <Check className="w-4 h-4 text-rose-500 ml-auto" />
                                    )}
                                </button>
                            ))}

                            {reason === 'other' && (
                                <textarea
                                    value={reasonNote}
                                    onChange={e => setReasonNote(e.target.value)}
                                    placeholder={posLabel('panel.pos.describeReason', labels)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-sf-1 border border-sf-2 text-sm
                                               text-tx placeholder:text-tx-muted mt-2
                                               focus:outline-none focus:ring-2 focus:ring-soft resize-none"
                                />
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-sf-2 flex gap-2">
                            <button
                                onClick={() => setStep('items')}
                                className="flex-1 py-2.5 rounded-xl bg-sf-1 text-tx-sec text-sm font-medium min-h-[44px]
                                           hover:bg-sf-2 transition-colors
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                {posLabel('panel.pos.back', labels)}
                            </button>
                            <button
                                onClick={() => setStep('confirm')}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium min-h-[44px]
                                           hover:bg-rose-600 transition-colors
                                           focus-visible:ring-2 focus-visible:ring-rose-300/50 focus-visible:outline-none"
                            >
                                {posLabel('panel.pos.confirm', labels)}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && (
                    <>
                        <div className="flex-1 px-5 py-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-8 h-8 text-rose-500" />
                            </div>
                            <h4 className="text-lg font-bold text-tx mb-1">
                                {posLabel('panel.pos.confirmRefundTitle', labels)}
                            </h4>
                            <p className="text-sm text-tx-muted mb-4">
                                {selectedItems.size} artículo{selectedItems.size !== 1 ? 's' : ''} ·{' '}
                                {(() => { const r = REASONS.find(rr => rr.key === reason); return r ? posLabel(r.label_key, labels) : '' })()}
                            </p>
                            <p className="text-2xl font-bold text-rose-600">
                                -{formatPrice(refundAmount, currency)}
                            </p>
                        </div>
                        <div className="px-5 py-3 border-t border-sf-2 flex gap-2">
                            <button
                                onClick={() => setStep('reason')}
                                className="flex-1 py-2.5 rounded-xl bg-sf-1 text-tx-sec text-sm font-medium min-h-[44px]
                                           hover:bg-sf-2 transition-colors
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                {posLabel('panel.pos.back', labels)}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium min-h-[44px]
                                           hover:bg-rose-700 transition-colors disabled:opacity-50
                                           flex items-center justify-center gap-2
                                           focus-visible:ring-2 focus-visible:ring-rose-300/50 focus-visible:outline-none"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                {processing ? posLabel('panel.pos.processing', labels) : posLabel('panel.pos.processRefund', labels)}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 4: Done */}
                {step === 'done' && (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h4 className="text-lg font-bold text-tx">{posLabel('panel.pos.refundComplete', labels)}</h4>
                            <p className="text-sm text-tx-muted mt-1">
                                -{formatPrice(refundAmount, currency)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
