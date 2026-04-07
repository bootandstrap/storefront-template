'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, X, Inbox } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmailLogEntry } from '@/lib/email-log'

// Reusing generic Sota badges and styles or creating specific ones for email status
const STATUS_COLORS: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    opened: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    clicked: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    bounced: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

interface Props {
    logsData: { logs: EmailLogEntry[]; count: number }
    queryParams: {
        currentPage: number
        pageSize: number
        status: 'all' | 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed'
        search: string
    }
}

export default function EmailLogsGrid({ logsData, queryParams }: Props) {
    const router = useRouter()
    
    // Controlled state synced with URL via session storage or push
    const [search, setSearch] = useState(queryParams.search)
    const [statusFilter, setStatusFilter] = useState(queryParams.status)
    const [isPending, setIsPending] = useState(false)
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

    // ── Universal Persistence ───────────────────────────────────────────
    useEffect(() => {
        // If arriving with bare URL, parse session storage and restore
        const currentQuery = window.location.search.replace('?', '')
        if (!currentQuery) {
            const savedSearch = sessionStorage.getItem('email_logs_search')
            const savedStatus = sessionStorage.getItem('email_logs_status')
            const savedPage = sessionStorage.getItem('email_logs_page')
            
            if (savedSearch || (savedStatus && savedStatus !== 'all') || (savedPage && savedPage !== '1')) {
                const params = new URLSearchParams()
                if (savedSearch) params.set('q', savedSearch)
                if (savedStatus && savedStatus !== 'all') params.set('status', savedStatus)
                if (savedPage && savedPage !== '1') params.set('page', savedPage)
                
                router.replace(`?${params.toString()}`)
                return
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        // Automatically save meaningful query parameters
        if (searchParams) {
            const currentSearch = searchParams.get('q') || ''
            const currentStatus = searchParams.get('status') || 'all'
            const newPage = searchParams.get('page') || '1'
            sessionStorage.setItem('email_logs_search', currentSearch)
            sessionStorage.setItem('email_logs_status', currentStatus)
            sessionStorage.setItem('email_logs_page', newPage)
        }
    }, [searchParams?.toString()])

    // Apply filters
    const applyFilters = useCallback((newSearch?: string, newStatus?: string, newPage: number = 1) => {
        setIsPending(true)
        const currentSearch = newSearch !== undefined ? newSearch : search
        const currentStatus = newStatus !== undefined ? newStatus : statusFilter
        
        const params = new URLSearchParams()
        if (currentSearch) params.set('q', currentSearch)
        if (currentStatus && currentStatus !== 'all') params.set('status', currentStatus)
        if (newPage > 1) params.set('page', newPage.toString())
        
        router.push(`?${params.toString()}`)
    }, [search, statusFilter, router])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        applyFilters(search, undefined, 1)
    }

    const { logs, count } = logsData
    const totalPages = Math.max(1, Math.ceil(count / queryParams.pageSize))

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-4">
                
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {['all', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setStatusFilter(s as any)
                                applyFilters(undefined, s, 1)
                            }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                statusFilter === s
                                    ? 'bg-brand text-white shadow-md'
                                    : 'text-tx-sec hover:bg-sf-1'
                            }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        placeholder="Search emails..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-sf-3 bg-sf-1 focus:bg-sf-0 focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-sm"
                    />
                    {search && (
                        <button 
                            type="button" 
                            onClick={() => { setSearch(''); applyFilters('', undefined, 1) }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-muted hover:text-tx"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </form>
            </div>

            {/* Grid/Table */}
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden relative">
                {isPending && (
                    <div className="absolute inset-0 bg-sf-0/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                
                {logs.length === 0 ? (
                    <div className="empty-state py-12">
                        <div className="empty-state-icon">
                            <Inbox className="w-8 h-8 text-tx-muted" />
                        </div>
                        <p className="text-tx-font-medium text-tx">No logs found</p>
                        <p className="text-sm text-tx-muted mt-1">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-sf-1/50 border-b border-sf-2 text-tx-muted text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Recipient</th>
                                    <th className="px-6 py-4 font-medium">Subject</th>
                                    <th className="px-6 py-4 font-medium">Type</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sf-2">
                                <AnimatePresence mode="popLayout">
                                    {logs.map((log) => (
                                        <motion.tr 
                                            key={log.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="hover:bg-sf-1/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4 text-tx">{log.recipient}</td>
                                            <td className="px-6 py-4 text-tx-sec max-w-xs truncate">{log.subject}</td>
                                            <td className="px-6 py-4 text-tx-muted">
                                                {log.email_type.replace(/_/g, ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[log.status] || STATUS_COLORS.failed}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-tx-muted whitespace-nowrap text-xs">
                                                {new Date(log.sent_at).toLocaleString(undefined, { 
                                                    month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' 
                                                })}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Pagination */}
                {count > 0 && (
                    <div className="flex items-center justify-between border-t border-sf-2 px-6 py-4 bg-sf-1/30">
                        <p className="text-sm text-tx-muted">
                            Showing <span className="font-medium text-tx">{Math.min(1 + (queryParams.currentPage - 1) * queryParams.pageSize, count)}</span> to <span className="font-medium text-tx">{Math.min(queryParams.currentPage * queryParams.pageSize, count)}</span> of <span className="font-medium text-tx">{count}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => applyFilters(undefined, undefined, queryParams.currentPage - 1)}
                                disabled={queryParams.currentPage <= 1 || isPending}
                                className="p-2 border border-sf-3 rounded-lg text-tx-sec hover:bg-sf-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => applyFilters(undefined, undefined, queryParams.currentPage + 1)}
                                disabled={queryParams.currentPage >= totalPages || isPending}
                                className="p-2 border border-sf-3 rounded-lg text-tx-sec hover:bg-sf-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
