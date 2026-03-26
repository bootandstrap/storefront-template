'use client'

/**
 * Orders Management — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - Animated page entrance + staggered order list
 * - Status filter tabs with animated indicator
 * - Animated expand/collapse for order details
 * - PanelConfirmDialog for fulfill / cancel / refund
 * - PanelStatusBadge for order + fulfillment status
 * - PanelPagination for shared pagination
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import {
    Package, Search, ChevronDown, MapPin, CreditCard,
    CheckCircle, Truck, ShoppingBag, RotateCcw, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem, ExpandableSection } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import PanelStatusBadge, { orderStatusVariant } from '@/components/panel/PanelStatusBadge'
import PanelPagination from '@/components/panel/PanelPagination'
import { fulfillOrder, cancelOrder, refundOrder } from './actions'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
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
    noOrdersDesc?: string
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
    refund: string
    refundConfirm: string
    refundAmount: string
    refundHint: string
    refundSuccess: string
    shipping: string
    taxes: string
    discount: string
    subtotal: string
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

type StatusFilter = 'all' | 'pending' | 'completed' | 'canceled'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number, currency: string, lang: string): string {
    return new Intl.NumberFormat(toIntlLocale(lang), {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100)
}

function formatDate(dateStr: string, lang: string): string {
    return new Date(dateStr).toLocaleDateString(toIntlLocale(lang), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function fulfillmentLabel(status: string): { label: string; variant: 'success' | 'pending' | 'neutral' } {
    if (status === 'fulfilled' || status === 'shipped') {
        return { label: status, variant: 'success' }
    }
    return { label: status || 'not_fulfilled', variant: 'pending' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrdersClient({
    orders,
    totalCount,
    currentPage,
    pageSize,
    initialSearch,
    initialStatus,
    lang,
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
    const [refundingId, setRefundingId] = useState<string | null>(null)
    const [refundAmount, setRefundAmount] = useState('')
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    // ── Confirm dialogs ─────────────────────────────────────────────────
    const fulfillDialog = useConfirmDialog({
        title: labels.fulfill,
        description: labels.fulfillConfirm,
        confirmLabel: labels.fulfill,
        variant: 'info',
    })
    const cancelDialog = useConfirmDialog({
        title: labels.cancel,
        description: labels.cancelConfirm,
        confirmLabel: labels.cancel,
        variant: 'danger',
    })
    const refundDialog = useConfirmDialog({
        title: labels.refund,
        description: labels.refundConfirm,
        confirmLabel: labels.refund,
        variant: 'warning',
    })

    // ── Query helpers ───────────────────────────────────────────────────
    const updateQuery = (updates: Record<string, string | undefined>) => {
        const next = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(updates)) {
            if (!value) next.delete(key)
            else next.set(key, value)
        }
        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
    }

    const applySearch = () => {
        const q = search.trim()
        updateQuery({ q: q || undefined, page: '1' })
    }

    // ── Actions ─────────────────────────────────────────────────────────
    const handleFulfill = (orderId: string) => {
        fulfillDialog.confirm(() => {
            startTransition(async () => {
                const result = await fulfillOrder(orderId)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const handleCancel = (orderId: string) => {
        cancelDialog.confirm(() => {
            startTransition(async () => {
                const result = await cancelOrder(orderId)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const handleRefund = (orderId: string, paymentId: string, maxAmount: number, currency: string) => {
        const amountCents = Math.round(parseFloat(refundAmount) * 100)
        if (isNaN(amountCents) || amountCents <= 0) {
            toast.error('Invalid amount')
            return
        }
        if (amountCents > maxAmount) {
            toast.error(`Max: ${formatPrice(maxAmount, currency, lang)}`)
            return
        }
        refundDialog.confirm(() => {
            startTransition(async () => {
                const result = await refundOrder(orderId, paymentId, amountCents)
                if (result.success) {
                    router.refresh()
                    toast.success(labels.refundSuccess)
                    setRefundingId(null)
                    setRefundAmount('')
                } else {
                    setError(result.error ?? 'Error')
                    toast.error(result.error ?? 'Error')
                }
            })
        })
    }

    // ── Tab data ─────────────────────────────────────────────────────────
    const tabs: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: labels.all },
        { key: 'pending', label: labels.pending },
        { key: 'completed', label: labels.completed },
        { key: 'canceled', label: labels.canceled },
    ]

    return (
        <PageEntrance className="space-y-5">
            {/* Header */}
            <PanelPageHeader
                title={labels.title}
                subtitle={`${labels.subtitle} · ${totalCount} ${labels.order}(s)`}
                icon={<ShoppingBag className="w-5 h-5" />}
                badge={totalCount}
            />

            {/* Error banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
                    >
                        <span>{error}</span>
                        <button onClick={() => setError(null)} aria-label="Dismiss error" className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex gap-1 glass rounded-xl p-1">
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
                            aria-pressed={filter === tab.key}
                            className={`relative px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 ${
                                filter === tab.key
                                    ? 'text-primary'
                                    : 'text-text-muted hover:text-text-secondary'
                            }`}
                        >
                            {filter === tab.key && (
                                <motion.div
                                    layoutId="order-tab-indicator"
                                    className="absolute inset-0 bg-white dark:bg-surface-2 rounded-lg shadow-sm"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
                        placeholder={labels.searchPlaceholder}
                        aria-label={labels.searchPlaceholder}
                        className="pl-9 pr-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all w-full sm:w-64"
                    />
                </div>
            </div>

            {/* Orders list */}
            {orders.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <ShoppingBag className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {labels.noOrders}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed mb-1">
                            {labels.noOrdersDesc || 'When customers place orders, they will appear here.'}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {orders.map(order => {
                        const isExpanded = expandedId === order.id
                        const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || order.email || '—'
                        const fulfillment = fulfillmentLabel(order.fulfillment_status)

                        return (
                            <StaggerItem key={order.id}>
                                <div className="glass rounded-2xl overflow-hidden transition-shadow hover:shadow-lg">
                                    {/* Order row (clickable) */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        aria-expanded={isExpanded}
                                        aria-label={`${labels.viewDetail} #${order.display_id}`}
                                        className="w-full flex items-center justify-between px-5 py-4 min-h-[56px] hover:bg-surface-0/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                                    >
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="font-bold text-primary text-sm">
                                                #{order.display_id}
                                            </span>
                                            <span className="text-sm text-text-secondary">
                                                {customerName}
                                            </span>
                                            <span className="text-xs text-text-muted hidden sm:inline">
                                                {formatDate(order.created_at, lang)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm">
                                                {formatPrice(order.total, order.currency_code, lang)}
                                            </span>
                                            <PanelStatusBadge
                                                variant={orderStatusVariant(order.status)}
                                                label={order.status}
                                                dot
                                                size="sm"
                                            />
                                            <PanelStatusBadge
                                                variant={fulfillment.variant}
                                                label={fulfillment.label}
                                                icon={fulfillment.variant === 'success' ? <Truck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                size="sm"
                                            />
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronDown className="w-4 h-4 text-text-muted" />
                                            </motion.div>
                                        </div>
                                    </button>

                                    {/* Expanded detail — animated */}
                                    <ExpandableSection isOpen={isExpanded}>
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
                                                                    {item.quantity} × {formatPrice(item.unit_price, order.currency_code, lang)}
                                                                </p>
                                                                <p className="text-xs text-text-muted">
                                                                    {formatPrice(item.total, order.currency_code, lang)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Totals summary */}
                                                <div className="mt-3 pt-3 border-t border-surface-2 space-y-1 text-sm">
                                                    {order.shipping_total > 0 && (
                                                        <div className="flex justify-between text-text-muted">
                                                            <span>{labels.shipping}</span>
                                                            <span>{formatPrice(order.shipping_total, order.currency_code, lang)}</span>
                                                        </div>
                                                    )}
                                                    {order.tax_total > 0 && (
                                                        <div className="flex justify-between text-text-muted">
                                                            <span>{labels.taxes}</span>
                                                            <span>{formatPrice(order.tax_total, order.currency_code, lang)}</span>
                                                        </div>
                                                    )}
                                                    {order.discount_total > 0 && (
                                                        <div className="flex justify-between text-emerald-600">
                                                            <span>{labels.discount}</span>
                                                            <span>-{formatPrice(order.discount_total, order.currency_code, lang)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-text-primary pt-1">
                                                        <span>{labels.total}</span>
                                                        <span>{formatPrice(order.total, order.currency_code, lang)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Customer + Shipping + Payment */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {/* Customer */}
                                                <div className="glass rounded-xl p-4">
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
                                                    <div className="glass rounded-xl p-4">
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
                                                            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                                                <span className="text-text-muted">📱</span> {order.shipping_address.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Payment */}
                                                {order.payments?.length > 0 && (
                                                    <div className="glass rounded-xl p-4">
                                                        <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <CreditCard className="w-3 h-3" />
                                                            {labels.payment}
                                                        </h5>
                                                        {order.payments.map(p => (
                                                            <div key={p.id} className="text-sm">
                                                                <p className="font-medium text-text-primary capitalize">{p.provider_id.replace(/_/g, ' ')}</p>
                                                                <p className="text-xs text-text-muted">{formatPrice(p.amount, p.currency_code, lang)}</p>
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
                                                            aria-label={labels.fulfill}
                                                            className="btn btn-primary inline-flex items-center gap-2 text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                                                        >
                                                            <Truck className="w-4 h-4" />
                                                            {isPending ? '...' : labels.fulfill}
                                                        </button>
                                                    )}
                                                    {(order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped') && (
                                                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {labels.fulfilled}
                                                        </span>
                                                    )}
                                                    {order.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleCancel(order.id)}
                                                            disabled={isPending}
                                                            aria-label={labels.cancel}
                                                            className="btn btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 inline-flex items-center gap-2 text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            {isPending ? '...' : labels.cancel}
                                                        </button>
                                                    )}

                                                    {/* Refund */}
                                                    {order.payment_status === 'captured' && order.payments?.length > 0 && (
                                                        <AnimatePresence mode="wait">
                                                            {refundingId === order.id ? (
                                                                <motion.div
                                                                    key="refund-form"
                                                                    initial={{ opacity: 0, width: 0 }}
                                                                    animate={{ opacity: 1, width: 'auto' }}
                                                                    exit={{ opacity: 0, width: 0 }}
                                                                    className="flex items-center gap-2 glass rounded-xl px-4 py-2"
                                                                >
                                                                    <label className="text-sm text-text-secondary whitespace-nowrap">
                                                                        {labels.refundAmount} ({order.currency_code.toUpperCase()}):
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="0.01"
                                                                        max={order.payments[0].amount / 100}
                                                                        value={refundAmount}
                                                                        onChange={e => setRefundAmount(e.target.value)}
                                                                        placeholder={String(order.payments[0].amount / 100)}
                                                                        className="w-24 px-3 py-1.5 rounded-lg border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleRefund(
                                                                            order.id,
                                                                            order.payments[0].id,
                                                                            order.payments[0].amount,
                                                                            order.currency_code
                                                                        )}
                                                                        disabled={isPending}
                                                                        aria-label={labels.refund}
                                                                        className="btn btn-primary text-sm py-1.5 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                                                                    >
                                                                        {isPending ? '...' : labels.refund}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setRefundingId(null); setRefundAmount('') }}
                                                                        disabled={isPending}
                                                                        aria-label={labels.cancel}
                                                                        className="p-1.5 rounded-lg hover:bg-surface-1 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </motion.div>
                                                            ) : (
                                                                <motion.button
                                                                    key="refund-btn"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    onClick={() => {
                                                                        setRefundingId(order.id)
                                                                        setRefundAmount(String(order.payments[0].amount / 100))
                                                                    }}
                                                                    disabled={isPending}
                                                                    className="btn btn-ghost text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 inline-flex items-center gap-2 text-sm"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                    {labels.refund}
                                                                </motion.button>
                                                            )}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </ExpandableSection>
                                </div>
                            </StaggerItem>
                        )
                    })}
                </ListStagger>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
                <PanelPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => updateQuery({ page: String(page) })}
                    labels={{ previous: labels.previous, next: labels.next }}
                />
            )}

            {/* Confirm dialogs */}
            <PanelConfirmDialog {...fulfillDialog.dialogProps} loading={isPending} />
            <PanelConfirmDialog {...cancelDialog.dialogProps} loading={isPending} />
            <PanelConfirmDialog {...refundDialog.dialogProps} loading={isPending} />
        </PageEntrance>
    )
}
