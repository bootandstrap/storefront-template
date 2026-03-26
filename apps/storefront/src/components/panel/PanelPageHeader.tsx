'use client'

/**
 * PanelPageHeader — Consistent page header for all Owner Panel pages
 *
 * Provides: icon + title + subtitle + optional action button
 * Uses the same design system as the dashboard SectionHeader but sized for page-level headers.
 */

import type { ReactNode } from 'react'

interface PanelPageHeaderProps {
    /** Page title */
    title: string
    /** Optional subtitle/description */
    subtitle?: string
    /** Icon element (lucide-react) */
    icon?: ReactNode
    /** Optional action slot (e.g., "Add Product" button) */
    action?: ReactNode
    /** Optional badge (e.g., count) */
    badge?: string | number
}

export default function PanelPageHeader({
    title,
    subtitle,
    icon,
    action,
    badge,
}: PanelPageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
                {icon && (
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 text-primary shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold font-display text-text-primary truncate">
                            {title}
                        </h1>
                        {badge != null && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                {badge}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-sm text-text-muted mt-0.5 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    )
}

/**
 * PanelCard — consistent card wrapper for panel content sections
 */
export function PanelCard({
    children,
    className = '',
    noPadding = false,
}: {
    children: ReactNode
    className?: string
    noPadding?: boolean
}) {
    return (
        <div className={`glass rounded-2xl ${noPadding ? '' : 'p-5'} ${className}`}>
            {children}
        </div>
    )
}

/**
 * PanelFilterBar — consistent search/filter bar
 */
export function PanelFilterBar({ children }: { children: ReactNode }) {
    return (
        <div className="glass rounded-xl p-3 flex flex-wrap items-center gap-3">
            {children}
        </div>
    )
}

/**
 * PanelSearchInput — consistent search input
 */
export function PanelSearchInput({
    value,
    onChange,
    onSubmit,
    placeholder,
    icon,
}: {
    value: string
    onChange: (val: string) => void
    onSubmit?: () => void
    placeholder?: string
    icon?: ReactNode
}) {
    return (
        <div className="relative flex-1 min-w-[200px]">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {icon}
                </div>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
                placeholder={placeholder}
                className={`w-full py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${icon ? 'pl-10 pr-4' : 'px-4'}`}
            />
        </div>
    )
}

/**
 * PanelStatusTabs — consistent status filter tabs
 */
export function PanelStatusTabs<T extends string>({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: T; label: string }[]
    active: T
    onChange: (id: T) => void
}) {
    return (
        <div className="flex gap-1 flex-wrap">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        active === tab.id
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-muted hover:bg-surface-1 hover:text-text-primary'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

/**
 * PanelActionButton — consistent primary action button
 */
export function PanelActionButton({
    children,
    onClick,
    href,
    disabled = false,
    variant = 'primary',
    size = 'md',
}: {
    children: ReactNode
    onClick?: () => void
    href?: string
    disabled?: boolean
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md'
}) {
    const base = `inline-flex items-center gap-2 font-medium rounded-xl transition-all ${
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
    }`

    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-light shadow-sm hover:shadow-md',
        secondary: 'bg-surface-1 text-text-primary border border-surface-3 hover:bg-surface-2',
        danger: 'bg-error/10 text-error hover:bg-error/20 border border-error/20',
    }

    const cls = `${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

    if (href) {
        return <a href={href} className={cls}>{children}</a>
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cls}>
            {children}
        </button>
    )
}

/**
 * PanelEmptyState — reusable empty state for panel lists
 */
export function PanelEmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <div className="glass rounded-2xl p-12 text-center">
            {icon && (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-1 text-text-muted mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description && (
                <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}

/**
 * PanelTable — consistent table wrapper with glass card
 */
export function PanelTable({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`glass rounded-2xl overflow-hidden ${className}`}>
            <table className="w-full text-sm">
                {children}
            </table>
        </div>
    )
}

export function PanelTHead({ children }: { children: ReactNode }) {
    return (
        <thead>
            <tr className="border-b border-surface-3 text-text-muted bg-surface-1/30">
                {children}
            </tr>
        </thead>
    )
}

export function PanelTH({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <th className={`text-left px-4 py-3 font-medium text-xs uppercase tracking-wider ${className}`}>
            {children}
        </th>
    )
}
