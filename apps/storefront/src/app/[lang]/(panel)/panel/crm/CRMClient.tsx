'use client'

import { useState, useTransition } from 'react'
import { Search, Download, Users, Tag, Lock, Loader2 } from 'lucide-react'
import { exportCrmCsv } from './actions'

// Module-level constant — computed once at import time, not during render
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
}

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
}: Props) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSegment, setActiveSegment] = useState<'all' | 'withOrders' | 'recent'>('all')
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

    return (
        <div className="space-y-6 max-w-5xl">

            {/* ── Summary Stats ─────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: labels.totalContacts, value: segments.total, highlight: false },
                    { label: labels.withOrders, value: segments.withOrders, highlight: false },
                    { label: labels.newLast30d, value: segments.recent, highlight: true },
                ].map(stat => (
                    <div
                        key={stat.label}
                        className="bg-surface-0 border border-surface-2 rounded-xl p-5"
                    >
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                            {stat.label}
                        </p>
                        <p className={`text-3xl font-bold font-display ${stat.highlight ? 'text-primary' : 'text-text-primary'}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Plan usage ────────────────────────────────── */}
            {maxContacts > 0 && (
                <div className="bg-surface-0 border border-surface-2 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">
                            {labels.usageOf}
                        </span>
                        <span className="text-xs font-semibold text-text-primary">
                            {totalCustomers} / {maxContacts}
                        </span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${usagePercent > 90 ? 'bg-red-500' :
                                    usagePercent > 70 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Contact List ──────────────────────────────── */}
            {customers.length > 0 && (
                <div className="space-y-3">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={labels.searchPlaceholder}
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-0 border border-surface-2 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-muted"
                            />
                        </div>
                        {enableSegmentation && (
                            <div className="flex items-center gap-1 p-1 bg-surface-1 rounded-lg border border-surface-2">
                                {[
                                    { key: 'all' as const, label: labels.allContacts, count: segments.total },
                                    { key: 'withOrders' as const, label: labels.withOrders, count: segments.withOrders },
                                    { key: 'recent' as const, label: labels.newLast30d, count: segments.recent },
                                ].map(seg => (
                                    <button
                                        key={seg.key}
                                        onClick={() => setActiveSegment(seg.key)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${activeSegment === seg.key
                                                ? 'bg-surface-0 text-text-primary shadow-sm'
                                                : 'text-text-muted hover:text-text-secondary'
                                            }`}
                                    >
                                        {seg.label}
                                        <span className="ml-1 opacity-50">({seg.count})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-surface-0 border border-surface-2 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-surface-2 bg-surface-1/50">
                                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                            {labels.contactHeader}
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted hidden sm:table-cell">
                                            {labels.emailHeader}
                                        </th>
                                        <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                            {labels.ordersHeader}
                                        </th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted hidden md:table-cell">
                                            {labels.joinedHeader}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-2/60">
                                    {filteredCustomers.map(c => (
                                        <tr key={c.id} className="hover:bg-surface-1/40 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-primary text-xs font-semibold flex-shrink-0">
                                                        {(c.firstName?.[0] || c.email[0] || '?').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-text-primary font-medium truncate">
                                                            {c.firstName || c.lastName
                                                                ? `${c.firstName} ${c.lastName}`.trim()
                                                                : c.email.split('@')[0]}
                                                        </p>
                                                        <p className="text-text-muted text-xs truncate sm:hidden mt-0.5">
                                                            {c.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-text-muted hidden sm:table-cell">
                                                {c.email}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {c.orderCount > 0 ? (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400">
                                                        {c.orderCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-text-muted text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right text-text-muted text-xs hidden md:table-cell">
                                                {new Date(c.createdAt).toLocaleDateString(
                                                    lang === 'es' ? 'es-ES' : lang,
                                                    { day: 'numeric', month: 'short', year: 'numeric' }
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredCustomers.length === 0 && searchQuery && (
                                <div className="px-5 py-10 text-center text-text-muted text-sm">
                                    No contacts matching &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CRM Actions ───────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segmentation */}
                <div className={`bg-surface-0 border border-surface-2 rounded-xl p-5 ${!enableSegmentation ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center text-text-muted flex-shrink-0">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">
                                {labels.segmentation}
                            </h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                {labels.segmentationDesc}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {enableSegmentation ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {labels.comingSoon}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-text-muted">
                                <Lock className="w-3 h-3" /> {labels.comingSoon}
                            </span>
                        )}
                    </div>
                </div>

                {/* Export */}
                <div className={`bg-surface-0 border border-surface-2 rounded-xl p-5 ${!enableExport ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center text-text-muted flex-shrink-0">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">
                                {labels.exportContacts}
                            </h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                {labels.exportDesc}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        {enableExport ? (
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-text-primary text-surface-0 hover:bg-primary transition-colors disabled:opacity-50"
                            >
                                {isExporting
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Download className="w-3 h-3" />
                                }
                                {isExporting ? labels.downloading : labels.exportContacts}
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-text-muted">
                                <Lock className="w-3 h-3" /> {labels.comingSoon}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Empty state ───────────────────────────────── */}
            {segments.total === 0 && (
                <div className="bg-surface-0 border border-surface-2 rounded-xl p-12 text-center">
                    <Users className="w-8 h-8 text-text-muted mx-auto mb-4" strokeWidth={1.5} />
                    <h3 className="text-base font-semibold text-text-primary mb-1">
                        {labels.noData}
                    </h3>
                    <p className="text-sm text-text-muted">
                        {labels.subtitle}
                    </p>
                </div>
            )}
        </div>
    )
}
