'use client'

import { useState } from 'react'
import { Search, Package, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export default function GuestOrderLookup() {
    const { t, locale } = useI18n()
    const [email, setEmail] = useState('')
    const [orderId, setOrderId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{
        display_id: number
        status: string
        created_at: string
        total: number
        currency_code: string
    } | null>(null)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim() || !orderId.trim()) return

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // Call server-side endpoint (no direct Medusa exposure to client)
            const res = await fetch('/api/orders/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    display_id: orderId.trim(),
                }),
            })

            if (res.status === 404) {
                setError(t('order.lookupNotFound'))
                return
            }

            if (!res.ok) {
                setError(t('order.lookupError'))
                return
            }

            const data = await res.json()
            if (data.order) {
                setResult({
                    display_id: data.order.display_id,
                    status: data.order.status || 'pending',
                    created_at: data.order.created_at,
                    total: data.order.total ?? 0,
                    currency_code: data.order.currency_code || 'usd',
                })
            } else {
                setError(t('order.lookupNotFound'))
            }
        } catch {
            setError(t('order.lookupError'))
        } finally {
            setLoading(false)
        }
    }

    const STATUS_LABELS: Record<string, { key: string; icon: React.ElementType; className: string }> = {
        pending: { key: 'order.pending', icon: Clock, className: 'text-amber-400' },
        completed: { key: 'order.delivered', icon: CheckCircle, className: 'text-green-400' },
        cancelled: { key: 'order.cancelled', icon: XCircle, className: 'text-gray-400' },
    }

    return (
        <div className="container-page py-12">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <Package className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
                        {t('order.lookup')}
                    </h1>
                    <p className="text-sm text-text-secondary">
                        {t('order.lookupHint')}
                    </p>
                </div>

                <form onSubmit={handleSearch} className="glass rounded-2xl p-6 space-y-4">
                    <div>
                        <label className="text-sm text-text-secondary block mb-1">
                            {t('auth.email')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm text-text-secondary block mb-1">
                            {t('order.number')}
                        </label>
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="1234"
                            className="input w-full"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('common.loading')}
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                {t('order.lookup')}
                            </>
                        )}
                    </button>
                </form>

                {/* Error */}
                {error && (
                    <div className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="mt-4 glass rounded-xl p-5 animate-fade-in">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold text-text-primary">
                                {t('order.number')}{result.display_id}
                            </span>
                            {(() => {
                                const statusConfig = STATUS_LABELS[result.status] ?? STATUS_LABELS.pending
                                const Icon = statusConfig.icon
                                return (
                                    <span className={`flex items-center gap-1 text-sm font-medium ${statusConfig.className}`}>
                                        <Icon className="w-4 h-4" />
                                        {t(statusConfig.key)}
                                    </span>
                                )
                            })()}
                        </div>
                        <div className="text-sm text-text-muted space-y-1">
                            <p>
                                {t('order.date')}:{' '}
                                {new Intl.DateTimeFormat(locale, {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                }).format(new Date(result.created_at))}
                            </p>
                            <p>
                                {t('cart.total')}:{' '}
                                <span className="font-bold text-primary">
                                    {new Intl.NumberFormat(locale, {
                                        style: 'currency',
                                        currency: (result.currency_code || 'USD').toUpperCase(),
                                        minimumFractionDigits: 0,
                                    }).format(result.total / 100)}
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
