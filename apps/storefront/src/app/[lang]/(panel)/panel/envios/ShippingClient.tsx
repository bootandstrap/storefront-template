'use client'

import { useEffect, useState, useTransition } from 'react'
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

    useEffect(() => {
        loadOptions()
    }, [])

    async function loadOptions() {
        setLoading(true)
        const result = await listShippingOptions()
        if (result.error) {
            setError(result.error)
        } else {
            setOptions(result.options as ShippingOption[])
        }
        setLoading(false)
    }

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
            <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-text-muted">{t('panel.shipping.empty')}</p>
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
