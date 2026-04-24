/**
 * PromotionsClient — Owner Panel Promotions/Coupons Manager
 *
 * Full CRUD for Medusa v2 promotions. Wired to admin-promotions.ts API.
 * Features: create, enable/disable toggle, delete, search, usage tracking.
 *
 * @module panel/promociones
 */
'use client'

import { useState, useCallback, useTransition } from 'react'
import {
    Plus,
    Percent,
    DollarSign,
    Truck,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Search,
    Copy,
    Check,
    Tag,
} from 'lucide-react'
import type { AdminPromotion, CreatePromotionInput } from '@/lib/medusa/admin-promotions'
import LimitAwareCTA from '@/components/panel/LimitAwareCTA'
import type { LimitCheckResult } from '@/lib/limits'

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
    promotions: AdminPromotion[]
    totalCount: number
    promotionLimitResult?: LimitCheckResult
    lang: string
    labels: {
        title: string
        subtitle: string
        create: string
        code: string
        type: string
        value: string
        usageLimit: string
        usageCount: string
        startsAt: string
        endsAt: string
        noPromotions: string
        noPromotionsDesc: string
        percentage: string
        fixed: string
        freeShipping: string
        active: string
        disabled: string
        save: string
        cancel: string
        delete: string
        confirmDelete: string
        unlimited: string
        codeCopied: string
        creating: string
        saving: string
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPromoValue(type: string, value: number): string {
    if (type === 'percentage') return `${value}%`
    if (type === 'free_shipping') return '🚚'
    return `${(value / 100).toFixed(2)}`
}

function getTypeIcon(type: string) {
    if (type === 'percentage') return <Percent className="w-4 h-4" />
    if (type === 'free_shipping') return <Truck className="w-4 h-4" />
    return <DollarSign className="w-4 h-4" />
}

function getTypeColor(type: string) {
    if (type === 'percentage') return 'bg-purple-100 text-purple-700'
    if (type === 'free_shipping') return 'bg-teal-100 text-teal-700'
    return 'bg-emerald-100 text-emerald-700'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PromotionsClient({ promotions: initialPromotions, promotionLimitResult, lang, labels }: Props) {
    const [promotions, setPromotions] = useState(initialPromotions)
    const [search, setSearch] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // ── Create form state ────────────────────────────────────────────────────
    const [newCode, setNewCode] = useState('')
    const [newType, setNewType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage')
    const [newValue, setNewValue] = useState('')
    const [newUsageLimit, setNewUsageLimit] = useState('')
    const [newStartsAt, setNewStartsAt] = useState('')
    const [newEndsAt, setNewEndsAt] = useState('')
    const [createError, setCreateError] = useState<string | null>(null)

    const filteredPromotions = promotions.filter(p =>
        !search || p.code.toLowerCase().includes(search.toLowerCase())
    )

    // ── Copy code to clipboard ───────────────────────────────────────────────
    const copyCode = useCallback(async (id: string, code: string) => {
        await navigator.clipboard.writeText(code)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }, [])

    // ── Create promotion ─────────────────────────────────────────────────────
    const handleCreate = useCallback(async () => {
        if (!newCode.trim()) return
        setCreateError(null)

        const data: CreatePromotionInput = {
            code: newCode.trim().toUpperCase(),
            type: newType,
            value: newType === 'free_shipping' ? 0 : Number(newValue) * (newType === 'fixed' ? 100 : 1),
            ...(newUsageLimit ? { usage_limit: Number(newUsageLimit) } : {}),
            ...(newStartsAt ? { starts_at: new Date(newStartsAt).toISOString() } : {}),
            ...(newEndsAt ? { ends_at: new Date(newEndsAt).toISOString() } : {}),
        }

        startTransition(async () => {
            try {
                const res = await fetch(`/api/panel/promotions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })
                const result = await res.json()
                if (result.error) {
                    setCreateError(result.error)
                    return
                }
                if (result.promotion) {
                    setPromotions(prev => [result.promotion, ...prev])
                    setShowCreate(false)
                    resetForm()
                }
            } catch (e) {
                setCreateError(e instanceof Error ? e.message : 'Unknown error')
            }
        })
    }, [newCode, newType, newValue, newUsageLimit, newStartsAt, newEndsAt])

    // ── Toggle promotion status ──────────────────────────────────────────────
    const toggleStatus = useCallback(async (id: string, currentlyDisabled: boolean) => {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/panel/promotions/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_disabled: !currentlyDisabled }),
                })
                if (res.ok) {
                    setPromotions(prev => prev.map(p =>
                        p.id === id ? { ...p, is_disabled: !currentlyDisabled } : p
                    ))
                }
            } catch { /* silently fail */ }
        })
    }, [])

    // ── Delete promotion ─────────────────────────────────────────────────────
    const handleDelete = useCallback(async (id: string) => {
        if (!confirm(labels.confirmDelete)) return
        startTransition(async () => {
            try {
                const res = await fetch(`/api/panel/promotions/${id}`, {
                    method: 'DELETE',
                })
                if (res.ok) {
                    setPromotions(prev => prev.filter(p => p.id !== id))
                }
            } catch { /* silently fail */ }
        })
    }, [labels.confirmDelete])

    const resetForm = () => {
        setNewCode('')
        setNewType('percentage')
        setNewValue('')
        setNewUsageLimit('')
        setNewStartsAt('')
        setNewEndsAt('')
        setCreateError(null)
    }

    return (
        <div className="space-y-4">
            {/* Header with search + create */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`${labels.code}...`}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                </div>
                {promotionLimitResult ? (
                    <LimitAwareCTA
                        label={labels.create}
                        icon={<Plus className="w-4 h-4" />}
                        limitResult={promotionLimitResult}
                        onClick={() => setShowCreate(!showCreate)}
                        upgradeHref="modulos"
                        isLoading={isPending}
                        showCounter
                    />
                ) : (
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {labels.create}
                    </button>
                )}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-sf-0 border border-sf-3/30 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-tx flex items-center gap-2">
                        <Tag className="w-4 h-4 text-brand" />
                        {labels.create}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Code */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.code}</label>
                            <input
                                type="text"
                                value={newCode}
                                onChange={e => setNewCode(e.target.value.toUpperCase())}
                                placeholder="VERANO20"
                                className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.type}</label>
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value as 'percentage' | 'fixed' | 'free_shipping')}
                                className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                            >
                                <option value="percentage">{labels.percentage}</option>
                                <option value="fixed">{labels.fixed}</option>
                                <option value="free_shipping">{labels.freeShipping}</option>
                            </select>
                        </div>

                        {/* Value */}
                        {newType !== 'free_shipping' && (
                            <div>
                                <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.value}</label>
                                <input
                                    type="number"
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    placeholder={newType === 'percentage' ? '20' : '10.00'}
                                    min="0"
                                    step={newType === 'percentage' ? '1' : '0.01'}
                                    className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                                />
                            </div>
                        )}

                        {/* Usage limit */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.usageLimit}</label>
                            <input
                                type="number"
                                value={newUsageLimit}
                                onChange={e => setNewUsageLimit(e.target.value)}
                                placeholder={labels.unlimited}
                                min="0"
                                className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>

                        {/* Start date */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.startsAt}</label>
                            <input
                                type="datetime-local"
                                value={newStartsAt}
                                onChange={e => setNewStartsAt(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>

                        {/* End date */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted mb-1.5">{labels.endsAt}</label>
                            <input
                                type="datetime-local"
                                value={newEndsAt}
                                onChange={e => setNewEndsAt(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-sf-3/30 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>

                    {createError && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreate}
                            disabled={isPending || !newCode.trim()}
                            className="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                        >
                            {isPending ? labels.creating : labels.save}
                        </button>
                        <button
                            onClick={() => { setShowCreate(false); resetForm() }}
                            className="px-4 py-2 rounded-xl border border-sf-3/30 text-sm font-medium text-tx-muted hover:bg-sf-1 transition-colors"
                        >
                            {labels.cancel}
                        </button>
                    </div>
                </div>
            )}

            {/* Promotions List */}
            {filteredPromotions.length === 0 ? (
                <div className="text-center py-12 bg-sf-0 rounded-2xl border border-sf-3/30">
                    <Tag className="w-10 h-10 text-tx-muted mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold text-tx-muted">{labels.noPromotions}</p>
                    <p className="text-xs text-tx-muted mt-1">{labels.noPromotionsDesc}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredPromotions.map(promo => {
                        const isExpired = promo.ends_at && new Date(promo.ends_at) < new Date()
                        const isActive = !promo.is_disabled && !isExpired
                        return (
                            <div
                                key={promo.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                    isActive
                                        ? 'bg-sf-0 border-sf-3/30 hover:border-brand/30'
                                        : 'bg-sf-1/50 border-sf-3/20 opacity-70'
                                }`}
                            >
                                {/* Type icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(promo.type)}`}>
                                    {getTypeIcon(promo.type)}
                                </div>

                                {/* Code + type info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono font-bold text-sm text-tx tracking-wide">{promo.code}</span>
                                        <button
                                            onClick={() => copyCode(promo.id, promo.code)}
                                            className="text-tx-muted hover:text-brand transition-colors"
                                            title={labels.codeCopied}
                                        >
                                            {copiedId === promo.id
                                                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                : <Copy className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                        {isExpired && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">EXPIRED</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-tx-muted">
                                        {formatPromoValue(promo.type, promo.value)} off
                                        {promo.usage_limit ? ` · ${promo.usage_count}/${promo.usage_limit} ${labels.usageCount}` : ` · ${promo.usage_count} ${labels.usageCount}`}
                                        {promo.ends_at && ` · → ${new Date(promo.ends_at).toLocaleDateString(lang)}`}
                                    </p>
                                </div>

                                {/* Toggle */}
                                <button
                                    onClick={() => toggleStatus(promo.id, promo.is_disabled)}
                                    disabled={isPending}
                                    className="shrink-0 text-tx-muted hover:text-brand transition-colors"
                                    title={promo.is_disabled ? labels.active : labels.disabled}
                                >
                                    {promo.is_disabled
                                        ? <ToggleLeft className="w-6 h-6" />
                                        : <ToggleRight className="w-6 h-6 text-emerald-500" />
                                    }
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(promo.id)}
                                    disabled={isPending}
                                    className="shrink-0 text-tx-muted hover:text-red-500 transition-colors"
                                    title={labels.delete}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
