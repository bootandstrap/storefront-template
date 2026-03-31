'use client'

/**
 * PanelSidebar — Owner Panel Navigation
 *
 * 3 semantic groups: Operaciones · Contenido · Ajustes
 * Feature-flag gated items auto-hide when disabled.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
    LayoutDashboard,
    Store,
    Image as ImageIcon,
    MessageCircle,
    FileText,
    BarChart3,
    ChevronLeft,
    Package,
    ShoppingBag,
    Users,
    Puzzle,
    BadgeCheck,
    Bot,
    RotateCcw,
    Truck,
    Star,
    Kanban,
    X,
    Monitor,
    Wrench,
    Search,
    Share2,
    Globe,
    Zap,
    Shield,
    ShoppingCart,
    Gauge,
} from 'lucide-react'
import {
    getPanelNavigationGrouped,
    type PanelFeatureFlags,
    type PanelSidebarLabels,
    type PanelNavItem,
} from '@/lib/panel-policy'
import PanelTour, { type TourStep } from '@/components/panel/PanelTour'

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    /** Optional notification badges: nav key → count */
    badges?: Record<string, number>
    /** Plan name for sidebar footer badge */
    planName?: string
    /** Whether onboarding was completed (shows replay tour button) */
    onboardingCompleted?: boolean
    /** Label for the replay tour button */
    replayTourLabel?: string
    /** Server-resolved translations for tour steps */
    tourTranslations?: Record<string, string>
    /** Controlled mobile open state (driven from layout topbar hamburger) */
    mobileOpen?: boolean
    /** Callback when mobile menu state changes */
    onMobileOpenChange?: (open: boolean) => void
    /** Whether sidebar is collapsed (icon-only) */
    collapsed?: boolean
    /** Callback when collapse state changes */
    onCollapseChange?: (collapsed: boolean) => void
}

export default function PanelSidebar({
    lang,
    businessName,
    labels,
    featureFlags,
    badges = {},
    planName,
    onboardingCompleted = false,
    replayTourLabel,
    tourTranslations = {},
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
    const [showReplayTour, setShowReplayTour] = useState(false)

    // ── Sidebar collapse state (persisted in localStorage) ──
    const [internalCollapsed, setInternalCollapsed] = useState(false)
    const isCollapsed = controlledCollapsed ?? internalCollapsed
    const setCollapsed = useCallback((v: boolean) => {
        setInternalCollapsed(v)
        onCollapseChange?.(v)
        try { localStorage.setItem('panel-sidebar-collapsed', String(v)) } catch {}
    }, [onCollapseChange])

    // Restore from localStorage on mount
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

    // ── `[` key toggle ──
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

    // ── Escape key closes mobile drawer ──
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

    const grouped = getPanelNavigationGrouped({
        lang,
        labels,
        featureFlags,
    })

    const iconByKey: Record<string, React.ReactNode> = {
        dashboard: <LayoutDashboard className="w-5 h-5" />,
        catalog: <Package className="w-5 h-5" />,
        orders: <ShoppingBag className="w-5 h-5" />,
        customers: <Users className="w-5 h-5" />,
        utilities: <Wrench className="w-5 h-5" />,
        storeConfig: <Store className="w-5 h-5" />,
        shipping: <Truck className="w-5 h-5" />,
        myProject: <Kanban className="w-5 h-5" />,
        modules: <Puzzle className="w-5 h-5" />,
        carousel: <ImageIcon className="w-5 h-5" />,
        whatsapp: <MessageCircle className="w-5 h-5" />,
        pages: <FileText className="w-5 h-5" />,
        analytics: <BarChart3 className="w-5 h-5" />,
        badges: <BadgeCheck className="w-5 h-5" />,
        chatbot: <Bot className="w-5 h-5" />,
        returns: <RotateCcw className="w-5 h-5" />,
        reviews: <Star className="w-5 h-5" />,
        pos: <Monitor className="w-5 h-5" />,
        capacidad: <Gauge className="w-5 h-5" />,
        seo: <Search className="w-5 h-5" />,
        socialMedia: <Share2 className="w-5 h-5" />,
        i18n: <Globe className="w-5 h-5" />,
        automations: <Zap className="w-5 h-5" />,
        authAdvanced: <Shield className="w-5 h-5" />,
        salesChannels: <ShoppingCart className="w-5 h-5" />,
    }

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    const linkClass = (href: string, exact?: boolean) => {
        const active = isActive(href, exact)
        return `
            relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med
            ${active
                ? 'bg-brand-subtle text-brand sidebar-link-active'
                : 'text-tx-sec hover:bg-sf-1 hover:text-tx'
            }
        `
    }

    const closeMobileMenu = () => setMobileOpen(false)

    const tourIdByKey: Record<string, string> = {
        dashboard: 'nav-dashboard',
        catalog: 'nav-catalog',
        orders: 'nav-orders',
        customers: 'nav-customers',
        storeConfig: 'nav-store',
        shipping: 'nav-shipping',
        modules: 'nav-modules',
    }

    const renderNavLink = (item: PanelNavItem, forCollapsed = false) => (
        <Link
            key={item.href}
            href={item.href}
            className={linkClass(item.href, item.exact)}
            onClick={closeMobileMenu}
            data-tour-id={tourIdByKey[item.key]}
            title={forCollapsed ? item.label : undefined}
        >
            {iconByKey[item.key]}
            {!forCollapsed && <span className="flex-1">{item.label}</span>}
            {!forCollapsed && badges[item.key] != null && badges[item.key] > 0 && (
                <span className="badge-count">
                    {badges[item.key] > 99 ? '99+' : badges[item.key]}
                </span>
            )}
            {forCollapsed && badges[item.key] != null && badges[item.key] > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {badges[item.key] > 9 ? '•' : badges[item.key]}
                </span>
            )}
        </Link>
    )

    const renderGroup = (label: string, items: PanelNavItem[], forCollapsed = false) => {
        if (items.length === 0) return null
        return (
            <div key={label}>
                {!forCollapsed && (
                    <div className="px-3 pt-5 pb-1.5">
                        <span className="text-[11px] font-semibold text-tx-faint uppercase tracking-wider">
                            {label}
                        </span>
                    </div>
                )}
                {forCollapsed && <div className="pt-3 pb-1 border-t border-sf-2 first:border-0 first:pt-0" />}
                <div className={forCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
                    {items.map(item => renderNavLink(item, forCollapsed))}
                </div>
            </div>
        )
    }

    const navigationContent = (
        <>
            {renderGroup(labels.groupOperations, grouped.operations)}
            {renderGroup(labels.groupContent, grouped.content)}
            {renderGroup(labels.groupSettings, grouped.settings)}
        </>
    )

    const collapsedNavigationContent = (
        <>
            {renderGroup(labels.groupOperations, grouped.operations, true)}
            {renderGroup(labels.groupContent, grouped.content, true)}
            {renderGroup(labels.groupSettings, grouped.settings, true)}
        </>
    )

    return (
        <>

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

                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {navigationContent}
                        </nav>

                        <div className="p-3 border-t border-sf-3">
                            {planName && (
                                <div className="px-3 py-2 mb-2">
                                    <span className="plan-badge">{planName}</span>
                                </div>
                            )}
                            <Link
                                href={`/${lang}`}
                                onClick={closeMobileMenu}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-tx-muted hover:text-tx hover:bg-sf-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {labels.backToStore}
                            </Link>
                        </div>
                    </aside>
                </div>
            )}

            <aside className={`hidden md:flex min-h-screen glass-strong border-r border-sf-3 flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
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
                            <h2 className="text-lg font-bold font-display text-tx truncate">
                                {businessName}
                            </h2>
                            <p className="text-xs text-tx-muted mt-0.5">
                                {labels.ownerPanel}
                            </p>
                        </>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2 space-y-1' : 'p-3 space-y-1'}`}>
                    {isCollapsed ? collapsedNavigationContent : navigationContent}
                </nav>

                {/* Footer */}
                <div className={`border-t border-sf-3 ${isCollapsed ? 'p-2 space-y-1 flex flex-col items-center' : 'p-3 space-y-2'}`}>
                    {!isCollapsed && planName && (
                        <div className="px-3 py-1">
                            <span className="plan-badge">{planName}</span>
                        </div>
                    )}
                    {/* Replay tour button */}
                    {!isCollapsed && onboardingCompleted && (
                        <button
                            type="button"
                            onClick={() => setShowReplayTour(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-tx-muted hover:text-brand hover:bg-brand-subtle transition-all w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                        >
                            🎓 {replayTourLabel || 'Replay Tour'}
                        </button>
                    )}
                    {/* Collapse toggle */}
                    <button
                        type="button"
                        onClick={() => setCollapsed(!isCollapsed)}
                        className={`flex items-center justify-center rounded-xl text-tx-muted hover:text-tx hover:bg-sf-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                            isCollapsed ? 'w-9 h-9' : 'gap-2 px-3 py-2.5 w-full text-sm'
                        }`}
                        title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                    >
                        <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                        {!isCollapsed && labels.backToStore}
                    </button>
                </div>
            </aside>

            {/* Replay tour overlay */}
            {showReplayTour && (
                <PanelTour
                    steps={[
                        { targetId: 'nav-dashboard', title: tourTranslations['tour.step.dashboard.title'] || 'Dashboard', description: tourTranslations['tour.step.dashboard.description'] || '' },
                        { targetId: 'nav-catalog', title: tourTranslations['tour.step.catalog.title'] || 'Catalog', description: tourTranslations['tour.step.catalog.description'] || '' },
                        { targetId: 'nav-orders', title: tourTranslations['tour.step.orders.title'] || 'Orders', description: tourTranslations['tour.step.orders.description'] || '' },
                        { targetId: 'nav-customers', title: tourTranslations['tour.step.customers.title'] || 'Customers', description: tourTranslations['tour.step.customers.description'] || '' },
                        { targetId: 'nav-store', title: tourTranslations['tour.step.store.title'] || 'Store settings', description: tourTranslations['tour.step.store.description'] || '' },
                        { targetId: 'nav-shipping', title: tourTranslations['tour.step.shipping.title'] || 'Shipping', description: tourTranslations['tour.step.shipping.description'] || '' },
                        { targetId: 'nav-modules', title: tourTranslations['tour.step.modules.title'] || 'Modules', description: tourTranslations['tour.step.modules.description'] || '' },
                    ]}
                    onComplete={() => setShowReplayTour(false)}
                    t={(key: string) => tourTranslations[key] || key}
                    isReplay
                />
            )}
        </>
    )
}
