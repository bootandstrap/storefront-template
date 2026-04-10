'use client'

/**
 * PanelSidebar — Owner Panel Navigation (SOTA 6-Section Model)
 *
 * 6 primary sections: Inicio · Mi Tienda · Ventas · Módulos · Ajustes · POS
 * POS only visible when enable_pos is active.
 * Clean, minimal, non-tech-friendly — an SME owner sees 5-6 items, not 26.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
    LayoutDashboard,
    Store,
    ShoppingCart,
    Puzzle,
    Settings,
    Monitor,
    ChevronLeft,
    X,
    ExternalLink,
} from 'lucide-react'
import {
    getPanelSections,
    type PanelSidebarLabels,
    type PanelFeatureFlags,
    type SectionKey,
} from '@/lib/panel-policy'

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    /** Optional notification badges: section key → count */
    badges?: Record<string, number>
    /** Plan name for sidebar footer */
    planName?: string
    /** Controlled mobile open state */
    mobileOpen?: boolean
    /** Callback when mobile menu state changes */
    onMobileOpenChange?: (open: boolean) => void
    /** Whether sidebar is collapsed (icon-only) */
    collapsed?: boolean
    /** Callback when collapse state changes */
    onCollapseChange?: (collapsed: boolean) => void
}

const SECTION_ICONS: Record<SectionKey, typeof LayoutDashboard> = {
    home: LayoutDashboard,
    myStore: Store,
    sales: ShoppingCart,
    modules: Puzzle,
    settings: Settings,
    pos: Monitor,
}

export default function PanelSidebar({
    lang,
    businessName,
    labels,
    featureFlags,
    badges = {},
    planName,
    mobileOpen: controlledMobileOpen,
    onMobileOpenChange,
    collapsed: controlledCollapsed,
    onCollapseChange,
}: PanelSidebarProps) {
    const pathname = usePathname()
    const [internalMobileOpen, setInternalMobileOpen] = useState(false)
    const mobileOpen = controlledMobileOpen ?? internalMobileOpen
    const setMobileOpen = (open: boolean) => {
        setInternalMobileOpen(open)
        onMobileOpenChange?.(open)
    }

    // ── Sidebar collapse state (persisted) ──
    const [internalCollapsed, setInternalCollapsed] = useState(false)
    const isCollapsed = controlledCollapsed ?? internalCollapsed
    const setCollapsed = useCallback((v: boolean) => {
        setInternalCollapsed(v)
        onCollapseChange?.(v)
        try { localStorage.setItem('panel-sidebar-collapsed', String(v)) } catch {}
    }, [onCollapseChange])

    useEffect(() => {
        try {
            const stored = localStorage.getItem('panel-sidebar-collapsed')
            if (stored === 'true') {
                setInternalCollapsed(true)
                onCollapseChange?.(true)
            }
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Keyboard shortcuts ──
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
            if (e.key === '[' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                setCollapsed(!isCollapsed)
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isCollapsed, setCollapsed])

    useEffect(() => {
        if (!mobileOpen) return
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                setMobileOpen(false)
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [mobileOpen])

    const sections = getPanelSections({ lang, labels, featureFlags, badges })

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    const closeMobileMenu = () => setMobileOpen(false)

    const renderNavLink = (section: typeof sections[number], forCollapsed = false) => {
        const IconComponent = SECTION_ICONS[section.key]
        const active = isActive(section.href, section.exact)

        return (
            <Link
                key={section.key}
                href={section.href}
                className={`panel-sidebar-section ${active ? 'panel-sidebar-section-active' : ''}`}
                onClick={closeMobileMenu}
                title={forCollapsed ? section.label : undefined}
                data-tour-id={`nav-${section.key}`}
            >
                <span className="panel-sidebar-icon">
                    <IconComponent className="w-5 h-5" />
                </span>
                {!forCollapsed && (
                    <span className="flex-1 text-sm">{section.label}</span>
                )}
                {!forCollapsed && section.badge != null && section.badge > 0 && (
                    <span className="panel-sidebar-badge">
                        {section.badge > 99 ? '99+' : section.badge}
                    </span>
                )}
                {forCollapsed && section.badge != null && section.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                        {section.badge > 9 ? '•' : section.badge}
                    </span>
                )}
            </Link>
        )
    }

    const navigationContent = (forCollapsed = false) => (
        <div className={forCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-1'}>
            {sections.map(section => renderNavLink(section, forCollapsed))}
        </div>
    )

    return (
        <>
            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panel menu">
                    <button
                        type="button"
                        aria-label="Close panel menu backdrop"
                        className="absolute inset-0 bg-black/45"
                        onClick={closeMobileMenu}
                    />
                    <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[90vw] glass-strong border-r border-sf-3 flex flex-col">
                        <div className="h-14 px-4 border-b border-sf-3 flex items-center justify-between">
                            <div className="text-sm font-semibold text-tx truncate">
                                {businessName}
                            </div>
                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                aria-label="Close panel menu"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-sf-3 text-tx hover:bg-sf-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <nav className="flex-1 p-3 overflow-y-auto">
                            {navigationContent()}
                        </nav>

                        <div className="p-3 border-t border-sf-3">
                            {planName && (
                                <div className="px-3 py-2 mb-2">
                                    <span className="plan-badge">{planName}</span>
                                </div>
                            )}
                            <a
                                href={`/${lang}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMobileMenu}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-tx-muted hover:text-tx hover:bg-sf-1 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {labels.backToStore}
                            </a>
                        </div>
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className={`hidden md:flex min-h-screen glass-strong border-r border-sf-3 flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-56'}`}>
                {/* Header */}
                <div className={`border-b border-sf-3 ${isCollapsed ? 'p-3 flex items-center justify-center' : 'p-5'}`}>
                    {isCollapsed ? (
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="w-9 h-9 rounded-xl bg-brand-subtle text-brand font-bold text-sm flex items-center justify-center hover:bg-brand-muted transition-colors"
                            title={businessName}
                        >
                            {(businessName || 'B')[0].toUpperCase()}
                        </button>
                    ) : (
                        <>
                            <h2 className="text-base font-bold font-display text-tx truncate">
                                {businessName}
                            </h2>
                            <p className="text-xs text-tx-muted mt-0.5">
                                {labels.ownerPanel}
                            </p>
                        </>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
                    {navigationContent(isCollapsed)}
                </nav>

                {/* Footer */}
                <div className={`border-t border-sf-3 ${isCollapsed ? 'p-2 flex flex-col items-center' : 'p-3 space-y-2'}`}>
                    {!isCollapsed && planName && (
                        <div className="px-3 py-1">
                            <span className="plan-badge">{planName}</span>
                        </div>
                    )}
                    {!isCollapsed && (
                        <a
                            href={`/${lang}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-tx-muted hover:text-tx hover:bg-sf-1 transition-all"
                        >
                            <ExternalLink className="w-4 h-4" />
                            {labels.backToStore}
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => setCollapsed(!isCollapsed)}
                        className={`flex items-center justify-center rounded-xl text-tx-muted hover:text-tx hover:bg-sf-1 transition-all ${
                            isCollapsed ? 'w-9 h-9' : 'gap-2 px-3 py-2 w-full text-sm'
                        }`}
                        title="Toggle sidebar"
                    >
                        <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                        {!isCollapsed && (
                            <span className="text-xs opacity-60">⌥ [</span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    )
}
