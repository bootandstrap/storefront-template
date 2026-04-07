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

import { useState, useTransition, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Users, Mail, ShoppingBag, Calendar, ChevronDown, Trophy, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchCustomerOrders, syncLoyaltyStamps, type CustomerOrderSummary } from './actions'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
import { PageEntrance, ListStagger, StaggerItem, ExpandableSection } from '@/components/panel/PanelAnimations'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
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

    // ── Universal Persistence ───────────────────────────────────────────
    useEffect(() => {
        if (!searchParams.toString()) {
            const saved = sessionStorage.getItem('panel-clientes-query')
            if (saved) {
                router.replace(`${pathname}?${saved}`)
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const query = searchParams.toString()
        if (query) {
            sessionStorage.setItem('panel-clientes-query', query)
        }
    }, [searchParams])

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
        <PageEntrance className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <span className="hidden sm:inline px-3 py-1.5 text-sm font-bold text-tx uppercase tracking-wider mr-2">
                        CRM
                    </span>
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'has_orders', label: 'Con Pedidos' },
                        { id: 'recent', label: 'Recientes' },
                        { id: 'vip', label: 'VIP' }
                    ].map((f) => {
                        const isActive = (searchParams.get('filter') || 'all') === f.id
                        return (
                            <button
                                key={f.id}
                                onClick={() => updateQuery({ filter: f.id === 'all' ? undefined : f.id, page: '1' })}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-brand text-white shadow-md'
                                        : 'text-tx-sec hover:bg-sf-1'
                                }`}
                            >
                                {f.label}
                            </button>
                        )
                    })}
                </div>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
                        placeholder={labels.searchPlaceholder}
                        aria-label={labels.searchPlaceholder}
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-sf-3 bg-sf-1 focus:bg-sf-0 focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-sm"
                    />
                    {search && (
                        <button 
                            type="button" 
                            onClick={() => { setSearch(''); updateQuery({ q: undefined, page: '1' }) }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-muted hover:text-tx"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <SotaBentoGrid>
                <SotaBentoItem colSpan={12} className="p-0 border-0 bg-transparent shadow-none">
                    <div className="space-y-4">
            {/* Customer list */}
            {(() => {
                const filterTerm = searchParams.get('filter') || 'all'
                const displayCustomers = customers.filter((c: any) => {
                    if (filterTerm === 'has_orders') return c.has_account || c.orders?.length > 0
                    if (filterTerm === 'recent') return new Date(c.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
                    if (filterTerm === 'vip') return c.has_account 
                    return true
                })

                if (displayCustomers.length === 0) {
                    return (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <SotaGlassCard glowColor="none" className="py-16">
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-sf-1 rounded-full flex items-center justify-center mb-4 border border-sf-3/30 shadow-inner">
                                        <Users className="w-8 h-8 text-tx-muted opacity-50" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-tx mb-2">
                                        {labels.noCustomers}
                                    </h3>
                                    <p className="text-sm text-tx-muted mb-6 max-w-sm mx-auto">
                                        {labels.noCustomersHint || 'Your customers will appear here as they create accounts and place orders.'}
                                    </p>
                                </div>
                            </SotaGlassCard>
                        </motion.div>
                    )
                }

                return (
                    <SotaGlassCard glowColor="none" overflowHidden className="p-0">
                        {/* Table header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-sf-0/50 backdrop-blur-md border-b border-sf-2 text-xs font-semibold text-tx-muted uppercase tracking-wider">
                            <div className="col-span-4">{labels.customer}</div>
                            <div className="col-span-4">{labels.email}</div>
                            <div className="col-span-2 text-center">{labels.orders}</div>
                            <div className="col-span-2 text-right">{labels.joinedDate}</div>
                        </div>

                        {/* Rows */}
                        <ListStagger>
                            {displayCustomers.map(customer => {
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
                                                       border-b border-sf-2 last:border-0
                                                       hover:bg-sf-1 transition-colors cursor-pointer
                                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-inset"
                                            onClick={() => toggleExpand(customer.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(customer.id) } }}
                                        >
                                            {/* Name with avatar */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-brand-subtle text-brand
                                                                flex items-center justify-center text-sm font-bold shrink-0">
                                                    {initials}
                                                </div>
                                                <span className="font-medium text-tx truncate">{name}</span>
                                            </div>

                                            {/* Email */}
                                            <div className="col-span-4 flex items-center gap-2 text-sm text-tx-sec truncate">
                                                <Mail className="w-3.5 h-3.5 shrink-0 text-tx-muted" />
                                                {customer.email}
                                            </div>

                                            {/* Order count */}
                                            <div className="col-span-2 flex items-center justify-center gap-1.5">
                                                <ShoppingBag className="w-3.5 h-3.5 text-tx-muted" />
                                                <span className="text-sm text-tx-sec">{orderCount}</span>
                                            </div>

                                            {/* Joined date + expand toggle */}
                                            <div className="col-span-2 flex items-center justify-end gap-1.5 text-sm text-tx-muted">
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
                                            <div className="px-5 pb-4 bg-sf-0/50 backdrop-blur-md border-b border-sf-2">
                                                <div className="pl-12 pt-2 space-y-2">
                                                    {isLoadingOrders && !cachedOrders ? (
                                                        /* Shimmer skeleton for loading orders */
                                                        <div className="space-y-2">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-sf-0/50 backdrop-blur-md border border-sf-3/30">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-4 w-12 rounded bg-sf-2 animate-pulse" />
                                                                        <div className="h-5 w-16 rounded-full bg-sf-2 animate-pulse" />
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="h-4 w-20 rounded bg-sf-2 animate-pulse" />
                                                                        <div className="h-4 w-16 rounded bg-sf-2 animate-pulse" />
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
                                                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-sf-0/50 backdrop-blur-md border border-sf-3/30 text-sm"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="font-mono text-tx-muted">
                                                                            #{order.display_id}
                                                                        </span>
                                                                        <PanelStatusBadge
                                                                            variant={orderStatusVariant(order.status)}
                                                                            label={order.status}
                                                                            size="sm"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-tx-muted">{formatDate(order.created_at)}</span>
                                                                        <span className="font-semibold">
                                                                            {formatPrice(order.total, order.currency_code)}
                                                                        </span>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="py-3 text-sm text-tx-muted">
                                                            {labels.noOrders || 'No orders yet'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Loyalty Card */}
                                            <div className="px-5 pb-4 bg-sf-0/50 backdrop-blur-md">
                                                <div className="pl-12 pt-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Trophy className="w-3.5 h-3.5 text-brand" />
                                                            <span className="text-xs font-semibold text-tx-muted uppercase tracking-wider">Loyalty</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleAddStamp(customer.id, name)
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg
                                                                       bg-brand-subtle text-brand hover:bg-brand-muted transition-colors
                                                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
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
                    </SotaGlassCard>
                )
            })()}
                    </div>
                </SotaBentoItem>
            </SotaBentoGrid>

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
