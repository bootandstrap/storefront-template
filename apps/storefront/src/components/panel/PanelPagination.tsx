'use client'

/**
 * PanelPagination — Shared pagination component
 *
 * Replaces duplicated prev/next pagination blocks across
 * Orders, Customers, Products, Catalog panels.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PanelPaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    labels?: {
        previous?: string
        next?: string
    }
}

export default function PanelPagination({
    currentPage,
    totalPages,
    onPageChange,
    labels = {},
}: PanelPaginationProps) {
    if (totalPages <= 1) return null

    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    // Build page numbers to show (max 5 pages visible)
    const pages = buildPageRange(currentPage, totalPages)

    return (
        <div className="flex items-center justify-between pt-2">
            {/* Previous */}
            <button
                onClick={() => canGoPrev && onPageChange(currentPage - 1)}
                disabled={!canGoPrev}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                           text-text-secondary hover:bg-surface-1 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{labels.previous ?? 'Anterior'}</span>
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
                {pages.map((page, idx) => (
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-text-muted text-sm">
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                page === currentPage
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-muted hover:bg-surface-1 hover:text-text-primary'
                            }`}
                        >
                            {page}
                        </button>
                    )
                ))}
            </div>

            {/* Next */}
            <button
                onClick={() => canGoNext && onPageChange(currentPage + 1)}
                disabled={!canGoNext}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                           text-text-secondary hover:bg-surface-1 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <span className="hidden sm:inline">{labels.next ?? 'Siguiente'}</span>
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPageRange(current: number, total: number): (number | '...')[] {
    if (total <= 5) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: (number | '...')[] = []

    if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total)
    } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total)
    } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }

    return pages
}
