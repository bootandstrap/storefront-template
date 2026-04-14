'use client'

/**
 * AnalyticsDashboard — Owner Panel analytics overview
 *
 * SOTA design with glassmorphism cards, animated counters, and
 * responsive chart area. Data fetched from /api/panel/analytics.
 *
 * Features:
 * - Revenue KPI with trend
 * - Orders/day sparkline
 * - Top products table
 * - Customer growth
 * - Storage usage gauge
 *
 * @module components/panel/AnalyticsDashboard
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    TrendingUp, ShoppingCart, Users, HardDrive, Package,
    BarChart3, DollarSign, ArrowUpRight, ArrowDownRight,
    Calendar, Loader2,
} from 'lucide-react'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'

// ── Types ─────────────────────────────────────────────────────────────

interface AnalyticsData {
    period: { days: number; since: string }
    revenue: { total: number; orderCount: number; averageOrderValue: number } | null
    orderTrend: Array<{ date: string; orders: number }>
    topProducts: Array<{ name: string; views: number }>
    customers: { total: number; thisMonth: number } | null
    storage: { used_mb: number; limit_mb: number } | null
}

interface AnalyticsDashboardProps {
    lang?: string
    currency?: string
}

// ── Component ─────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ lang = 'es', currency = 'EUR' }: AnalyticsDashboardProps) {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/panel/analytics?period=${period}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => { fetchData() }, [fetchData])

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-tx-ter" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-tx-ter">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay datos analíticos disponibles</p>
            </div>
        )
    }

    return (
        <PageEntrance>
            <div className="space-y-6">
                {/* ── Period Selector ──────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-tx-pri flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" /> Analíticas
                    </h2>
                    <div className="flex gap-1 p-1 rounded-xl bg-sf-sec border border-brd-pri">
                        {(['7d', '30d', '90d'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                    period === p
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'text-tx-sec hover:text-tx-pri'
                                }`}
                            >
                                {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── KPI Cards ────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        icon={<DollarSign className="w-5 h-5" />}
                        label="Ingresos"
                        value={formatCurrency(data.revenue?.total || 0)}
                        trend={null}
                        color="emerald"
                    />
                    <KPICard
                        icon={<ShoppingCart className="w-5 h-5" />}
                        label="Pedidos"
                        value={String(data.revenue?.orderCount || 0)}
                        subtext={`${formatCurrency(data.revenue?.averageOrderValue || 0)} ticket medio`}
                        color="blue"
                    />
                    <KPICard
                        icon={<Users className="w-5 h-5" />}
                        label="Clientes"
                        value={String(data.customers?.total || 0)}
                        subtext={`+${data.customers?.thisMonth || 0} este mes`}
                        color="purple"
                    />
                    <KPICard
                        icon={<HardDrive className="w-5 h-5" />}
                        label="Almacenamiento"
                        value={data.storage ? `${data.storage.used_mb} MB` : 'N/A'}
                        subtext={data.storage ? `de ${data.storage.limit_mb} MB` : undefined}
                        color="amber"
                    />
                </div>

                {/* ── Order Trend ──────────────────────────────────── */}
                {data.orderTrend.length > 0 && (
                    <SotaGlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-tx-sec mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Pedidos por día
                        </h3>
                        <div className="flex items-end gap-1 h-32">
                            {data.orderTrend.map((day, idx) => {
                                const max = Math.max(...data.orderTrend.map(d => d.orders), 1)
                                const height = (day.orders / max) * 100
                                return (
                                    <motion.div
                                        key={day.date}
                                        className="flex-1 bg-gradient-to-t from-brand to-brand/60 rounded-t-sm min-w-[4px] relative group"
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ delay: idx * 0.02, duration: 0.4 }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-sf-pri border border-brd-pri rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                                                <p className="font-semibold text-tx-pri">{day.orders} pedidos</p>
                                                <p className="text-tx-ter">{day.date}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-tx-ter">
                                {data.orderTrend[0]?.date}
                            </span>
                            <span className="text-xs text-tx-ter">
                                {data.orderTrend[data.orderTrend.length - 1]?.date}
                            </span>
                        </div>
                    </SotaGlassCard>
                )}

                {/* ── Top Products ─────────────────────────────────── */}
                {data.topProducts.length > 0 && (
                    <SotaGlassCard className="p-5">
                        <h3 className="text-sm font-semibold text-tx-sec mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4" /> Productos más vistos
                        </h3>
                        <div className="space-y-2">
                            {data.topProducts.slice(0, 5).map((product, idx) => {
                                const maxViews = data.topProducts[0]?.views || 1
                                const widthPct = (product.views / maxViews) * 100
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-xs text-tx-ter w-4 text-right font-mono">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-tx-pri font-medium truncate max-w-[200px]">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs text-tx-sec font-mono">
                                                    {product.views} vistas
                                                </span>
                                            </div>
                                            <div className="h-1 bg-sf-ter rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-brand/80 to-brand rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${widthPct}%` }}
                                                    transition={{ delay: idx * 0.05, duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </SotaGlassCard>
                )}
            </div>
        </PageEntrance>
    )
}

// ── Sub-components ────────────────────────────────────────────────────

function KPICard({
    icon,
    label,
    value,
    subtext,
    trend,
    color,
}: {
    icon: React.ReactNode
    label: string
    value: string
    subtext?: string
    trend?: number | null
    color: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
    const colorMap = {
        emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/20',
        blue: 'from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/20',
        purple: 'from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/20',
        amber: 'from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/20',
    }

    const iconColors = {
        emerald: 'bg-emerald-500/15 text-emerald-500',
        blue: 'bg-blue-500/15 text-blue-500',
        purple: 'bg-purple-500/15 text-purple-500',
        amber: 'bg-amber-500/15 text-amber-500',
    }

    return (
        <motion.div
            className={`rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-4`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${iconColors[color]}`}>
                    {icon}
                </div>
                {trend != null && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${
                        trend >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-tx-pri">{value}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-tx-sec">{label}</p>
                {subtext && <p className="text-xs text-tx-ter">{subtext}</p>}
            </div>
        </motion.div>
    )
}
