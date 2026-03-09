'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import { useToast } from '@/components/ui/Toaster'
import { listShippingOptions, updateShippingPrice, updateShippingName } from './actions'

interface ShippingOption {
    id: string
    name: string
    price_type: 'flat' | 'calculated'
    amount: number | null
    prices: { id: string; amount: number; currency_code: string }[]
    type: { label: string; description: string; code: string } | null
    service_zone?: { id: string; name: string } | null
}

export default function ShippingClient() {
    const { t } = useI18n()
    const toast = useToast()
    const [options, setOptions] = useState<ShippingOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editAmount, setEditAmount] = useState('')
    const [isPending, startTransition] = useTransition()

    const loadOptions = useCallback(async () => {
        setLoading(true)
        try {
            const result = await listShippingOptions()
            if (result.error) {
                setError(result.error)
            } else {
                setOptions(result.options as ShippingOption[])
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadOptions()
    }, [loadOptions])

    function startEdit(option: ShippingOption) {
        setEditingId(option.id)
        setEditName(option.name)
        const price = option.prices?.[0]
        setEditAmount(price ? String(price.amount / 100) : '0')
    }

    function cancelEdit() {
        setEditingId(null)
        setEditName('')
        setEditAmount('')
    }

    function saveEdit(option: ShippingOption) {
        const currency = option.prices?.[0]?.currency_code ?? 'eur'
        const amountCents = Math.round(parseFloat(editAmount) * 100)

        startTransition(async () => {
            // Update name if changed
            if (editName !== option.name) {
                const nameResult = await updateShippingName(option.id, editName)
                if (!nameResult.success) {
                    toast.error(nameResult.error ?? 'Error')
                    return
                }
            }

            // Update price if changed
            const currentPrice = option.prices?.[0]?.amount ?? 0
            if (amountCents !== currentPrice) {
                const priceResult = await updateShippingPrice(option.id, amountCents, currency)
                if (!priceResult.success) {
                    toast.error(priceResult.error ?? 'Error')
                    return
                }
            }

            toast.success(t('common.saved'))
            cancelEdit()
            loadOptions()
        })
    }

    function formatPrice(amount: number, currency: string) {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(amount / 100)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                        <div className="h-5 bg-surface-2 rounded w-1/3 mb-3" />
                        <div className="h-4 bg-surface-2 rounded w-1/2" />
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="glass rounded-2xl p-6 text-center">
                <p className="text-red-500 mb-3">{error}</p>
                <button onClick={loadOptions} className="btn btn-primary text-sm">
                    {t('common.retry')}
                </button>
            </div>
        )
    }

    if (options.length === 0) {
        return (
            <div className="glass rounded-2xl">
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
                    </div>
                    <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                        {t('panel.shipping.empty')}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {t('panel.shipping.emptyHint') || 'Configure shipping options in your Medusa backend to manage delivery rates here.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {options.map((option) => {
                const isEditing = editingId === option.id
                const price = option.prices?.[0]
                const typeIcon = option.type?.code === 'express' ? '⚡' : '📦'

                return (
                    <div
                        key={option.id}
                        className="glass rounded-2xl p-6 transition-all hover:shadow-lg"
                    >
                        {isEditing ? (
                            /* ── Edit mode ── */
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        {t('panel.shipping.name')}
                                    </label>
                                    <input
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        {t('panel.shipping.price')} ({price?.currency_code?.toUpperCase() ?? 'EUR'})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                    />
                                    <p className="text-xs text-text-muted mt-1">
                                        {t('panel.shipping.priceHint')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => saveEdit(option)}
                                        disabled={isPending}
                                        className="btn btn-primary text-sm"
                                    >
                                        {isPending ? t('common.saving') : t('common.saveChanges')}
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        disabled={isPending}
                                        className="btn btn-secondary text-sm"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Display mode ── */
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{typeIcon}</span>
                                        <h3 className="font-semibold text-text-primary">{option.name}</h3>
                                    </div>
                                    {option.type?.description && (
                                        <p className="text-sm text-text-muted mt-1 ml-8">
                                            {option.type.description}
                                        </p>
                                    )}
                                    {option.service_zone?.name && (
                                        <p className="text-xs text-text-muted mt-1 ml-8">
                                            📍 {option.service_zone.name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-primary">
                                        {price ? formatPrice(price.amount, price.currency_code) : '—'}
                                    </span>
                                    <button
                                        onClick={() => startEdit(option)}
                                        className="btn btn-secondary text-sm"
                                    >
                                        {t('common.edit')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
