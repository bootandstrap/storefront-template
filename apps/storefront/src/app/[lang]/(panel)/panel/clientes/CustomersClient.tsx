'use client'

/**
 * CustomersClient — interactive customer list for Owner Panel
 *
 * Features:
 * - Search by name or email
 * - Sortable table
 * - Customer count badge
 * - Expandable rows with lazy-loaded order history
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Users, Mail, ShoppingBag, Calendar, ChevronDown, Loader2 } from 'lucide-react'
import { fetchCustomerOrders, type CustomerOrderSummary } from './actions'
import { toIntlLocale } from '@/lib/i18n/intl-locale'

interface Customer {
    id: string
    email: string
    first_name?: string | null
    last_name?: string | null
    created_at: string
    orders?: { id: string }[]
    metadata?: Record<string, unknown>
}

interface CustomersClientProps {
    customers: Customer[]
    totalCount: number
    currentPage: number
    pageSize: number
    initialSearch: string
    lang: string
    labels: {
        title: string
        subtitle: string
        searchPlaceholder: string
        noCustomers: string
        noCustomersHint?: string
        customer: string
        email: string
        orders: string
        totalSpent: string
        joinedDate: string
        total: string
        previous: string
        next: string
        orderNumber?: string
        status?: string
        date?: string
        noOrders?: string
    }
}

export default function CustomersClient({
    customers,
    totalCount,
    currentPage,
    pageSize,
    initialSearch,
    lang,
    labels,
}: CustomersClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [search, setSearch] = useState(initialSearch)
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    // Expandable order history
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [orderCache, setOrderCache] = useState<Record<string, CustomerOrderSummary[]>>({})
    const [isLoadingOrders, startOrderTransition] = useTransition()

    const intlLocale = toIntlLocale(lang)

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

    const formatDate = (iso: string) => {
        try {
            return new Intl.DateTimeFormat(intlLocale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }).format(new Date(iso))
        } catch {
            return iso.slice(0, 10)
        }
    }

    const formatPrice = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat(intlLocale, {
                style: 'currency',
                currency: currency.toUpperCase(),
                minimumFractionDigits: 0,
            }).format(amount / 100)
        } catch {
            return `${(amount / 100).toFixed(2)} ${currency}`
        }
    }

    const toggleExpand = (customerId: string) => {
        if (expandedId === customerId) {
            setExpandedId(null)
            return
        }
        setExpandedId(customerId)
        // Load orders if not cached
        if (!orderCache[customerId]) {
            startOrderTransition(async () => {
                const result = await fetchCustomerOrders(customerId)
                if (!result.error) {
                    setOrderCache(prev => ({ ...prev, [customerId]: result.orders }))
                }
            })
        }
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {labels.title}
                    </h1>
                    <p className="text-sm text-text-muted mt-1">{labels.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Users className="w-4 h-4" />
                    {totalCount}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') applySearch()
                    }}
                    placeholder={labels.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-3
                               bg-surface-0 text-sm text-text-primary placeholder:text-text-muted
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40
                               transition-all"
                />
            </div>

            {/* Customer list */}
            {customers.length === 0 ? (
                <div className="glass rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Users className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {labels.noCustomers}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            {labels.noCustomersHint || 'Your customers will appear here as they create accounts and place orders.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="glass rounded-2xl border border-surface-3 overflow-hidden">
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-1/50 border-b border-surface-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        <div className="col-span-4">{labels.customer}</div>
                        <div className="col-span-4">{labels.email}</div>
                        <div className="col-span-2 text-center">{labels.orders}</div>
                        <div className="col-span-2 text-right">{labels.joinedDate}</div>
                    </div>

                    {/* Rows */}
                    {customers.map(customer => {
                        const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'
                        const initials = name !== '—'
                            ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                            : '?'
                        const orderCount = customer.orders?.length ?? 0
                        const isExpanded = expandedId === customer.id
                        const cachedOrders = orderCache[customer.id]

                        return (
                            <div key={customer.id}>
                                <div
                                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-5 py-4
                                               border-b border-surface-3/50 last:border-0
                                               hover:bg-surface-1/30 transition-colors cursor-pointer"
                                    onClick={() => toggleExpand(customer.id)}
                                >
                                    {/* Name with avatar */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary
                                                        flex items-center justify-center text-sm font-bold shrink-0">
                                            {initials}
                                        </div>
                                        <span className="font-medium text-text-primary truncate">{name}</span>
                                    </div>

                                    {/* Email */}
                                    <div className="col-span-4 flex items-center gap-2 text-sm text-text-secondary truncate">
                                        <Mail className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                                        {customer.email}
                                    </div>

                                    {/* Order count */}
                                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                                        <ShoppingBag className="w-3.5 h-3.5 text-text-muted" />
                                        <span className="text-sm text-text-secondary">{orderCount}</span>
                                    </div>

                                    {/* Joined date + expand toggle */}
                                    <div className="col-span-2 flex items-center justify-end gap-1.5 text-sm text-text-muted">
                                        <Calendar className="w-3.5 h-3.5 md:hidden" />
                                        {formatDate(customer.created_at)}
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Expanded order history */}
                                {isExpanded && (
                                    <div className="px-5 pb-4 bg-surface-1/20 border-b border-surface-3/50">
                                        <div className="pl-12 pt-2 space-y-2">
                                            {isLoadingOrders && !cachedOrders ? (
                                                <div className="flex items-center gap-2 py-3 text-sm text-text-muted">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading...
                                                </div>
                                            ) : cachedOrders && cachedOrders.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {cachedOrders.map(order => (
                                                        <div
                                                            key={order.id}
                                                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-0/60 text-sm"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-mono text-text-muted">
                                                                    #{order.display_id}
                                                                </span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                                        order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                                                            'bg-surface-2 text-text-muted'
                                                                    }`}>
                                                                    {order.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-text-muted">{formatDate(order.created_at)}</span>
                                                                <span className="font-semibold">
                                                                    {formatPrice(order.total, order.currency_code)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="py-3 text-sm text-text-muted">
                                                    {labels.noOrders || 'No orders yet'}
                                                </p>
                                            )}
                                        </div>
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
                        onClick={() => updateQuery({ page: String(currentPage - 1) })}
                        disabled={!canGoPrev}
                        className="btn btn-ghost disabled:opacity-50"
                    >
                        {labels.previous}
                    </button>
                    <p className="text-sm text-text-muted">
                        {currentPage} / {totalPages}
                    </p>
                    <button
                        onClick={() => updateQuery({ page: String(currentPage + 1) })}
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
