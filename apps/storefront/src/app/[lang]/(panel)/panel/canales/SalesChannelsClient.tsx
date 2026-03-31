'use client'

/**
 * Sales Channels Client — Owner Panel (SOTA)
 *
 * Features:
 * - Channel cards with activation toggles
 * - Revenue comparison per channel
 * - Performance metrics with animated bars
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShoppingCart, Globe, Smartphone, Store, MessageCircle,
    TrendingUp, DollarSign, Users, BarChart3,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

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
// Demo Data
// ---------------------------------------------------------------------------

const CHANNELS = [
    {
        id: 'web',
        name: 'Tienda Web',
        description: 'Tu tienda online principal',
        icon: Globe,
        color: '#3b82f6',
        active: true,
        revenue: 4850,
        orders: 62,
        conversion: 3.2,
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Pedidos vía WhatsApp',
        icon: MessageCircle,
        color: '#25D366',
        active: true,
        revenue: 2340,
        orders: 34,
        conversion: 8.5,
    },
    {
        id: 'pos',
        name: 'Punto de Venta',
        description: 'Ventas presenciales con POS',
        icon: Store,
        color: '#8b5cf6',
        active: false,
        revenue: 0,
        orders: 0,
        conversion: 0,
    },
    {
        id: 'mobile',
        name: 'App Móvil',
        description: 'Aplicación móvil nativa',
        icon: Smartphone,
        color: '#f59e0b',
        active: false,
        revenue: 0,
        orders: 0,
        conversion: 0,
    },
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'channels' | 'performance' | 'settings'

export default function SalesChannelsClient({ labels, lang }: { labels: Labels; lang: string }) {
    const [activeTab, setActiveTab] = useState<TabId>('channels')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'channels', label: labels.tabChannels },
        { id: 'performance', label: labels.tabPerformance },
        { id: 'settings', label: labels.tabSettings },
    ]

    const activeChannels = CHANNELS.filter(c => c.active).length
    const totalRevenue = CHANNELS.reduce((sum, c) => sum + c.revenue, 0)
    const maxRevenue = Math.max(...CHANNELS.map(c => c.revenue), 1)

    return (
        <PageEntrance>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label={labels.activeChannels}
                    value={`${activeChannels}/${CHANNELS.length}`}
                    icon={<ShoppingCart className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.totalRevenue}
                    value={`CHF ${totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.conversionRate}
                    value="4.8%"
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
                        <ListStagger>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CHANNELS.map((channel) => {
                                    const Icon = channel.icon
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
                                                            <p className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                                {channel.name}
                                                            </p>
                                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                                {channel.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                                        channel.active ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                                    }`}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                            channel.active ? 'translate-x-4' : 'translate-x-0.5'
                                                        }`} />
                                                    </div>
                                                </div>

                                                {channel.active && (
                                                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-gray-100,#f3f4f6)]">
                                                        <div className="text-center">
                                                            <p className="text-lg font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                {channel.orders}
                                                            </p>
                                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">Pedidos</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-lg font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                CHF {channel.revenue.toLocaleString()}
                                                            </p>
                                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">Ingresos</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-lg font-bold text-[var(--color-gray-800,#1f2937)]">
                                                                {channel.conversion}%
                                                            </p>
                                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">Conversión</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {!channel.active && (
                                                    <div className="pt-4 border-t border-[var(--color-gray-100,#f3f4f6)]">
                                                        <button
                                                            className="w-full py-2 text-xs font-medium rounded-lg border border-[var(--color-gray-200,#e5e7eb)] text-[var(--color-gray-600,#4b5563)] hover:bg-[var(--color-gray-50,#f9fafb)] transition-colors"
                                                        >
                                                            Activar canal
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        </StaggerItem>
                                    )
                                })}
                            </div>
                        </ListStagger>
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

                            <ListStagger>
                                {CHANNELS.filter(c => c.active).map((channel) => {
                                    const Icon = channel.icon
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
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--color-gray-800,#1f2937)]">
                                                        CHF {channel.revenue.toLocaleString()}
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

                            {/* Inactive channels notice */}
                            {CHANNELS.some(c => !c.active) && (
                                <div className="mt-4 p-4 bg-[var(--color-gray-50,#f9fafb)] rounded-xl">
                                    <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                        {CHANNELS.filter(c => !c.active).length} canales inactivos no incluidos en esta vista
                                    </p>
                                </div>
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
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-4">
                                {labels.tabSettings}
                            </h3>
                            <div className="space-y-1">
                                {[
                                    { label: 'Sincronizar inventario entre canales', desc: 'Los productos se comparten en todos los canales activos', enabled: true },
                                    { label: 'Precios unificados', desc: 'Mismo precio en todos los canales', enabled: true },
                                    { label: 'Promociones multi-canal', desc: 'Las promociones aplican en todos los canales', enabled: false },
                                ].map((setting, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                                {setting.label}
                                            </p>
                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                {setting.desc}
                                            </p>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                                            setting.enabled ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                        }`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                setting.enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
