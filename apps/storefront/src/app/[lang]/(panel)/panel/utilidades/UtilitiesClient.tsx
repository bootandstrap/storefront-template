'use client'

/**
 * UtilitiesClient — SOTA tabbed utility hub for the owner panel
 *
 * Mixed gating:
 *   1. WiFi QR        → FREE (always available)
 *   2. Loyalty Cards  → ecommerce Enterprise (enable_self_service_returns)
 *   3. Price Labels   → ecommerce Pro       (enable_product_badges)
 *
 * Locked tabs show inline up-sell with "why upgrade" + purchase CTA.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
    Wifi, Heart, Tag, Lock, Sparkles, ArrowRight,
    Plus, Search, Award, Settings, Users, Check,
    Star, Gift, ChevronRight, Printer, Package,
    Crown, Stamp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import WiFiQRCard from '@/components/panel/WiFiQRCard'
import LoyaltyCardPreview from '@/components/panel/LoyaltyCardPreview'
import PriceLabelSheet from '@/components/panel/PriceLabelSheet'
import type { PriceLabelItem } from '@/components/panel/PriceLabelSheet'
import {
    addStamp,
    redeemReward,
    getAllLoyaltyCustomers,
    getStampProgress,
    getLoyaltyConfig,
    saveLoyaltyConfig,
    DEFAULT_LOYALTY_CONFIG,
    type LoyaltyConfig,
    type LoyaltyCustomer,
} from '@/lib/pos/loyalty-engine'
import { SotaFeatureGateWrapper } from '@/components/panel/sota/SotaFeatureGateWrapper'
// ── Type interfaces ─────────────────────────────────────────────────────────

export interface UtilitiesLabels {
    title: string
    subtitle: string
    tabWifi: string
    tabLoyalty: string
    tabLabels: string
}

export interface WifiLabels {
    title: string; ssid: string; password: string; encryption: string
    save: string; add: string; delete: string; setDefault: string
    print: string; noNetworks: string; detectHint: string; useLast: string
}

export interface LoyaltyLabels {
    title: string; subtitle: string; stamps: string; redeem: string
    addStamp: string; qrHint: string; redeemed: string; progress: string
    complete: string; reward: string; configTitle: string; businessName: string
    stampsRequired: string; rewardDescription: string; rewardType: string
    customers: string; noCustomers: string; newCustomer: string
    customerName: string; saveConfig: string; configSaved: string
    totalRedeemed: string
}

export interface PriceLabelLabels {
    title: string; subtitle: string; print: string; noProducts: string
    count: string; sku: string; noSku: string; selectProducts: string
    selectAll: string; deselectAll: string; selectedCount: string
    generate: string
}

interface ProductData {
    id: string
    title: string
    thumbnail: string | null
    variants: {
        id: string; title: string; sku: string | null
        prices: { amount: number; currency_code: string }[]
    }[]
}

type TabKey = 'wifi' | 'loyalty' | 'labels'

interface UtilitiesClientProps {
    featureFlags: {
        enable_product_badges: boolean
        enable_self_service_returns: boolean
    }
    products: ProductData[]
    labels: UtilitiesLabels
    wifiLabels: WifiLabels
    loyaltyLabels: LoyaltyLabels
    labelsLabels: PriceLabelLabels
    lang: string
    defaultCurrency: string
}

// ── Utility overview card data ──────────────────────────────────────────────

interface UtilityInfo {
    key: TabKey
    icon: React.ReactNode
    label: string
    description: string
    tier: 'free' | 'pro' | 'enterprise'
    tierLabel: string
    color: string
    gradient: string
    isLocked: boolean
}

// ── SOTA Loyalty Management ─────────────────────────────────────────────────

function LoyaltyManager({ labels, lang }: { labels: LoyaltyLabels; lang: string }) {
    const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG)
    const [customers, setCustomers] = useState<LoyaltyCustomer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null)
    const [newCustomerName, setNewCustomerName] = useState('')
    const [showConfig, setShowConfig] = useState(false)
    const [configSaved, setConfigSaved] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Load data from localStorage
    useEffect(() => {
        setConfig(getLoyaltyConfig())
        setCustomers(getAllLoyaltyCustomers())
    }, [])

    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers
        return customers.filter(c =>
            c.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [customers, searchQuery])

    const handleSaveConfig = useCallback(() => {
        saveLoyaltyConfig(config)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 2000)
    }, [config])

    const handleAddStamp = useCallback((customerId: string, name: string) => {
        addStamp(customerId, name)
        setCustomers(getAllLoyaltyCustomers())
        const updated = getAllLoyaltyCustomers().find(c => c.customerId === customerId)
        if (updated) setSelectedCustomer(updated)
    }, [])

    const handleNewCustomerStamp = useCallback(() => {
        if (!newCustomerName.trim()) return
        const id = `cus_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        addStamp(id, newCustomerName.trim())
        setCustomers(getAllLoyaltyCustomers())
        setNewCustomerName('')
    }, [newCustomerName])

    const handleRedeem = useCallback((customerId: string) => {
        redeemReward(customerId)
        setCustomers(getAllLoyaltyCustomers())
        const updated = getAllLoyaltyCustomers().find(c => c.customerId === customerId)
        setSelectedCustomer(updated || null)
    }, [])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Customer management */}
            <div className="lg:col-span-2 space-y-5">
                {/* Header + Actions */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-tx font-display flex items-center gap-2">
                            <Heart className="w-5 h-5 text-brand" />
                            {labels.title}
                        </h3>
                        <p className="text-sm text-tx-muted mt-0.5">{labels.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowConfig(!showConfig)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sf-3 text-sm font-medium text-tx-sec hover:bg-sf-1 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        {labels.configTitle}
                    </button>
                </div>

                {/* Config panel (collapsible) */}
                <AnimatePresence>
                    {showConfig && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 rounded-2xl bg-sf-1 border border-sf-3 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-tx-muted uppercase tracking-wider block mb-1.5">
                                            {labels.businessName}
                                        </label>
                                        <input
                                            type="text"
                                            value={config.businessName}
                                            onChange={e => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                                            placeholder="Mi Tienda"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-tx-muted uppercase tracking-wider block mb-1.5">
                                            {labels.stampsRequired}
                                        </label>
                                        <input
                                            type="number"
                                            min={3}
                                            max={20}
                                            value={config.stampsRequired}
                                            onChange={e => setConfig(prev => ({ ...prev, stampsRequired: Number(e.target.value) }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-tx-muted uppercase tracking-wider block mb-1.5">
                                            {labels.rewardDescription}
                                        </label>
                                        <input
                                            type="text"
                                            value={config.rewardDescription}
                                            onChange={e => setConfig(prev => ({ ...prev, rewardDescription: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                                            placeholder="1 café gratis"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-tx-muted uppercase tracking-wider block mb-1.5">
                                            {labels.rewardType}
                                        </label>
                                        <select
                                            value={config.rewardType}
                                            onChange={e => setConfig(prev => ({ ...prev, rewardType: e.target.value as LoyaltyConfig['rewardType'] }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                                        >
                                            <option value="free_product">Producto gratis</option>
                                            <option value="discount_percent">Descuento %</option>
                                            <option value="discount_fixed">Descuento fijo</option>
                                            <option value="custom">Personalizado</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSaveConfig}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-soft"
                                    >
                                        <Check className="w-4 h-4" />
                                        {labels.saveConfig}
                                    </button>
                                    {configSaved && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-sm text-emerald-600 font-medium"
                                        >
                                            ✓ {labels.configSaved}
                                        </motion.span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quick add stamp */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                        <input
                            type="text"
                            value={newCustomerName}
                            onChange={e => setNewCustomerName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNewCustomerStamp()}
                            placeholder={labels.newCustomer}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all placeholder:text-tx-faint"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleNewCustomerStamp}
                        disabled={!newCustomerName.trim()}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-soft"
                    >
                        <Stamp className="w-4 h-4" />
                        {labels.addStamp}
                    </button>
                </div>

                {/* Customer search */}
                {customers.length > 3 && (
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar cliente..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft transition-all"
                        />
                    </div>
                )}

                {/* Customer list */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-semibold text-tx-muted uppercase tracking-widest flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {labels.customers} ({customers.length})
                        </h4>
                    </div>

                    {filteredCustomers.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-sf-3 bg-glass">
                            <Heart className="w-10 h-10 text-tx-faint mx-auto mb-3" />
                            <p className="text-sm text-tx-muted">{labels.noCustomers}</p>
                            <p className="text-xs text-tx-faint mt-1">{labels.qrHint}</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-surface-1 scrollbar-thumb-surface-3">
                            {filteredCustomers.map(customer => {
                                const progress = getStampProgress(customer, config)
                                const isSelected = selectedCustomer?.customerId === customer.customerId
                                return (
                                    <motion.button
                                        key={customer.customerId}
                                        type="button"
                                        onClick={() => setSelectedCustomer(isSelected ? null : customer)}
                                        className={`
                                            w-full text-left p-4 rounded-2xl border transition-all duration-200
                                            ${isSelected
                                                ? 'border-brand bg-brand-subtle shadow-sm shadow-brand-soft'
                                                : 'border-sf-3 bg-sf-0 hover:border-sf-4 hover:shadow-sm'
                                            }
                                        `}
                                        layout
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-muted to-brand-subtle flex items-center justify-center text-brand font-bold text-sm">
                                                    {customer.customerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-tx">
                                                        {customer.customerName}
                                                    </p>
                                                    <p className="text-xs text-tx-muted">
                                                        {customer.totalRedeemed > 0 && `${labels.totalRedeemed}: ${customer.totalRedeemed}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {progress.isComplete && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                        <Gift className="w-3 h-3" />
                                                        {labels.complete}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleAddStamp(customer.customerId, customer.customerName) }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-subtle text-brand text-xs font-semibold hover:bg-brand-muted transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    +1
                                                </button>
                                                {progress.isComplete && (
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); handleRedeem(customer.customerId) }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors"
                                                    >
                                                        <Gift className="w-3 h-3" />
                                                        {labels.redeem}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Stamp progress bar */}
                                        <div className="relative">
                                            <div className="flex gap-1">
                                                {Array.from({ length: config.stampsRequired }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`
                                                            flex-1 h-2 rounded-full transition-all duration-500
                                                            ${i < customer.stamps
                                                                ? 'bg-gradient-to-r from-brand to-brand'
                                                                : 'bg-sf-2'
                                                            }
                                                        `}
                                                        style={{ transitionDelay: `${i * 30}ms` }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-tx-muted mt-1.5">
                                                {labels.progress
                                                    .replace('{{current}}', String(customer.stamps))
                                                    .replace('{{total}}', String(config.stampsRequired))}
                                            </p>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right column: Preview */}
            <div className="space-y-4">
                <h4 className="text-xs font-semibold text-tx-muted uppercase tracking-widest px-1">
                    Vista previa
                </h4>
                <div className="sticky top-24">
                    <LoyaltyCardPreview
                        customer={selectedCustomer || {
                            customerId: 'preview',
                            customerName: config.businessName || 'Tu Cliente',
                            stamps: 0,
                            totalRedeemed: 0,
                            lastStampAt: null,
                            createdAt: new Date().toISOString(),
                        }}
                        config={config}
                        lang={lang}
                        variant="compact"
                    />
                    {/* Stats card */}
                    <div className="mt-4 p-4 rounded-2xl border border-sf-3 bg-sf-0 space-y-3">
                        <h5 className="text-xs font-semibold text-tx-muted uppercase tracking-widest">Resumen</h5>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-sf-1">
                                <p className="text-2xl font-bold text-tx font-display">{customers.length}</p>
                                <p className="text-xs text-tx-muted">Clientes</p>
                            </div>
                            <div className="p-3 rounded-xl bg-sf-1">
                                <p className="text-2xl font-bold text-tx font-display">
                                    {customers.reduce((sum, c) => sum + c.totalRedeemed, 0)}
                                </p>
                                <p className="text-xs text-tx-muted">Canjes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Product selector for Price Labels ───────────────────────────────────────

function ProductLabelSelector({
    products,
    labels,
    defaultCurrency,
}: {
    products: ProductData[]
    labels: PriceLabelLabels
    defaultCurrency: string
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [showLabels, setShowLabels] = useState(false)

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products
        return products.filter(p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.variants.some(v => v.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    }, [products, searchQuery])

    const toggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => {
        setSelectedIds(new Set(filteredProducts.map(p => p.id)))
    }

    const deselectAll = () => setSelectedIds(new Set())

    const labelItems: PriceLabelItem[] = useMemo(() => {
        const items: PriceLabelItem[] = []
        products.forEach(p => {
            if (!selectedIds.has(p.id)) return
            p.variants.forEach(v => {
                const price = v.prices[0]
                items.push({
                    name: p.title + (p.variants.length > 1 ? ` - ${v.title}` : ''),
                    price: price ? (price.amount / 100).toFixed(2) : '0.00',
                    sku: v.sku || '',
                    currency: price?.currency_code?.toUpperCase() || defaultCurrency.toUpperCase(),
                    variant: p.variants.length > 1 ? v.title : undefined,
                })
            })
        })
        return items
    }, [products, selectedIds])

    if (products.length === 0) {
        return (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-sf-3 bg-glass">
                <Package className="w-12 h-12 text-tx-faint mx-auto mb-3" />
                <p className="text-sm text-tx-muted font-medium">{labels.noProducts}</p>
                <p className="text-xs text-tx-faint mt-1">Añade productos en el catálogo primero</p>
            </div>
        )
    }

    if (showLabels && labelItems.length > 0) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => setShowLabels(false)}
                    className="inline-flex items-center gap-2 text-sm text-tx-muted hover:text-tx transition-colors"
                >
                    ← Volver a selección
                </button>
                <PriceLabelSheet
                    items={labelItems}
                    labels={{
                        print: labels.print,
                        noProducts: labels.noProducts,
                        count: labels.count,
                        noSku: labels.noSku,
                    }}
                />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-tx font-display flex items-center gap-2">
                        <Tag className="w-5 h-5 text-brand" />
                        {labels.title}
                    </h3>
                    <p className="text-sm text-tx-muted mt-0.5">{labels.subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowLabels(true)}
                    disabled={selectedIds.size === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-soft"
                >
                    <Printer className="w-4 h-4" />
                    {labels.generate} ({selectedIds.size})
                </button>
            </div>

            {/* Search + bulk actions */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={labels.selectProducts}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft transition-all"
                    />
                </div>
                <button
                    type="button"
                    onClick={selectedIds.size === filteredProducts.length ? deselectAll : selectAll}
                    className="px-4 py-2.5 rounded-xl border border-sf-3 text-sm font-medium text-tx-sec hover:bg-sf-1 transition-colors whitespace-nowrap"
                >
                    {selectedIds.size === filteredProducts.length ? labels.deselectAll : labels.selectAll}
                </button>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map(product => {
                    const isSelected = selectedIds.has(product.id)
                    const firstPrice = product.variants[0]?.prices[0]
                    const priceStr = firstPrice
                        ? `${(firstPrice.amount / 100).toFixed(2)} ${firstPrice.currency_code?.toUpperCase()}`
                        : '—'

                    return (
                        <motion.button
                            key={product.id}
                            type="button"
                            onClick={() => toggle(product.id)}
                            className={`
                                relative text-left p-4 rounded-2xl border transition-all duration-200
                                ${isSelected
                                    ? 'border-brand bg-brand-subtle shadow-sm shadow-brand-soft ring-1 ring-soft'
                                    : 'border-sf-3 bg-sf-0 hover:border-sf-4 hover:shadow-sm'
                                }
                            `}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Checkbox */}
                            <div className={`
                                absolute top-3 right-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                                ${isSelected
                                    ? 'bg-brand border-brand text-white'
                                    : 'border-sf-3 bg-sf-0'
                                }
                            `}>
                                {isSelected && <Check className="w-3 h-3" />}
                            </div>

                            {/* Thumbnail */}
                            <div className="w-full aspect-square rounded-xl bg-sf-1 mb-3 overflow-hidden">
                                {product.thumbnail ? (
                                    <img
                                        src={product.thumbnail}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-8 h-8 text-tx-faint" />
                                    </div>
                                )}
                            </div>

                            <p className="text-sm font-semibold text-tx line-clamp-2 pr-6">
                                {product.title}
                            </p>
                            <p className="text-xs text-tx-muted mt-1">{priceStr}</p>
                            <p className="text-xs text-tx-faint mt-0.5">
                                {product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}
                            </p>
                        </motion.button>
                    )
                })}
            </div>

            {/* Selection summary */}
            {selectedIds.size > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky bottom-0 p-4 rounded-2xl bg-sf-0 border border-brand-soft shadow-lg shadow-brand-soft flex items-center justify-between"
                >
                    <p className="text-sm text-tx-sec font-medium">
                        {labels.selectedCount.replace('{{count}}', String(selectedIds.size))} · {labelItems.length} {labels.count.replace('{{count}}', String(labelItems.length)).toLowerCase()}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowLabels(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-soft"
                    >
                        <Printer className="w-4 h-4" />
                        {labels.generate}
                    </button>
                </motion.div>
            )}
        </div>
    )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function UtilitiesClient({
    featureFlags,
    products,
    labels,
    wifiLabels,
    loyaltyLabels,
    labelsLabels,
    lang,
    defaultCurrency,
}: UtilitiesClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('wifi')
    const isLoyaltyLocked = !featureFlags.enable_self_service_returns
    const isLabelsLocked = !featureFlags.enable_product_badges

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; locked: boolean; tier: string }[] = [
        { key: 'wifi', label: labels.tabWifi, icon: <Wifi className="w-4 h-4" />, locked: false, tier: '' },
        { key: 'loyalty', label: labels.tabLoyalty, icon: <Heart className="w-4 h-4" />, locked: isLoyaltyLocked, tier: 'Enterprise' },
        { key: 'labels', label: labels.tabLabels, icon: <Tag className="w-4 h-4" />, locked: isLabelsLocked, tier: 'Pro' },
    ]

    const utilInfos: UtilityInfo[] = [
        {
            key: 'wifi',
            icon: <Wifi className="w-6 h-6" />,
            label: labels.tabWifi,
            description: 'Genera códigos QR para tu WiFi. Tus clientes pueden conectarse escaneando el código.',
            tier: 'free',
            tierLabel: 'Gratis',
            color: 'text-blue-500',
            gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
            isLocked: false,
        },
        {
            key: 'loyalty',
            icon: <Heart className="w-6 h-6" />,
            label: labels.tabLoyalty,
            description: 'Crea tarjetas de sellos digitales para fidelizar clientes con recompensas personalizadas.',
            tier: 'enterprise',
            tierLabel: 'Enterprise',
            color: 'text-rose-500',
            gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
            isLocked: isLoyaltyLocked,
        },
        {
            key: 'labels',
            icon: <Tag className="w-6 h-6" />,
            label: labels.tabLabels,
            description: 'Imprime etiquetas de precio con códigos de barras directamente desde tu catálogo.',
            tier: 'pro',
            tierLabel: 'Pro',
            color: 'text-amber-500',
            gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
            isLocked: isLabelsLocked,
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-tx font-display">
                    {labels.title}
                </h1>
                <p className="text-sm text-tx-muted mt-1">{labels.subtitle}</p>
            </div>

            {/* Overview cards — Free vs Pro vs Enterprise */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {utilInfos.map(util => (
                    <SotaFeatureGateWrapper
                        key={util.key}
                        isLocked={util.isLocked}
                        flag={util.key === 'loyalty' ? 'enable_self_service_returns' : 'enable_product_badges'}
                        variant="blur"
                    >
                        <button
                            type="button"
                            onClick={() => setActiveTab(util.key)}
                            className={`
                                w-full h-full group relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-300
                                ${activeTab === util.key
                                    ? 'border-brand bg-brand-subtle shadow-md shadow-brand-soft ring-1 ring-soft'
                                    : 'border-sf-3 bg-sf-0 hover:border-sf-4 hover:shadow-sm'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${util.gradient} text-white transition-transform duration-300 group-hover:scale-110`}>
                                    {util.icon}
                                </div>
                                <span className={`
                                    inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                                    ${util.tier === 'free'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : util.tier === 'pro'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-rose-100 text-rose-700'
                                    }
                                `}>
                                    {util.isLocked && <Lock className="w-3 h-3" />}
                                    {util.tierLabel}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-tx">{util.label}</p>
                            <p className="text-xs text-tx-muted mt-1 line-clamp-2">{util.description}</p>
                        </button>
                    </SotaFeatureGateWrapper>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* WiFi QR — always available */}
                    {activeTab === 'wifi' && (
                        <WiFiQRCard labels={wifiLabels} />
                    )}

                    {/* Loyalty — management UI */}
                    {activeTab === 'loyalty' && (
                        <LoyaltyManager labels={loyaltyLabels} lang={lang} />
                    )}

                    {/* Labels — product selector */}
                    {activeTab === 'labels' && (
                        <ProductLabelSelector products={products} labels={labelsLabels} defaultCurrency={defaultCurrency} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
