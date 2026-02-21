'use client'

/**
 * CustomersClient — interactive customer list for Owner Panel
 *
 * Features:
 * - Search by name or email
 * - Sortable table
 * - Customer count badge
 */

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Users, Mail, ShoppingBag, Calendar } from 'lucide-react'

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
        customer: string
        email: string
        orders: string
        totalSpent: string
        joinedDate: string
        total: string
        previous: string
        next: string
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
            return new Intl.DateTimeFormat(lang, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }).format(new Date(iso))
        } catch {
            return iso.slice(0, 10)
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
                <div className="text-center py-16 text-text-muted">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">{labels.noCustomers}</p>
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

                        return (
                            <div
                                key={customer.id}
                                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-5 py-4
                                           border-b border-surface-3/50 last:border-0
                                           hover:bg-surface-1/30 transition-colors"
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

                                {/* Joined date */}
                                <div className="col-span-2 flex items-center justify-end gap-1.5 text-sm text-text-muted">
                                    <Calendar className="w-3.5 h-3.5 md:hidden" />
                                    {formatDate(customer.created_at)}
                                </div>
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
