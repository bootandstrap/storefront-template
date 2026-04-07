'use client'

/**
 * Sales Channels Client — Owner Panel (SOTA)
 *
 * Features:
 * - Real channel cards from Medusa Admin API
 * - Revenue and order metrics from real order data
 * - Performance bars with channel comparison
 * - Settings tab with ModuleConfigSection (saves to config table)
 *
 * All data provided by server (page.tsx → actions.ts → Medusa Admin API)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShoppingCart, Globe, Smartphone, Store, MessageCircle,
    TrendingUp, DollarSign, BarChart3, Package, Hash,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import ModuleConfigSection from '@/components/panel/ModuleConfigSection'
import { getModuleConfigSchema } from '@/lib/registries/module-config-schemas'
import type { SalesChannelsData } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Labels {
    activeChannels: string
    totalRevenue: string
    conversionRate: string
    channelConfig: string
    performance: string
    tabChannels: string
    tabPerformance: string
    tabSettings: string
}

// ---------------------------------------------------------------------------
// Icon resolver — match channel name to icon
// ---------------------------------------------------------------------------

function getChannelIcon(name: string) {
    const lower = name.toLowerCase()
    if (lower.includes('whatsapp')) return MessageCircle
    if (lower.includes('pos') || lower.includes('punto')) return Store
    if (lower.includes('mobile') || lower.includes('app') || lower.includes('móvil')) return Smartphone
    return Globe // Default — web store
}

function getChannelColor(name: string, index: number) {
    const lower = name.toLowerCase()
    if (lower.includes('whatsapp')) return '#25D366'
    if (lower.includes('pos') || lower.includes('punto')) return '#8b5cf6'
    if (lower.includes('mobile') || lower.includes('app')) return '#f59e0b'
    const palette = ['#3b82f6', '#ef4444', '#06b6d4', '#ec4899', '#f97316']
    return palette[index % palette.length]
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'channels' | 'performance' | 'settings'

export default function SalesChannelsClient({
    channelsData: cd,
    labels,
    salesConfig,
}: {
    channelsData: SalesChannelsData
    labels: Labels
    lang: string
    salesConfig?: Record<string, unknown>
}) {
    const salesConfigFields = getModuleConfigSchema('sales_channels')

    const [activeTab, setActiveTab] = useState<TabId>('channels')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'channels', label: labels.tabChannels },
        { id: 'performance', label: labels.tabPerformance },
        { id: 'settings', label: labels.tabSettings },
    ]

    // Build channel display data from real Medusa data
    const channels = cd.channels.map((ch, i) => {
        const metrics = cd.metrics[ch.id]
        const Icon = getChannelIcon(ch.name)
        const color = getChannelColor(ch.name, i)
        const isCurrent = ch.id === cd.currentChannelId

        return {
            id: ch.id,
            name: ch.name,
            description: ch.description || (isCurrent ? 'Tu canal principal' : 'Canal de ventas'),
            Icon,
            color,
            active: !ch.is_disabled,
            isCurrent,
            revenue: metrics?.revenue ? Math.round(metrics.revenue / 100) : 0, // cents → units
            orders: metrics?.orderCount ?? 0,
            currencyCode: (metrics?.currencyCode ?? 'chf').toUpperCase(),
        }
    })

    const activeChannels = channels.filter(c => c.active).length
    const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0)
    const totalOrders = channels.reduce((sum, c) => sum + c.orders, 0)
    const maxRevenue = Math.max(...channels.map(c => c.revenue), 1)
    const currencyCode = channels[0]?.currencyCode ?? 'CHF'

    // Show empty state if no channels from Medusa
    const hasChannels = channels.length > 0

    return (
        <PageEntrance>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label={labels.activeChannels}
                    value={hasChannels ? `${activeChannels}/${channels.length}` : '—'}
                    icon={<ShoppingCart className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.totalRevenue}
                    value={hasChannels ? `${currencyCode} ${totalRevenue.toLocaleString()}` : '—'}
                    icon={<DollarSign className="w-5 h-5" />}
                />
                <StatCard
                    label="Pedidos del mes"
                    value={hasChannels ? totalOrders : '—'}
                    icon={<TrendingUp className="w-5 h-5" />}
                />
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 bg-[var(--color-gray-100,#f3f4f6)] rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === tab.id
                                ? 'text-[var(--color-gray-900,#111827)]'
                                : 'text-[var(--color-gray-500,#6b7280)] hover:text-[var(--color-gray-700,#374151)]'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="channels-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'channels' && (
                    <motion.div
                        key="channels"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {!hasChannels ? (
                            <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-12 text-center">
                                <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-[var(--color-gray-300,#d1d5db)]" />
                                <p className="text-sm text-[var(--color-gray-500,#6b7280)]">
                                    No se encontraron canales de venta en Medusa.
                                </p>
                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)] mt-1">
                                    Los canales se configuran automáticamente durante el despliegue.
                                </p>
                            </div>
                        ) : (
                            <ListStagger>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {channels.map((channel) => {
                                        const Icon = channel.Icon
                                        return (
                                            <StaggerItem key={channel.id}>
                                                <motion.div
                                                    className={`bg-white rounded-2xl border p-6 hover:shadow-md transition-shadow ${
                                                        channel.active
                                                            ? 'border-[var(--color-gray-200,#e5e7eb)]'
                                                            : 'border-[var(--color-gray-200,#e5e7eb)] opacity-60'
                                                    }`}
                                                    whileHover={{ y: -2 }}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                                                style={{ backgroundColor: `${channel.color}15` }}
                                                            >
                                                                <Icon className="w-5 h-5" style={{ color: channel.color }} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                                        {channel.name}
                                                                    </p>
                                                                    {channel.isCurrent && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                                                                            Principal
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                                    {channel.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                            channel.active
                                                                ? 'bg-[var(--color-emerald-50,#ecfdf5)] text-[var(--color-emerald-700,#047857)]'
                                                                : 'bg-[var(--color-gray-100,#f3f4f6)] text-[var(--color-gray-500,#6b7280)]'
                                                        }`}>
                                                            {channel.active ? 'Activo' : 'Desactivado'}
                                                        </span>
                                                    </div>

                                                    {/* Metrics row — real data */}
                                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-gray-100,#f3f4f6)]">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-3.5 h-3.5 text-[var(--color-gray-400,#9ca3af)]" />
                                                            <div>
                                                                <p className="text-lg font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                    {channel.orders}
                                                                </p>
                                                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">Pedidos</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="w-3.5 h-3.5 text-[var(--color-gray-400,#9ca3af)]" />
                                                            <div>
                                                                <p className="text-lg font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                    {channel.currencyCode} {channel.revenue.toLocaleString()}
                                                                </p>
                                                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">Ingresos</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </StaggerItem>
                                        )
                                    })}
                                </div>
                            </ListStagger>
                        )}
                    </motion.div>
                )}

                {activeTab === 'performance' && (
                    <motion.div
                        key="performance"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                    {labels.performance}
                                </h3>
                            </div>

                            {!hasChannels || channels.every(c => c.revenue === 0) ? (
                                <p className="text-sm text-[var(--color-gray-400,#9ca3af)] py-8 text-center">
                                    No hay datos de rendimiento este mes
                                </p>
                            ) : (
                                <ListStagger>
                                    {channels
                                        .filter(c => c.active)
                                        .sort((a, b) => b.revenue - a.revenue)
                                        .map((channel) => {
                                            const Icon = channel.Icon
                                            const widthPct = (channel.revenue / maxRevenue) * 100

                                            return (
                                                <StaggerItem key={channel.id}>
                                                    <div className="mb-5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="w-4 h-4" style={{ color: channel.color }} />
                                                                <span className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                                                    {channel.name}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                                    <Hash className="w-3 h-3" />
                                                                    {channel.orders} pedidos
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                {currencyCode} {channel.revenue.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="h-3 bg-[var(--color-gray-100,#f3f4f6)] rounded-full overflow-hidden">
                                                            <motion.div
                                                                className="h-full rounded-full"
                                                                style={{ backgroundColor: channel.color }}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${widthPct}%` }}
                                                                transition={{ duration: 1, delay: 0.3 }}
                                                            />
                                                        </div>
                                                    </div>
                                                </StaggerItem>
                                            )
                                        })}
                                </ListStagger>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {salesConfig ? (
                            <ModuleConfigSection
                                fields={salesConfigFields}
                                initialValues={salesConfig}
                                title="Sales Channel Settings"
                            />
                        ) : (
                            <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-4">
                                    {labels.tabSettings}
                                </h3>
                                <p className="text-sm text-[var(--color-gray-500,#6b7280)]">No configuration available.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
