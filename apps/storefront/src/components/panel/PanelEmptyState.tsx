'use client'

/**
 * PanelEmptyState — Reusable empty state for panel pages
 *
 * Shows a centered message with icon + optional CTA button.
 * Follows SOTA design patterns from Linear/Notion empty states.
 */

import { type LucideIcon, Inbox } from 'lucide-react'

interface PanelEmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    secondaryAction?: {
        label: string
        onClick: () => void
    }
    /** Optional: render children below the description */
    children?: React.ReactNode
}

export default function PanelEmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    secondaryAction,
    children,
}: PanelEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sf-2 flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-tx-faint" />
            </div>
            <h3 className="text-base font-semibold text-tx mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-tx-muted max-w-md mb-6">{description}</p>
            )}
            {children}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3 mt-4">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-muted transition-colors"
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="px-4 py-2.5 text-sm text-tx-sec border border-sf-3 rounded-xl hover:bg-sf-1 transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
