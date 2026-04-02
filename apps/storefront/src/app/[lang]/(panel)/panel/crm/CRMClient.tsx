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

import StatCard from '@/components/panel/StatCard'
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
                    className="glass rounded-2xl"
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
        <PageEntrance className="space-y-5">

            {/* Summary Stats — using StatCard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label={labels.totalContacts}
                    value={segments.total}
                    icon={<Users className="w-4 h-4" />}
                    stagger={0}
                />
                <StatCard
                    label={labels.withOrders}
                    value={segments.withOrders}
                    icon={<UserCheck className="w-4 h-4" />}
                    stagger={1}
                />
                <StatCard
                    label={labels.newLast30d}
                    value={segments.recent}
                    icon={<UserPlus className="w-4 h-4" />}
                    variant="hero"
                    stagger={2}
                />
            </div>

            {/* Plan usage bar */}
            {maxContacts > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-2xl px-5 py-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-tx-muted">
                            {labels.usageOf}
                        </span>
                        <span className="text-xs font-semibold text-tx">
                            {totalCustomers} / {maxContacts}
                        </span>
                    </div>
                    <div className="h-1.5 bg-sf-2 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                            className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' :
                                    usagePercent > 70 ? 'bg-amber-500' : 'bg-brand'
                                }`}
                        />
                    </div>
                </motion.div>
            )}

            {/* Contact list with toolbar */}
            {customers.length > 0 && (
                <div className="space-y-3">
                    {/* Toolbar: Search + Segment tabs */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={labels.searchPlaceholder}
                                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] glass rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all placeholder:text-tx-muted"
                            />
                        </div>
                        {enableSegmentation && (
                            <div className="flex items-center gap-1 p-1 glass rounded-xl">
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

                    {/* Table */}
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-sf-2 bg-glass">
                                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted">
                                            {labels.contactHeader}
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted hidden sm:table-cell">
                                            {labels.emailHeader}
                                        </th>
                                        <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted">
                                            {labels.ordersHeader}
                                        </th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-tx-muted hidden md:table-cell">
                                            {labels.joinedHeader}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-2/60">
                                    {filteredCustomers.map((c, i) => (
                                        <motion.tr
                                            key={c.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="hover:bg-glass transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                                            <td className="px-5 py-4 text-tx-muted hidden sm:table-cell">
                                                {c.email}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {c.orderCount > 0 ? (
                                                    <PanelBadge variant="success" size="sm">
                                                        {c.orderCount}
                                                    </PanelBadge>
                                                ) : (
                                                    <span className="text-tx-muted text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right text-tx-muted text-xs hidden md:table-cell">
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
                                    className="px-5 py-10 text-center text-tx-muted text-sm"
                                >
                                    No contacts matching &quot;{searchQuery}&quot;
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CRM Actions — Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segmentation card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -2 }}
                    className={`glass rounded-2xl p-5 transition-shadow hover:shadow-lg ${!enableSegmentation ? 'opacity-60' : ''}`}
                >
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-muted to-brand-subtle flex items-center justify-center text-brand flex-shrink-0">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-tx">
                                {labels.segmentation}
                            </h3>
                            <p className="text-xs text-tx-muted mt-0.5">
                                {labels.segmentationDesc}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {enableSegmentation ? (
                            <PanelBadge variant="info" size="sm">
                                                {labels.comingSoon}
                                            </PanelBadge>
                        ) : (
                            <PanelBadge variant="neutral" size="sm">
                                <Lock className="w-3 h-3" /> {labels.comingSoon}
                            </PanelBadge>
                        )}
                    </div>
                </motion.div>

                {/* Export card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ y: -2 }}
                    className={`glass rounded-2xl p-5 transition-shadow hover:shadow-lg ${!enableExport ? 'opacity-60' : ''}`}
                >
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-muted to-brand-subtle flex items-center justify-center text-brand flex-shrink-0">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-tx">
                                {labels.exportContacts}
                            </h3>
                            <p className="text-xs text-tx-muted mt-0.5">
                                {labels.exportDesc}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        {enableExport ? (
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                aria-label={labels.exportContacts}
                                className="btn btn-primary inline-flex items-center gap-2 text-xs min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            >
                                {isExporting
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Download className="w-3 h-3" />
                                }
                                {isExporting ? labels.downloading : labels.exportContacts}
                            </button>
                        ) : (
                            <PanelBadge variant="neutral" size="sm">
                                <Lock className="w-3 h-3" /> {labels.comingSoon}
                            </PanelBadge>
                        )}
                    </div>
                </motion.div>
            </div>
            {/* Module Config Section */}
            {crmConfig && (
                <ModuleConfigSection
                    fields={crmConfigFields}
                    initialValues={crmConfig}
                    title="CRM Settings"
                    collapsible
                />
            )}
        </PageEntrance>
    )
}
