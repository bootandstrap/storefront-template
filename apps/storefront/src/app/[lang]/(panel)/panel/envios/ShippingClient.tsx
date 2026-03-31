'use client'

/**
 * ShippingClient — Owner Panel Shipping Options (SOTA rewrite)
 *
 * SOTA upgrades:
 * - Emoji icons (⚡📦📍) → lucide icons (Zap, Package, MapPin)
 * - Raw SVG empty state → lucide Truck + animated empty state
 * - No animation → PageEntrance + ListStagger
 * - Basic inline edit → AnimatePresence edit/display toggle
 * - No feedback → Loader2 spinner on save
 */

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import { useToast } from '@/components/ui/Toaster'
import { listShippingOptions, updateShippingPrice, updateShippingName } from './actions'
import { Truck, Zap, Package, MapPin, Pencil, Loader2, Save, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

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
            if (editName !== option.name) {
                const nameResult = await updateShippingName(option.id, editName)
                if (!nameResult.success) {
                    toast.error(nameResult.error ?? 'Error')
                    return
                }
            }
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

    const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
    const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

    if (loading) {
        return (
            <PageEntrance className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                        <div className="h-5 bg-sf-2 rounded w-1/3 mb-3" />
                        <div className="h-4 bg-sf-2 rounded w-1/2" />
                    </div>
                ))}
            </PageEntrance>
        )
    }

    if (error) {
        return (
            <PageEntrance>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl p-6 text-center"
                >
                    <p className="text-red-500 mb-3">{error}</p>
                    <button onClick={loadOptions} className="btn btn-primary text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                        {t('common.retry')}
                    </button>
                </motion.div>
            </PageEntrance>
        )
    }

    return (
        <PageEntrance className="space-y-5">
            <PanelPageHeader
                title={t('panel.shipping.title') || 'Envíos'}
                subtitle={t('panel.shipping.subtitle') || 'Gestiona las opciones de envío'}
                icon={<Truck className="w-5 h-5" />}
                badge={options.length}
            />

            {options.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Truck className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {t('panel.shipping.empty')}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed">
                            {t('panel.shipping.emptyHint') || 'Configure shipping options in your Medusa backend to manage delivery rates here.'}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {options.map((option) => {
                        const isEditing = editingId === option.id
                        const price = option.prices?.[0]
                        const isExpress = option.type?.code === 'express'

                        return (
                            <StaggerItem key={option.id}>
                                <motion.div
                                    whileHover={isEditing ? {} : { y: -1 }}
                                    className="glass rounded-2xl p-6 transition-shadow hover:shadow-lg"
                                >
                                    <AnimatePresence mode="wait">
                                        {isEditing ? (
                                            /* ── Edit mode ── */
                                            <motion.div
                                                key="edit"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="space-y-4"
                                            >
                                                <div>
                                                    <label className={labelClass}>
                                                        {t('panel.shipping.name')}
                                                    </label>
                                                    <input
                                                        className={inputClass}
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>
                                                        {t('panel.shipping.price')} ({price?.currency_code?.toUpperCase() ?? 'EUR'})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className={inputClass}
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                    />
                                                    <p className="text-xs text-tx-muted mt-1">
                                                        {t('panel.shipping.priceHint')}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => saveEdit(option)}
                                                        disabled={isPending}
                                                        aria-label={t('common.saveChanges')}
                                                        className="btn btn-primary text-sm min-h-[44px] inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                                    >
                                                        {isPending
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <Save className="w-4 h-4" />
                                                        }
                                                        {isPending ? t('common.saving') : t('common.saveChanges')}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        disabled={isPending}
                                                        aria-label={t('common.cancel')}
                                                        className="btn btn-ghost text-sm min-h-[44px] inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        {t('common.cancel')}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            /* ── Display mode ── */
                                            <motion.div
                                                key="display"
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        isExpress
                                                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                            : 'bg-brand-subtle text-brand'
                                                    }`}>
                                                        {isExpress
                                                            ? <Zap className="w-5 h-5" />
                                                            : <Package className="w-5 h-5" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-tx">{option.name}</h3>
                                                        {option.type?.description && (
                                                            <p className="text-sm text-tx-muted mt-0.5">
                                                                {option.type.description}
                                                            </p>
                                                        )}
                                                        {option.service_zone?.name && (
                                                            <p className="text-xs text-tx-muted mt-0.5 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {option.service_zone.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-lg font-bold text-brand">
                                                        {price ? formatPrice(price.amount, price.currency_code) : '—'}
                                                    </span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => startEdit(option)}
                                                        aria-label={`${t('common.edit')} ${option.name}`}
                                                        className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </StaggerItem>
                        )
                    })}
                </ListStagger>
            )}
        </PageEntrance>
    )
}
