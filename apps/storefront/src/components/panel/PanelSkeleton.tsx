'use client'

/**
 * PanelSkeleton — Shimmer loading placeholders for admin panels
 *
 * Components:
 * - Shimmer:           Base shimmer animation block
 * - StatCardSkeleton:  Loading state for StatCard
 * - TableSkeleton:     Loading state for data tables
 * - CardGridSkeleton:  Loading state for card grids
 */

import type { ReactNode } from 'react'

// ─── Base shimmer ───────────────────────────────────────────────────────────

interface ShimmerProps {
    className?: string
}

function Shimmer({ className = '' }: ShimmerProps) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-glass ${className}`}
        />
    )
}

// ─── Stat Card skeleton ─────────────────────────────────────────────────────

export function StatCardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <Shimmer className="h-3 w-20" />
                        <Shimmer className="h-9 w-9 rounded-xl" />
                    </div>
                    <Shimmer className="h-8 w-24" />
                    <Shimmer className="h-3 w-16" />
                </div>
            ))}
        </div>
    )
}

// ─── Table skeleton ─────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 px-5 py-3 bg-glass border-b border-sf-2">
                {Array.from({ length: cols }).map((_, i) => (
                    <Shimmer key={i} className="h-3 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 border-b border-sf-2 last:border-0"
                >
                    <Shimmer className="h-8 w-8 rounded-full flex-shrink-0" />
                    {Array.from({ length: cols - 1 }).map((_, j) => (
                        <Shimmer key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    )
}

// ─── Card grid skeleton ─────────────────────────────────────────────────────

export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
    const gridClass = cols === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

    return (
        <div className={`grid ${gridClass} gap-4`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden">
                    <Shimmer className="aspect-video w-full rounded-none" />
                    <div className="p-4 space-y-2">
                        <Shimmer className="h-4 w-3/4" />
                        <Shimmer className="h-3 w-1/2" />
                        <div className="flex gap-2 mt-3">
                            <Shimmer className="h-7 w-16 rounded-lg" />
                            <Shimmer className="h-7 w-16 rounded-lg" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Page-level skeleton (header + stats + table) ───────────────────────────

export function PageSkeleton({ children }: { children?: ReactNode }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
                <Shimmer className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                    <Shimmer className="h-5 w-40" />
                    <Shimmer className="h-3 w-60" />
                </div>
            </div>
            {children ?? (
                <>
                    <StatCardSkeleton count={3} />
                    <TableSkeleton rows={5} cols={4} />
                </>
            )}
        </div>
    )
}
