'use client'

/**
 * CustomersClient — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - Page entrance animation + staggered customer rows
 * - Animated expand/collapse with lazy-loaded order history
 * - PanelStatusBadge for order statuses in expanded view
 * - PanelPagination shared component
 * - Shimmer loading for lazy orders
 */

import { useState, useTransition, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Users, Mail, ShoppingBag, Calendar, ChevronDown, Trophy, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchCustomerOrders, syncLoyaltyStamps, type CustomerOrderSummary } from './actions'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem, ExpandableSection } from '@/components/panel/PanelAnimations'
import PanelStatusBadge, { orderStatusVariant } from '@/components/panel/PanelStatusBadge'
import PanelPagination from '@/components/panel/PanelPagination'
import LoyaltyCardPreview from '@/components/panel/LoyaltyCardPreview'
import { useToast } from '@/components/ui/Toaster'
import {
    getCustomerLoyalty, getLoyaltyConfig, addStamp, toLoyaltyMedusaData,
    type LoyaltyCustomer, type LoyaltyConfig,
} from '@/lib/pos/loyalty-engine'

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

    // Expandable order history
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [orderCache, setOrderCache] = useState<Record<string, CustomerOrderSummary[]>>({})
    const [isLoadingOrders, startOrderTransition] = useTransition()

    const intlLocale = toIntlLocale(lang)
    const toast = useToast()

    // Loyalty state (loaded from localStorage, synced to Medusa)
    const [loyaltyConfig] = useState<LoyaltyConfig>(() => getLoyaltyConfig())
    const [loyaltyCache, setLoyaltyCache] = useState<Record<string, LoyaltyCustomer>>({})

    const handleAddStamp = useCallback((customerId: string, customerName: string) => {
        // 1. Local write (fast)
        const updated = addStamp(customerId, customerName)
        setLoyaltyCache(prev => ({ ...prev, [customerId]: updated }))
        toast.success('🎫 +1 sello')

        // 2. Medusa sync (background, fire-and-forget)
        syncLoyaltyStamps(customerId, toLoyaltyMedusaData(updated)).catch(() => {
            // Non-critical — localStorage is the fast cache
        })
    }, [toast])

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

    const formatDate = (iso: string) => {
        try {
            return new Intl.DateTimeFormat(intlLocale, {
                year: 'numeric', month: 'short', day: 'numeric',
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
        <PageEntrance className="space-y-5">
            {/* Header */}
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<Users className="w-5 h-5" />}
                badge={totalCount}
            />

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
                    placeholder={labels.searchPlaceholder}
                    aria-label={labels.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] glass rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
            </div>

            {/* Customer list */}
            {customers.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
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
                </motion.div>
            ) : (
                <div className="glass rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-1/50 border-b border-surface-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        <div className="col-span-4">{labels.customer}</div>
                        <div className="col-span-4">{labels.email}</div>
                        <div className="col-span-2 text-center">{labels.orders}</div>
                        <div className="col-span-2 text-right">{labels.joinedDate}</div>
                    </div>

                    {/* Rows */}
                    <ListStagger>
                        {customers.map(customer => {
                            const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'
                            const initials = name !== '—'
                                ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                                : '?'
                            const orderCount = customer.orders?.length ?? 0
                            const isExpanded = expandedId === customer.id
                            const cachedOrders = orderCache[customer.id]

                            return (
                                <StaggerItem key={customer.id}>
                                    {/* Row */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        aria-label={`${name} — ${customer.email}`}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-5 py-4 min-h-[56px]
                                                   border-b border-surface-2/50 last:border-0
                                                   hover:bg-surface-1/30 transition-colors cursor-pointer
                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                                        onClick={() => toggleExpand(customer.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(customer.id) } }}
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
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Expanded order history — animated */}
                                    <ExpandableSection isOpen={isExpanded}>
                                        <div className="px-5 pb-4 bg-surface-1/20 border-b border-surface-2/50">
                                            <div className="pl-12 pt-2 space-y-2">
                                                {isLoadingOrders && !cachedOrders ? (
                                                    /* Shimmer skeleton for loading orders */
                                                    <div className="space-y-2">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-0/60">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-4 w-12 rounded bg-surface-2 animate-pulse" />
                                                                    <div className="h-5 w-16 rounded-full bg-surface-2 animate-pulse" />
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-4 w-20 rounded bg-surface-2 animate-pulse" />
                                                                    <div className="h-4 w-16 rounded bg-surface-2 animate-pulse" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : cachedOrders && cachedOrders.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {cachedOrders.map(order => (
                                                            <motion.div
                                                                key={order.id}
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-0/60 text-sm"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-mono text-text-muted">
                                                                        #{order.display_id}
                                                                    </span>
                                                                    <PanelStatusBadge
                                                                        variant={orderStatusVariant(order.status)}
                                                                        label={order.status}
                                                                        size="sm"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-text-muted">{formatDate(order.created_at)}</span>
                                                                    <span className="font-semibold">
                                                                        {formatPrice(order.total, order.currency_code)}
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-3 text-sm text-text-muted">
                                                        {labels.noOrders || 'No orders yet'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Loyalty Card */}
                                        <div className="px-5 pb-4 bg-surface-1/10">
                                            <div className="pl-12 pt-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Trophy className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Loyalty</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAddStamp(customer.id, name)
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg
                                                                   bg-primary/10 text-primary hover:bg-primary/20 transition-colors
                                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Sello
                                                    </button>
                                                </div>
                                                <LoyaltyCardPreview
                                                    customer={(() => {
                                                        // Prefer optimistic cache > localStorage > fresh
                                                        const cached = loyaltyCache[customer.id]
                                                        if (cached) return cached
                                                        const local = getCustomerLoyalty(customer.id)
                                                        return local ?? {
                                                            customerId: customer.id,
                                                            customerName: name,
                                                            stamps: 0,
                                                            totalRedeemed: 0,
                                                            lastStampAt: null,
                                                            createdAt: customer.created_at,
                                                        }
                                                    })()}
                                                    config={loyaltyConfig}
                                                    variant="compact"
                                                />
                                            </div>
                                        </div>
                                    </ExpandableSection>
                                </StaggerItem>
                            )
                        })}
                    </ListStagger>
                </div>
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
        </PageEntrance>
    )
}
