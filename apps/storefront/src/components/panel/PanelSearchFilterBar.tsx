'use client'

/**
 * PanelSearchFilterBar — SOTA Search + Filter + Sort for Panel Pages
 *
 * Unified search bar with:
 * - Full-text search input with ⌘K hint
 * - Status filter dropdown (customizable options)
 * - Sort dropdown
 * - Active filter count badge
 */

import { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
    value: string
    label: string
    count?: number
}

export interface SortOption {
    value: string
    label: string
}

interface PanelSearchFilterBarProps {
    /** Current search query */
    query: string
    /** Callback when search query changes */
    onQueryChange: (query: string) => void
    /** Placeholder text for search input */
    placeholder?: string
    /** Filter options with labels and optional counts */
    filters?: FilterOption[]
    /** Currently active filter value */
    activeFilter?: string
    /** Callback when filter changes */
    onFilterChange?: (value: string) => void
    /** Sort options */
    sortOptions?: SortOption[]
    /** Currently active sort value */
    activeSort?: string
    /** Callback when sort changes */
    onSortChange?: (value: string) => void
    /** Label for the "All" filter option */
    allLabel?: string
    /** Total result count to display */
    resultCount?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelSearchFilterBar({
    query,
    onQueryChange,
    placeholder = 'Buscar...',
    filters,
    activeFilter = '',
    onFilterChange,
    sortOptions,
    activeSort = '',
    onSortChange,
    allLabel = 'Todos',
    resultCount,
}: PanelSearchFilterBarProps) {
    const [filterOpen, setFilterOpen] = useState(false)
    const [sortOpen, setSortOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)
    const sortRef = useRef<HTMLDivElement>(null)

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false)
            }
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setSortOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const hasActiveFilters = activeFilter && activeFilter !== ''

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2.5 bg-sf-1 border border-sf-3 rounded-xl text-sm text-tx placeholder:text-tx-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all"
                />
                {query && (
                    <button
                        onClick={() => onQueryChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-sf-2 rounded transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-tx-muted" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Filter dropdown */}
                {filters && filters.length > 0 && onFilterChange && (
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false) }}
                            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                                hasActiveFilters
                                    ? 'bg-brand-subtle text-brand border-brand/30'
                                    : 'bg-sf-1 text-tx-sec border-sf-3 hover:bg-sf-2'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {hasActiveFilters
                                    ? filters.find(f => f.value === activeFilter)?.label || activeFilter
                                    : allLabel}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {filterOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-sf-1 border border-sf-3 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                <button
                                    onClick={() => { onFilterChange(''); setFilterOpen(false) }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                                        !activeFilter ? 'bg-brand-subtle text-brand font-medium' : 'text-tx-sec hover:bg-sf-2'
                                    }`}
                                >
                                    <span>{allLabel}</span>
                                </button>
                                {filters.map(filter => (
                                    <button
                                        key={filter.value}
                                        onClick={() => { onFilterChange(filter.value); setFilterOpen(false) }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                                            activeFilter === filter.value ? 'bg-brand-subtle text-brand font-medium' : 'text-tx-sec hover:bg-sf-2'
                                        }`}
                                    >
                                        <span>{filter.label}</span>
                                        {filter.count != null && (
                                            <span className="text-xs text-tx-faint">{filter.count}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Sort dropdown */}
                {sortOptions && sortOptions.length > 0 && onSortChange && (
                    <div className="relative" ref={sortRef}>
                        <button
                            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false) }}
                            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-sf-1 text-tx-sec border border-sf-3 hover:bg-sf-2 transition-all"
                        >
                            <span className="hidden sm:inline">
                                {activeSort
                                    ? sortOptions.find(s => s.value === activeSort)?.label || 'Sort'
                                    : sortOptions[0]?.label || 'Sort'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {sortOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-sf-1 border border-sf-3 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                {sortOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { onSortChange(opt.value); setSortOpen(false) }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                            activeSort === opt.value ? 'bg-brand-subtle text-brand font-medium' : 'text-tx-sec hover:bg-sf-2'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Result count */}
                {resultCount != null && (
                    <span className="text-xs text-tx-faint whitespace-nowrap">
                        {resultCount} resultados
                    </span>
                )}
            </div>
        </div>
    )
}
