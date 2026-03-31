'use client'

/**
 * PanelDetailDrawer — Slide-over panel for detail views
 *
 * Used for: order details, customer profiles, product editing, etc.
 * Slides in from the right with backdrop + framer-motion animation.
 * Supports header, body (scrollable), and footer (sticky) sections.
 *
 * Usage:
 *   <PanelDetailDrawer open={isOpen} onClose={() => setOpen(false)} title="Order #1234">
 *     <div>...content...</div>
 *   </PanelDetailDrawer>
 */

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, type ReactNode } from 'react'

interface PanelDetailDrawerProps {
    /** Whether the drawer is open */
    open: boolean
    /** Close handler */
    onClose: () => void
    /** Drawer title */
    title: string
    /** Optional subtitle */
    subtitle?: string
    /** Optional icon in header */
    icon?: ReactNode
    /** Scrollable body content */
    children: ReactNode
    /** Optional sticky footer (e.g., save/cancel buttons) */
    footer?: ReactNode
    /** Width: 'md' (default 480px), 'lg' (640px), 'xl' (800px), 'full' (100%) */
    width?: 'md' | 'lg' | 'xl' | 'full'
    /** Disable backdrop click to close */
    preventBackdropClose?: boolean
}

const widthClasses: Record<string, string> = {
    md: 'w-full max-w-[480px]',
    lg: 'w-full max-w-[640px]',
    xl: 'w-full max-w-[800px]',
    full: 'w-full',
}

export default function PanelDetailDrawer({
    open,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    width = 'md',
    preventBackdropClose = false,
}: PanelDetailDrawerProps) {
    // Escape key closes drawer
    const handleEsc = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        },
        [onClose]
    )

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleEsc)
            // Prevent body scroll when drawer is open
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [open, handleEsc])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={preventBackdropClose ? undefined : onClose}
                    />

                    {/* Drawer */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`fixed right-0 top-0 bottom-0 z-50 ${widthClasses[width]} bg-sf-0 border-l border-sf-3 shadow-2xl flex flex-col`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                    >
                        {/* Header */}
                        <div className="shrink-0 px-6 py-4 border-b border-sf-3 flex items-center gap-3">
                            {icon && (
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-muted to-brand-subtle text-brand shrink-0">
                                    {icon}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold font-display text-tx truncate">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-sm text-tx-muted truncate">{subtitle}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 p-2 rounded-xl text-tx-muted hover:bg-sf-1 hover:text-tx transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft"
                                aria-label="Close drawer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {children}
                        </div>

                        {/* Sticky footer */}
                        {footer && (
                            <div className="shrink-0 px-6 py-4 border-t border-sf-3 bg-sf-0">
                                {footer}
                            </div>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── Drawer Section helpers ─────────────────────────────────────────────────

export function DrawerSection({
    title,
    children,
    className = '',
}: {
    title?: string
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`mb-6 ${className}`}>
            {title && (
                <h3 className="text-xs font-semibold text-tx-faint uppercase tracking-wider mb-3">
                    {title}
                </h3>
            )}
            {children}
        </div>
    )
}

export function DrawerField({
    label,
    value,
    className = '',
}: {
    label: string
    value: ReactNode
    className?: string
}) {
    return (
        <div className={`flex items-center justify-between py-2.5 border-b border-sf-2 last:border-0 ${className}`}>
            <span className="text-sm text-tx-muted">{label}</span>
            <span className="text-sm font-medium text-tx">{value}</span>
        </div>
    )
}
