'use client'

/**
 * Orders Management — Owner Panel
 *
 * Features:
 * - Order list with status filter tabs
 * - Search by order number or customer email
 * - Expandable order detail with items, address, payment
 * - Fulfill / Cancel actions with confirmation
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import {
    Package, Search, ChevronDown, ChevronUp, MapPin, CreditCard,
    CheckCircle, XCircle, Clock, Truck, ShoppingBag, AlertCircle
} from 'lucide-react'
import { fulfillOrder, cancelOrder } from './actions'
import type { AdminOrderFull } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderLabels {
    title: string
    subtitle: string
    searchPlaceholder: string
    all: string
    pending: string
    completed: string
    canceled: string
    noOrders: string
    order: string
    customer: string
    date: string
    items: string
    total: string
    status: string
    viewDetail: string
    fulfill: string
    cancel: string
    fulfillConfirm: string
    cancelConfirm: string
    shippingAddress: string
    payment: string
    fulfilled: string
    notFulfilled: string
    back: string
    previous: string
    next: string
}

interface Props {
    orders: AdminOrderFull[]
    totalCount: number
    currentPage: number
    pageSize: number
    initialSearch: string
    initialStatus: StatusFilter
    lang: string
    labels: OrderLabels
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-700'
        case 'pending': return 'bg-amber-100 text-amber-700'
        case 'canceled': return 'bg-red-100 text-red-700'
        case 'requires_action': return 'bg-blue-100 text-blue-700'
        default: return 'bg-surface-1 text-text-muted'
    }
}

function statusIcon(status: string) {
    switch (status) {
        case 'completed': return <CheckCircle className="w-3.5 h-3.5" />
        case 'pending': return <Clock className="w-3.5 h-3.5" />
        case 'canceled': return <XCircle className="w-3.5 h-3.5" />
        default: return <AlertCircle className="w-3.5 h-3.5" />
    }
}

function fulfillmentIcon(status: string) {
    if (status === 'fulfilled' || status === 'shipped') {
        return <Truck className="w-3.5 h-3.5 text-green-600" />
    }
    return <Package className="w-3.5 h-3.5 text-amber-600" />
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100)
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | 'pending' | 'completed' | 'canceled'

export default function OrdersClient({
    orders,
    totalCount,
    currentPage,
    pageSize,
    initialSearch,
    initialStatus,
    lang: _lang,
    labels,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    const [filter, setFilter] = useState<StatusFilter>(initialStatus)
    const [search, setSearch] = useState(initialSearch)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    const updateQuery = (updates: Record<string, string | undefined>) => {
        const next = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(updates)) {
            if (!value) {
                next.delete(key)
            } else {
                next.set(key, value)
            }
        }
        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
    }

    const applySearch = () => {
        const q = search.trim()
        updateQuery({
            q: q || undefined,
            page: '1',
        })
    }

    const goToPage = (page: number) => {
        updateQuery({ page: String(page) })
    }

    const handleFulfill = (orderId: string) => {
        if (!confirm(labels.fulfillConfirm)) return
        startTransition(async () => {
            const result = await fulfillOrder(orderId)
            if (result.success) {
                router.refresh()
                toast.success('✓')
            } else {
                setError(result.error ?? 'Error')
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const handleCancel = (orderId: string) => {
        if (!confirm(labels.cancelConfirm)) return
        startTransition(async () => {
            const result = await cancelOrder(orderId)
            if (result.success) {
                router.refresh()
                toast.success('✓')
            } else {
                setError(result.error ?? 'Error')
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const tabs: { key: StatusFilter; label: string; color: string }[] = [
        { key: 'all', label: labels.all, color: '' },
        { key: 'pending', label: labels.pending, color: 'text-amber-600' },
        { key: 'completed', label: labels.completed, color: 'text-green-600' },
        { key: 'canceled', label: labels.canceled, color: 'text-red-600' },
    ]

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                        {labels.title}
                    </h1>
                    <p className="text-text-muted mt-1">
                        {labels.subtitle} · {totalCount} {labels.order}(s)
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2 text-xs">✕</button>
                </div>
            )}

            {/* Filter tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex gap-1 bg-surface-1 rounded-xl p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setFilter(tab.key)
                                updateQuery({
                                    status: tab.key === 'all' ? undefined : tab.key,
                                    page: '1',
                                })
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab.key
                                ? 'bg-white dark:bg-surface-2 shadow-sm text-primary'
                                : `text-text-muted hover:text-text-secondary ${tab.color}`
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applySearch()
                        }}
                        placeholder={labels.searchPlaceholder}
                        className="pl-9 pr-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-full sm:w-64"
                    />
                </div>
            </div>

            {/* Orders list */}
            {orders.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">📦</div>
                    <p className="text-text-muted text-lg">{labels.noOrders}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const isExpanded = expandedId === order.id
                        const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || order.email || '—'

                        return (
                            <div key={order.id} className="glass rounded-2xl overflow-hidden">
                                {/* Order row (clickable) */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-0/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {/* Order number */}
                                        <span className="font-bold text-primary text-sm">
                                            #{order.display_id}
                                        </span>
                                        {/* Customer */}
                                        <span className="text-sm text-text-secondary">
                                            {customerName}
                                        </span>
                                        {/* Date */}
                                        <span className="text-xs text-text-muted hidden sm:inline">
                                            {formatDate(order.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Total */}
                                        <span className="font-bold text-sm">
                                            {formatPrice(order.total, order.currency_code)}
                                        </span>
                                        {/* Status badge */}
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(order.status)}`}>
                                            {statusIcon(order.status)}
                                            {order.status}
                                        </span>
                                        {/* Fulfillment icon */}
                                        {fulfillmentIcon(order.fulfillment_status)}
                                        {/* Expand arrow */}
                                        {isExpanded
                                            ? <ChevronUp className="w-4 h-4 text-text-muted" />
                                            : <ChevronDown className="w-4 h-4 text-text-muted" />}
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border-surface-2 px-5 py-5 space-y-5 bg-surface-0/30">
                                        {/* Items */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                {labels.items} ({order.items?.length ?? 0})
                                            </h4>
                                            <div className="space-y-2">
                                                {(order.items ?? []).map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 py-2">
                                                        {item.thumbnail ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={item.thumbnail}
                                                                alt={item.title}
                                                                className="w-10 h-10 rounded-lg object-cover bg-surface-1"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-text-muted" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                                                            {item.variant_title && (
                                                                <p className="text-xs text-text-muted">{item.variant_title}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium">
                                                                {item.quantity} × {formatPrice(item.unit_price, order.currency_code)}
                                                            </p>
                                                            <p className="text-xs text-text-muted">
                                                                {formatPrice(item.total, order.currency_code)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Totals summary */}
                                            <div className="mt-3 pt-3 border-t border-surface-2 space-y-1 text-sm">
                                                {order.shipping_total > 0 && (
                                                    <div className="flex justify-between text-text-muted">
                                                        <span>Envío</span>
                                                        <span>{formatPrice(order.shipping_total, order.currency_code)}</span>
                                                    </div>
                                                )}
                                                {order.tax_total > 0 && (
                                                    <div className="flex justify-between text-text-muted">
                                                        <span>Impuestos</span>
                                                        <span>{formatPrice(order.tax_total, order.currency_code)}</span>
                                                    </div>
                                                )}
                                                {order.discount_total > 0 && (
                                                    <div className="flex justify-between text-green-600">
                                                        <span>Descuento</span>
                                                        <span>-{formatPrice(order.discount_total, order.currency_code)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-bold text-text-primary pt-1">
                                                    <span>{labels.total}</span>
                                                    <span>{formatPrice(order.total, order.currency_code)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer + Shipping + Payment */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Customer */}
                                            <div className="bg-surface-1 rounded-xl p-4">
                                                <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                                                    {labels.customer}
                                                </h5>
                                                <p className="text-sm font-medium text-text-primary">{customerName}</p>
                                                {order.customer?.email && (
                                                    <p className="text-xs text-text-muted mt-1">{order.customer.email}</p>
                                                )}
                                            </div>

                                            {/* Shipping address */}
                                            {order.shipping_address && (
                                                <div className="bg-surface-1 rounded-xl p-4">
                                                    <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {labels.shippingAddress}
                                                    </h5>
                                                    <p className="text-sm text-text-primary">
                                                        {[
                                                            order.shipping_address.address_1,
                                                            order.shipping_address.address_2,
                                                        ].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p className="text-xs text-text-muted">
                                                        {[
                                                            order.shipping_address.postal_code,
                                                            order.shipping_address.city,
                                                            order.shipping_address.province,
                                                        ].filter(Boolean).join(', ')}
                                                    </p>
                                                    {order.shipping_address.phone && (
                                                        <p className="text-xs text-text-muted mt-1">📱 {order.shipping_address.phone}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Payment */}
                                            {order.payments?.length > 0 && (
                                                <div className="bg-surface-1 rounded-xl p-4">
                                                    <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1">
                                                        <CreditCard className="w-3 h-3" />
                                                        {labels.payment}
                                                    </h5>
                                                    {order.payments.map(p => (
                                                        <div key={p.id} className="text-sm">
                                                            <p className="font-medium text-text-primary capitalize">{p.provider_id.replace(/_/g, ' ')}</p>
                                                            <p className="text-xs text-text-muted">{formatPrice(p.amount, p.currency_code)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {order.status !== 'canceled' && (
                                            <div className="flex flex-wrap gap-3 pt-2">
                                                {order.fulfillment_status !== 'fulfilled' && order.fulfillment_status !== 'shipped' && (
                                                    <button
                                                        onClick={() => handleFulfill(order.id)}
                                                        disabled={isPending}
                                                        className="btn btn-primary inline-flex items-center gap-2 text-sm"
                                                    >
                                                        <Truck className="w-4 h-4" />
                                                        {isPending ? '...' : labels.fulfill}
                                                    </button>
                                                )}
                                                {order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped' ? (
                                                    <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {labels.fulfilled}
                                                    </span>
                                                ) : null}
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancel(order.id)}
                                                        disabled={isPending}
                                                        className="btn btn-ghost text-red-600 hover:bg-red-50 inline-flex items-center gap-2 text-sm"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        {isPending ? '...' : labels.cancel}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
                <div className="flex items-center justify-between pt-2">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={!canGoPrev}
                        className="btn btn-ghost disabled:opacity-50"
                    >
                        {labels.previous}
                    </button>
                    <p className="text-sm text-text-muted">
                        {currentPage} / {totalPages}
                    </p>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={!canGoNext}
                        className="btn btn-ghost disabled:opacity-50"
                    >
                        {labels.next}
                    </button>
                </div>
            )}
        </>
    )
}
