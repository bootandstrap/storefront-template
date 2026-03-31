'use client'

import { useState, useMemo } from 'react'
import { Filter, X, Calendar, ChevronDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

interface OrderFiltersProps {
    onFilterChange: (filters: OrderFilterState) => void
    activeFilters: OrderFilterState
}

export interface OrderFilterState {
    status: string
    dateFrom: string
    dateTo: string
}

export const EMPTY_FILTERS: OrderFilterState = {
    status: '',
    dateFrom: '',
    dateTo: '',
}

const STATUS_OPTIONS = [
    { value: '', key: 'order.allStatuses' },
    { value: 'pending', key: 'order.pending' },
    { value: 'processing', key: 'order.processing' },
    { value: 'shipped', key: 'order.shipped' },
    { value: 'completed', key: 'order.delivered' },
    { value: 'canceled', key: 'order.cancelled' },
]

export default function OrderFilters({ onFilterChange, activeFilters }: OrderFiltersProps) {
    const { t } = useI18n()
    const [isExpanded, setIsExpanded] = useState(false)

    const hasActiveFilters = useMemo(
        () => activeFilters.status || activeFilters.dateFrom || activeFilters.dateTo,
        [activeFilters]
    )

    const updateFilter = (key: keyof OrderFilterState, value: string) => {
        onFilterChange({ ...activeFilters, [key]: value })
    }

    const clearAll = () => {
        onFilterChange(EMPTY_FILTERS)
    }

    return (
        <div className="space-y-3">
            {/* Toggle button */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-all ${
                        isExpanded || hasActiveFilters
                            ? 'bg-brand-subtle border-brand text-brand'
                            : 'border-sf-3 text-tx-sec hover:border-brand'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    {t('order.filters') || 'Filters'}
                    {hasActiveFilters && (
                        <span className="w-2 h-2 rounded-full bg-brand" />
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-tx-muted hover:text-brand transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        {t('product.clearFilters') || 'Clear all'}
                    </button>
                )}
            </div>

            {/* Filter panel */}
            {isExpanded && (
                <div className="glass rounded-xl p-4 flex flex-wrap items-end gap-4 animate-slide-up">
                    {/* Status filter */}
                    <div className="min-w-[140px]">
                        <label className="text-xs text-tx-muted font-medium mb-1.5 block">
                            {t('order.status') || 'Status'}
                        </label>
                        <select
                            value={activeFilters.status}
                            onChange={(e) => updateFilter('status', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {t(opt.key) || opt.value || 'All'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date from */}
                    <div className="min-w-[140px]">
                        <label className="text-xs text-tx-muted font-medium mb-1.5 block flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t('order.dateFrom') || 'From'}
                        </label>
                        <input
                            type="date"
                            value={activeFilters.dateFrom}
                            onChange={(e) => updateFilter('dateFrom', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>

                    {/* Date to */}
                    <div className="min-w-[140px]">
                        <label className="text-xs text-tx-muted font-medium mb-1.5 block flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t('order.dateTo') || 'To'}
                        </label>
                        <input
                            type="date"
                            value={activeFilters.dateTo}
                            onChange={(e) => updateFilter('dateTo', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
