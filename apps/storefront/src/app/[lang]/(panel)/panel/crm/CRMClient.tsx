'use client'

import { useState, useTransition } from 'react'
import { Search, Mail, ShoppingBag, Calendar, Download } from 'lucide-react'
import { exportCrmCsv } from './actions'

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
        // Segment filter
        if (activeSegment === 'withOrders' && c.orderCount === 0) return false
        if (activeSegment === 'recent') {
            const days30Ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            if (new Date(c.createdAt) <= days30Ago) return false
        }
        // Search filter
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
            // Trigger download
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {labels.title}
                </h1>
                <p className="text-text-muted mt-1">{labels.subtitle}</p>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.total}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.totalContacts}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.withOrders}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.withOrders}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.recent}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.newLast30d}</p>
                </div>
            </div>

            {/* Plan usage */}
            {maxContacts > 0 && (
                <div className="glass rounded-2xl p-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-secondary font-medium">
                            {labels.usageOf}
                        </span>
                        <span className="text-text-muted">
                            {totalCustomers} / {maxContacts}
                        </span>
                    </div>
                    <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${usagePercent > 90 ? 'bg-red-500' :
                                usagePercent > 70 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Contact List */}
            {customers.length > 0 && (
                <div className="glass rounded-2xl overflow-hidden">
                    {/* Search + Segment Filters */}
                    <div className="p-4 border-b border-surface-3 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={labels.searchPlaceholder}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-3 bg-white/5 text-text-primary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-text-muted/50"
                            />
                        </div>
                        {enableSegmentation && (
                            <div className="flex gap-2">
                                {[
                                    { key: 'all' as const, label: labels.allContacts, count: segments.total },
                                    { key: 'withOrders' as const, label: labels.withOrders, count: segments.withOrders },
                                    { key: 'recent' as const, label: labels.newLast30d, count: segments.recent },
                                ].map(seg => (
                                    <button
                                        key={seg.key}
                                        onClick={() => setActiveSegment(seg.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeSegment === seg.key
                                                ? 'bg-primary text-white'
                                                : 'bg-surface-2/50 text-text-secondary hover:bg-surface-2'
                                            }`}
                                    >
                                        {seg.label} ({seg.count})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customer table — G3 fix: i18n headers */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-3 text-text-muted">
                                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">
                                        {labels.contactHeader}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                                        <Mail className="w-3.5 h-3.5 inline-block mr-1" />
                                        {labels.emailHeader}
                                    </th>
                                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider">
                                        <ShoppingBag className="w-3.5 h-3.5 inline-block mr-1" />
                                        {labels.ordersHeader}
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                                        <Calendar className="w-3.5 h-3.5 inline-block mr-1" />
                                        {labels.joinedHeader}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-2">
                                {filteredCustomers.map((c) => (
                                    <tr key={c.id} className="hover:bg-surface-1/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                                    {(c.firstName?.[0] || c.email[0] || '?').toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-text-primary font-medium truncate">
                                                        {c.firstName || c.lastName
                                                            ? `${c.firstName} ${c.lastName}`.trim()
                                                            : c.email.split('@')[0]}
                                                    </p>
                                                    <p className="text-text-muted text-xs truncate sm:hidden">
                                                        {c.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                                            {c.email}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${c.orderCount > 0
                                                ? 'bg-green-500/10 text-green-600'
                                                : 'bg-surface-2 text-text-muted'
                                                }`}>
                                                {c.orderCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">
                                            {new Date(c.createdAt).toLocaleDateString(
                                                lang === 'es' ? 'es-ES' : lang,
                                                { day: 'numeric', month: 'short' }
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredCustomers.length === 0 && searchQuery && (
                            <div className="p-8 text-center text-text-muted text-sm">
                                No contacts matching &quot;{searchQuery}&quot;
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CRM Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segmentation */}
                <div className={`glass rounded-2xl p-6 ${!enableSegmentation ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🏷️</span>
                        <h3 className="text-lg font-bold font-display text-text-primary">
                            {labels.segmentation}
                        </h3>
                    </div>
                    <p className="text-sm text-text-muted mb-4">{labels.segmentationDesc}</p>
                    {enableSegmentation ? (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {labels.comingSoon}
                        </span>
                    ) : (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-text-muted">
                            🔒 {labels.comingSoon}
                        </span>
                    )}
                </div>

                {/* Export — B3 fix: functional button when flag enabled */}
                <div className={`glass rounded-2xl p-6 ${!enableExport ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">📤</span>
                        <h3 className="text-lg font-bold font-display text-text-primary">
                            {labels.exportContacts}
                        </h3>
                    </div>
                    <p className="text-sm text-text-muted mb-4">{labels.exportDesc}</p>
                    {enableExport ? (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? labels.downloading : labels.exportContacts}
                        </button>
                    ) : (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-text-muted">
                            🔒 {labels.comingSoon}
                        </span>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {segments.total === 0 && (
                <div className="glass rounded-2xl p-12 text-center">
                    <span className="text-5xl mb-4 block">📁</span>
                    <p className="text-text-muted text-lg">{labels.noData}</p>
                </div>
            )}
        </div>
    )
}
