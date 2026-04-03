'use client'

/**
 * CRM Client — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - PageEntrance + ListStagger animations
 * - StatCard for summary metrics (replaces hand-rolled inline cards)
 * - Animated segment filter tabs with motion indicator
 * - Animated empty state + search "no results"
 * - Usage meter for plan limit
 * - Feature action cards with hover animations
 */

import { useState, useTransition } from 'react'
import PanelBadge from '@/components/panel/PanelBadge'
import { Search, Download, Users, Tag, Lock, Loader2, UserCheck, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'

import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'

import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import ModuleConfigSection, { type ConfigFieldDef } from '@/components/panel/ModuleConfigSection'
import { exportCrmCsv } from './actions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_30_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CRMSegments {
    total: number
    withOrders: number
    recent: number
}

interface CustomerRow {
    id: string
    email: string
    firstName: string
    lastName: string
    orderCount: number
    createdAt: string
}

interface Labels {
    title: string
    subtitle: string
    totalContacts: string
    withOrders: string
    newLast30d: string
    usageOf: string
    segmentation: string
    segmentationDesc: string
    exportContacts: string
    exportDesc: string
    comingSoon: string
    noData: string
    contactHeader: string
    emailHeader: string
    ordersHeader: string
    joinedHeader: string
    searchPlaceholder: string
    downloading: string
    exportSuccess: string
    allContacts: string
}

interface Props {
    segments: CRMSegments
    totalCustomers: number
    maxContacts: number
    enableSegmentation: boolean
    enableExport: boolean
    customers: CustomerRow[]
    lang: string
    labels: Labels
    crmConfig?: Record<string, unknown>
}

type Segment = 'all' | 'withOrders' | 'recent'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMClient({
    segments,
    totalCustomers,
    maxContacts,
    enableSegmentation,
    enableExport,
    customers,
    lang,
    labels,
    crmConfig,
}: Props) {
    const crmConfigFields: ConfigFieldDef[] = [
        { key: 'crm_auto_tag_customers', label: 'Auto-tag new customers', type: 'toggle' },
        { key: 'crm_new_customer_tag', label: 'Default tag for new customers', type: 'text', placeholder: 'e.g. new-lead' },
        { key: 'crm_notify_new_contact', label: 'Notify on new contact', type: 'toggle' },
        { key: 'crm_export_format', label: 'Export format', type: 'select', options: [
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'Excel (XLSX)' },
            { value: 'json', label: 'JSON' },
        ] },
    ]
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSegment, setActiveSegment] = useState<Segment>('all')
    const [isExporting, startExport] = useTransition()
    const usagePercent = maxContacts > 0 ? Math.min((totalCustomers / maxContacts) * 100, 100) : 0

    const filteredCustomers = customers.filter(c => {
        if (activeSegment === 'withOrders' && c.orderCount === 0) return false
        if (activeSegment === 'recent' && new Date(c.createdAt) <= DAYS_30_AGO) return false
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            c.email.toLowerCase().includes(q) ||
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q)
        )
    })

    const handleExport = () => {
        startExport(async () => {
            const result = await exportCrmCsv()
            if (result.error) return
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.filename
            a.click()
            URL.revokeObjectURL(url)
        })
    }

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(
                lang === 'es' ? 'es-ES' : lang,
                { day: 'numeric', month: 'short', year: 'numeric' }
            )
        } catch {
            return iso.slice(0, 10)
        }
    }

    const segmentTabs: { key: Segment; label: string; count: number }[] = [
        { key: 'all', label: labels.allContacts, count: segments.total },
        { key: 'withOrders', label: labels.withOrders, count: segments.withOrders },
        { key: 'recent', label: labels.newLast30d, count: segments.recent },
    ]

    // Full empty state
    if (segments.total === 0) {
        return (
            <PageEntrance className="space-y-5">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Users className="w-8 h-8 text-tx-muted" />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {labels.noData}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed">
                            {labels.subtitle}
                        </p>
                    </div>
                </motion.div>
            </PageEntrance>
        )
    }

    return (
        <PageEntrance className="space-y-8">

            <SotaBentoGrid>
                {/* ── Summary Stats ── */}
                <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                    <SotaMetric
                        label={labels.totalContacts}
                        value={segments.total.toLocaleString()}
                        icon={<Users className="w-5 h-5" />}
                        glowColor="blue"
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                    <SotaMetric
                        label={labels.withOrders}
                        value={segments.withOrders.toLocaleString()}
                        icon={<UserCheck className="w-5 h-5" />}
                        glowColor="emerald"
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                    <SotaMetric
                        label={labels.newLast30d}
                        value={segments.recent.toLocaleString()}
                        icon={<UserPlus className="w-5 h-5" />}
                        glowColor="gold"
                    />
                </SotaBentoItem>

                {/* Plan usage bar */}
                {maxContacts > 0 && (
                    <SotaBentoItem colSpan={{ base: 12 }}>
                        <SotaGlassCard glowColor="purple">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-tx">
                                    {labels.usageOf}
                                </span>
                                <span className="text-sm font-bold text-tx">
                                    {totalCustomers} / {maxContacts}
                                </span>
                            </div>
                            <div className="h-2.5 bg-sf-2/50 rounded-full overflow-hidden inset-shadow-sm">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${usagePercent}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                                    className={`h-full rounded-full transition-all duration-1000 ${usagePercent > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                            usagePercent > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-brand to-brand-light'
                                        }`}
                                />
                            </div>
                        </SotaGlassCard>
                    </SotaBentoItem>
                )}

                {/* Contact list with toolbar */}
                {customers.length > 0 && (
                    <SotaBentoItem colSpan={{ base: 12 }}>
                        <SotaGlassCard overflowHidden glowColor="brand">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder={labels.searchPlaceholder}
                                        className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-sf-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all placeholder:text-tx-muted border border-border"
                                    />
                                </div>
                                {enableSegmentation && (
                                    <div className="flex items-center gap-1 p-1 bg-sf-subtle rounded-xl border border-border">
                                        {segmentTabs.map(seg => (
                                            <button
                                                key={seg.key}
                                                onClick={() => setActiveSegment(seg.key)}
                                                aria-pressed={activeSegment === seg.key}
                                                className={`relative px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                                    activeSegment === seg.key
                                                        ? 'text-brand'
                                                        : 'text-tx-muted hover:text-tx-sec'
                                                }`}
                                            >
                                                {activeSegment === seg.key && (
                                                    <motion.div
                                                        layoutId="crm-segment-indicator"
                                                        className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                    />
                                                )}
                                                <span className="relative z-10">
                                                    {seg.label}
                                                    <span className="ml-1 opacity-50">({seg.count})</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto -mx-6">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-sf-2 bg-sf-subtle/50">
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted/70">
                                                {labels.contactHeader}
                                            </th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted/70 hidden sm:table-cell">
                                                {labels.emailHeader}
                                            </th>
                                            <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted/70">
                                                {labels.ordersHeader}
                                            </th>
                                            <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted/70 hidden md:table-cell">
                                                {labels.joinedHeader}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {filteredCustomers.map((c, i) => (
                                            <motion.tr
                                                key={c.id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className="hover:bg-glass/50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {(c.firstName?.[0] || c.email[0] || '?').toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-tx font-medium truncate">
                                                                {c.firstName || c.lastName
                                                                    ? `${c.firstName} ${c.lastName}`.trim()
                                                                    : c.email.split('@')[0]}
                                                            </p>
                                                            <p className="text-tx-muted text-xs truncate sm:hidden mt-0.5">
                                                                {c.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-tx-muted hidden sm:table-cell">
                                                    {c.email}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {c.orderCount > 0 ? (
                                                        <PanelBadge variant="success" size="sm">
                                                            {c.orderCount}
                                                        </PanelBadge>
                                                    ) : (
                                                        <span className="text-tx-muted/50 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-tx-muted text-xs hidden md:table-cell tabular-nums">
                                                    {formatDate(c.createdAt)}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredCustomers.length === 0 && searchQuery && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="px-6 py-12 text-center text-tx-muted text-sm bg-sf-subtle/30"
                                    >
                                        No contacts matching &quot;{searchQuery}&quot;
                                    </motion.div>
                                )}
                            </div>
                        </SotaGlassCard>
                    </SotaBentoItem>
                )}

                {/* CRM Actions — Feature cards */}
                <SotaBentoItem colSpan={{ base: 12, sm: 6 }}>
                    <SotaGlassCard
                        glowColor={enableSegmentation ? "emerald" : "none"}
                        className={`h-full transition-shadow hover:shadow-xl hover:-translate-y-0.5 duration-300 ${!enableSegmentation ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-tx">
                                    {labels.segmentation}
                                </h3>
                                <p className="text-sm text-tx-muted mt-1 leading-relaxed">
                                    {labels.segmentationDesc}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            {enableSegmentation ? (
                                <PanelBadge variant="info" size="sm">
                                    {labels.comingSoon}
                                </PanelBadge>
                            ) : (
                                <PanelBadge variant="neutral" size="sm">
                                    <Lock className="w-3.5 h-3.5 mr-1" /> {labels.comingSoon}
                                </PanelBadge>
                            )}
                        </div>
                    </SotaGlassCard>
                </SotaBentoItem>

                <SotaBentoItem colSpan={{ base: 12, sm: 6 }}>
                    <SotaGlassCard
                        glowColor={enableExport ? "blue" : "none"}
                        className={`h-full transition-shadow hover:shadow-xl hover:-translate-y-0.5 duration-300 ${!enableExport ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-tx">
                                    {labels.exportContacts}
                                </h3>
                                <p className="text-sm text-tx-muted mt-1 leading-relaxed">
                                    {labels.exportDesc}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6">
                            {enableExport ? (
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    aria-label={labels.exportContacts}
                                    className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm min-h-[44px] px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                                >
                                    {isExporting
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Download className="w-4 h-4" />
                                    }
                                    {isExporting ? labels.downloading : labels.exportContacts}
                                </button>
                            ) : (
                                <PanelBadge variant="neutral" size="sm">
                                    <Lock className="w-3.5 h-3.5 mr-1" /> {labels.comingSoon}
                                </PanelBadge>
                            )}
                        </div>
                    </SotaGlassCard>
                </SotaBentoItem>

            </SotaBentoGrid>
            {/* Module Config Section */}
            {crmConfig && (
                <ModuleConfigSection
                    fields={crmConfigFields}
                    initialValues={crmConfig!}
                    title="CRM Settings"
                    collapsible
                />
            )}
        </PageEntrance>
    )
}
