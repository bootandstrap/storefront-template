'use client'

import { useState, useCallback } from 'react'
import {
    Search, Loader2, Package, Clock, CheckCircle2,
    Truck, XCircle, AlertCircle, Mail, Hash
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: typeof Clock; colorClass: string; key: string }> = {
    pending: { icon: Clock, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'order.pending' },
    processing: { icon: Package, colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', key: 'order.processing' },
    shipped: { icon: Truck, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', key: 'order.shipped' },
    completed: { icon: CheckCircle2, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'order.delivered' },
    delivered: { icon: CheckCircle2, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'order.delivered' },
    canceled: { icon: XCircle, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'order.cancelled' },
    cancelled: { icon: XCircle, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'order.cancelled' },
}

// ─── Timeline ─────────────────────────────────────────────────
const TIMELINE_STEPS = [
    { status: 'pending', icon: Clock, key: 'order.pending' },
    { status: 'processing', icon: Package, key: 'order.processing' },
    { status: 'shipped', icon: Truck, key: 'order.shipped' },
    { status: 'completed', icon: CheckCircle2, key: 'order.delivered' },
]

function getTimelineIndex(status: string): number {
    if (status === 'canceled' || status === 'cancelled') return -1
    const idx = TIMELINE_STEPS.findIndex(s => s.status === status)
    if (status === 'completed' || status === 'delivered') return TIMELINE_STEPS.length - 1
    return idx >= 0 ? idx : 0
}

interface GuestOrder {
    id: string
    display_id: number | null
    status: string
    created_at: string
    email: string
    total: number
    currency_code: string
    items: Array<{
        title: string
        quantity: number
        unit_price: number
    }>
}

export default function GuestOrderLookupClient() {
    const { t, locale } = useI18n()
    const [email, setEmail] = useState('')
    const [orderNumber, setOrderNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [order, setOrder] = useState<GuestOrder | null>(null)

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !orderNumber) return

        setLoading(true)
        setError(null)
        setOrder(null)

        try {
            // Use Medusa store API to look up order
            const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
            const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

            const res = await fetch(`${baseUrl}/store/orders?display_id=${orderNumber}`, {
                headers: {
                    'x-publishable-api-key': publishableKey,
                    'Content-Type': 'application/json',
                },
            })

            if (!res.ok) throw new Error('Order not found')

            const data = await res.json()
            const orders = data.orders || []

            // Filter by email
            const matched = orders.find((o: GuestOrder) =>
                o.email?.toLowerCase() === email.toLowerCase()
            )

            if (!matched) {
                setError(t('guestOrder.notFound') || 'No order found with that email and order number.')
                return
            }

            setOrder(matched)
        } catch {
            setError(t('guestOrder.notFound') || 'No order found with that email and order number.')
        } finally {
            setLoading(false)
        }
    }, [email, orderNumber, t])

    const formatPrice = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency.toUpperCase(),
            }).format(amount / 100)
        } catch {
            return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
        }
    }

    return (
        <div className="space-y-6">
            {/* Search form */}
            <form onSubmit={handleSearch} className="glass rounded-2xl p-6 space-y-4">
                <div>
                    <label className="text-xs text-tx-muted font-medium mb-1.5 block flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {t('auth.email') || 'Email'}
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        required
                    />
                </div>

                <div>
                    <label className="text-xs text-tx-muted font-medium mb-1.5 block flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {t('guestOrder.orderNumber') || 'Order Number'}
                    </label>
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="12345"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !email || !orderNumber}
                    className="btn btn-primary w-full text-sm"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                    {t('guestOrder.search') || 'Find Order'}
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Order result */}
            {order && (
                <div className="glass rounded-2xl p-6 space-y-4 animate-slide-up">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-tx">
                                {t('order.number') || 'Order'} #{order.display_id}
                            </h2>
                            <p className="text-xs text-tx-muted">
                                {new Date(order.created_at).toLocaleDateString(
                                    locale === 'es' ? 'es-ES' : locale,
                                    { day: 'numeric', month: 'long', year: 'numeric' }
                                )}
                            </p>
                        </div>
                        <div>
                            {(() => {
                                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                                const Icon = cfg.icon
                                return (
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.colorClass}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                        {t(cfg.key)}
                                    </span>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Timeline */}
                    {order.status !== 'canceled' && order.status !== 'cancelled' && (
                        <div>
                            <div className="flex items-center justify-between">
                                {TIMELINE_STEPS.map((step, i) => {
                                    const Icon = step.icon
                                    const currentStep = getTimelineIndex(order.status)
                                    const isActive = i <= currentStep
                                    const isCurrent = i === currentStep
                                    return (
                                        <div key={step.status} className="flex flex-col items-center flex-1">
                                            <div className="flex items-center w-full">
                                                {i > 0 && (
                                                    <div className={`h-0.5 flex-1 ${i <= currentStep ? 'bg-brand' : 'bg-text-muted/20'}`} />
                                                )}
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                                        isCurrent
                                                            ? 'bg-brand text-white ring-4 ring-soft'
                                                            : isActive
                                                                ? 'bg-brand-muted text-brand'
                                                                : 'bg-text-muted/10 text-tx-faint'
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                {i < TIMELINE_STEPS.length - 1 && (
                                                    <div className={`h-0.5 flex-1 ${i < currentStep ? 'bg-brand' : 'bg-text-muted/20'}`} />
                                                )}
                                            </div>
                                            <span className={`text-[10px] mt-2 text-center ${isActive ? 'text-tx font-medium' : 'text-tx-muted'}`}>
                                                {t(step.key)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div className="border-t border-white/5 pt-4">
                        <div className="space-y-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-tx truncate flex-1">
                                        {item.title} × {item.quantity}
                                    </span>
                                    <span className="text-tx font-medium ml-4">
                                        {formatPrice(item.unit_price * item.quantity, order.currency_code)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-3 mt-3 border-t border-white/5 font-bold">
                            <span className="text-tx">{t('order.total')}</span>
                            <span className="text-brand">{formatPrice(order.total, order.currency_code)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
