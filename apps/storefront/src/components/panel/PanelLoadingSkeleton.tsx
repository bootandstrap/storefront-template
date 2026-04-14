'use client'

/**
 * PanelLoadingSkeleton — Reusable loading state for panel pages
 *
 * Variants:
 *  - table: Grid/list with header + rows (catalogo, pedidos, clientes)
 *  - cards: Card grid (módulos, capacidad, dashboard)
 *  - form:  Form layout (ajustes, chatbot, auth config)
 *
 * @module components/panel/PanelLoadingSkeleton
 */

import { motion } from 'framer-motion'

type Variant = 'table' | 'cards' | 'form'

interface Props {
    variant?: Variant
    rows?: number
}

function Shimmer({ className = '' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-xl bg-sf-sec/60 ${className}`}
        />
    )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-4 w-20 ml-auto" />
                <Shimmer className="h-4 w-16" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl bg-sf-pri border border-brd-pri"
                >
                    <Shimmer className="h-10 w-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Shimmer className="h-4 w-48" />
                        <Shimmer className="h-3 w-32" />
                    </div>
                    <Shimmer className="h-4 w-16" />
                    <Shimmer className="h-8 w-8 rounded-lg" />
                </div>
            ))}
        </div>
    )
}

function CardsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: rows * 2 }).map((_, i) => (
                <div
                    key={i}
                    className="p-5 rounded-2xl bg-sf-pri border border-brd-pri space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <Shimmer className="h-10 w-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Shimmer className="h-4 w-28" />
                            <Shimmer className="h-3 w-20" />
                        </div>
                    </div>
                    <Shimmer className="h-2 w-full rounded-full" />
                    <Shimmer className="h-3 w-24" />
                </div>
            ))}
        </div>
    )
}

function FormSkeleton() {
    return (
        <div className="space-y-6 max-w-2xl">
            {/* Section title */}
            <div className="space-y-2">
                <Shimmer className="h-5 w-40" />
                <Shimmer className="h-3 w-64" />
            </div>
            {/* Form fields */}
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-10 w-full rounded-xl" />
                </div>
            ))}
            {/* Submit button */}
            <Shimmer className="h-10 w-32 rounded-xl" />
        </div>
    )
}

export default function PanelLoadingSkeleton({ variant = 'table', rows = 5 }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 sm:p-6"
        >
            {variant === 'table' && <TableSkeleton rows={rows} />}
            {variant === 'cards' && <CardsSkeleton rows={rows} />}
            {variant === 'form' && <FormSkeleton />}
        </motion.div>
    )
}
