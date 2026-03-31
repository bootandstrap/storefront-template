'use client'

/**
 * PanelStatGrid — Responsive grid layout for StatCards
 *
 * Wraps StatCard components in an automatically responsive grid.
 * Supports 2-6 columns with animation stagger.
 *
 * Usage:
 *   <PanelStatGrid>
 *     <StatCard label="Revenue" value="€1,234" icon={<DollarSign />} />
 *     <StatCard label="Orders" value="56" icon={<ShoppingBag />} />
 *   </PanelStatGrid>
 */

import type { ReactNode } from 'react'

interface PanelStatGridProps {
    children: ReactNode
    /** Number of columns at the widest breakpoint (default: auto based on children count) */
    columns?: 2 | 3 | 4 | 5 | 6
    /** Additional className */
    className?: string
}

const columnClasses: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

export default function PanelStatGrid({
    children,
    columns,
    className = '',
}: PanelStatGridProps) {
    // Auto-determine columns based on children count
    const childCount = Array.isArray(children) ? children.filter(Boolean).length : 1
    const cols = columns || Math.min(Math.max(childCount, 2), 4)
    const gridClass = columnClasses[cols] || columnClasses[4]

    return (
        <div className={`grid ${gridClass} gap-4 ${className}`}>
            {children}
        </div>
    )
}
