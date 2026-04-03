'use client'

/**
 * PanelActionMenu — Three-dot dropdown action menu
 *
 * Used for row-level actions in tables (edit, delete, duplicate, etc.)
 *
 * Usage:
 *   <PanelActionMenu
 *     actions={[
 *       { label: 'Edit', icon: <Edit />, onClick: () => ... },
 *       { label: 'Duplicate', icon: <Copy />, onClick: () => ... },
 *       { type: 'separator' },
 *       { label: 'Delete', icon: <Trash2 />, onClick: () => ..., variant: 'danger' },
 *     ]}
 *   />
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'

interface ActionItem {
    type?: 'action' | 'separator'
    label?: string
    icon?: ReactNode
    onClick?: () => void
    variant?: 'default' | 'danger'
    disabled?: boolean
}

interface PanelActionMenuProps {
    actions: ActionItem[]
    /** Position of the dropdown */
    align?: 'left' | 'right'
    /** Additional className for the trigger button */
    className?: string
}

export default function PanelActionMenu({
    actions,
    align = 'right',
    className = '',
}: PanelActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handler)
        }
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isOpen])

    return (
        <div className={`relative ${className}`} ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="p-1.5 rounded-lg text-tx-muted hover:bg-sf-1 hover:text-tx transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft"
                aria-label="Actions"
                aria-expanded={isOpen}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-40 bg-sf-0/50 backdrop-blur-md shadow-xl border border-sf-3/30 rounded-xl py-1 min-w-[160px] animate-fade-in-up`}
                    role="menu"
                >
                    {actions.map((action, i) => {
                        if (action.type === 'separator') {
                            return <div key={i} className="my-1 border-t border-sf-3" />
                        }

                        const isDanger = action.variant === 'danger'

                        return (
                            <button
                                key={i}
                                type="button"
                                role="menuitem"
                                disabled={action.disabled}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    action.onClick?.()
                                    setIsOpen(false)
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDanger
                                        ? 'text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950'
                                        : 'text-tx hover:bg-sf-1'
                                }`}
                            >
                                {action.icon && (
                                    <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                                        {action.icon}
                                    </span>
                                )}
                                <span>{action.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
