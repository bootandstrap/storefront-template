'use client'

/**
 * PanelBulkBar — Floating bottom action bar for bulk operations
 *
 * Appears when items are selected in a table/list.
 * Shows selection count + available bulk actions.
 * Linear/Shopify-style floating bar with smooth entrance animation.
 */

import { X } from 'lucide-react'

interface BulkAction {
    id: string
    label: string
    icon?: React.ReactNode
    variant?: 'default' | 'danger'
    onClick: () => void
}

interface PanelBulkBarProps {
    /** Number of selected items */
    selectedCount: number
    /** Label template, e.g. "{{count}} seleccionados" */
    label?: string
    /** Available bulk actions */
    actions: BulkAction[]
    /** Clear selection callback */
    onClear: () => void
}

export default function PanelBulkBar({
    selectedCount,
    label = '{{count}} seleccionados',
    actions,
    onClear,
}: PanelBulkBarProps) {
    if (selectedCount === 0) return null

    const displayLabel = label.replace('{{count}}', String(selectedCount))

    return (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="flex items-center gap-3 px-5 py-3 bg-sf-1 border border-sf-3 rounded-2xl shadow-2xl backdrop-blur-xl">
                {/* Selection count */}
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-brand text-white text-xs font-bold rounded-lg">
                        {selectedCount}
                    </span>
                    <span className="text-sm font-medium text-tx whitespace-nowrap">
                        {displayLabel}
                    </span>
                </div>

                <div className="w-px h-6 bg-sf-3" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {actions.map(action => (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                                action.variant === 'danger'
                                    ? 'text-red-500 hover:bg-red-500/10'
                                    : 'text-tx-sec hover:bg-sf-2'
                            }`}
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-6 bg-sf-3" />

                {/* Clear selection */}
                <button
                    onClick={onClear}
                    className="p-1.5 rounded-lg hover:bg-sf-2 text-tx-muted transition-colors"
                    title="Cancelar selección"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
