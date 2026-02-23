'use client'

import { useState } from 'react'
import { RotateCcw, Check, AlertTriangle } from 'lucide-react'

interface OrderItem {
    id: string
    title: string
    quantity: number
    variant_title?: string
    thumbnail?: string
}

interface ReturnRequestFormProps {
    orderId: string
    items: OrderItem[]
    lang: string
    dict: {
        title: string
        reason: string
        reasons: Record<string, string>
        description: string
        descriptionPlaceholder: string
        selectItems: string
        submit: string
        submitting: string
        success: string
        error: string
        duplicate: string
    }
}

type ReturnReason = 'defective' | 'wrong_item' | 'changed_mind' | 'other'

export default function ReturnRequestForm({ orderId, items, lang, dict }: ReturnRequestFormProps) {
    const [reason, setReason] = useState<ReturnReason | ''>('')
    const [description, setDescription] = useState('')
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const toggleItem = (itemId: string) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!reason || selectedItems.length === 0) return

        setSubmitting(true)
        setError(null)

        try {
            const returnItems = items
                .filter(item => selectedItems.includes(item.id))
                .map(item => ({
                    item_id: item.id,
                    title: item.title,
                    quantity: item.quantity,
                }))

            const res = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    reason,
                    description: description || undefined,
                    items: returnItems,
                }),
            })

            if (res.status === 409) {
                setError(dict.duplicate)
                return
            }

            if (!res.ok) {
                setError(dict.error)
                return
            }

            setSubmitted(true)
        } catch {
            setError(dict.error)
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="glass rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-text-primary">{dict.success}</p>
            </div>
        )
    }

    return (
        <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                {dict.title}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reason select */}
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                        {dict.reason}
                    </label>
                    <select
                        value={reason}
                        onChange={e => setReason(e.target.value as ReturnReason)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                        <option value="">—</option>
                        {(['defective', 'wrong_item', 'changed_mind', 'other'] as const).map(r => (
                            <option key={r} value={r}>{dict.reasons[r]}</option>
                        ))}
                    </select>
                </div>

                {/* Item checkboxes */}
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                        {dict.selectItems}
                    </label>
                    <div className="space-y-2">
                        {items.map(item => (
                            <label
                                key={item.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedItems.includes(item.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-surface-3 hover:border-primary/30'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={() => toggleItem(item.id)}
                                    className="rounded border-surface-3 text-primary focus:ring-primary/30"
                                />
                                <span className="text-sm text-text-primary flex-1 truncate">
                                    {item.title}
                                    {item.variant_title && item.variant_title !== 'Default' && (
                                        <span className="text-text-muted"> · {item.variant_title}</span>
                                    )}
                                </span>
                                <span className="text-xs text-text-muted">×{item.quantity}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">
                        {dict.description}
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={dict.descriptionPlaceholder}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !reason || selectedItems.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                >
                    {submitting ? dict.submitting : dict.submit}
                </button>
            </form>
        </div>
    )
}
