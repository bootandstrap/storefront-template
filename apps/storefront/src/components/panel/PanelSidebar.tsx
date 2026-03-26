'use client'

/**
 * PanelSidebar — Owner Panel Navigation
 *
 * 3 semantic groups: Operaciones · Contenido · Ajustes
 * Feature-flag gated items auto-hide when disabled.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
}: PanelSidebarProps) {
    const pathname = usePathname()
    const [internalMobileOpen, setInternalMobileOpen] = useState(false)
    const mobileOpen = controlledMobileOpen ?? internalMobileOpen
    const setMobileOpen = (open: boolean) => {
        setInternalMobileOpen(open)
        onMobileOpenChange?.(open)
    }
    const [showReplayTour, setShowReplayTour] = useState(false)

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
    }

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    const linkClass = (href: string, exact?: boolean) => {
        const active = isActive(href, exact)
        return `
            relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            ${active
                ? 'bg-primary/8 text-primary sidebar-link-active'
                : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
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

    const renderNavLink = (item: PanelNavItem) => (
        <Link
            key={item.href}
            href={item.href}
            className={linkClass(item.href, item.exact)}
            onClick={closeMobileMenu}
            data-tour-id={tourIdByKey[item.key]}
        >
            {iconByKey[item.key]}
            <span className="flex-1">{item.label}</span>
            {badges[item.key] != null && badges[item.key] > 0 && (
                <span className="badge-count">
                    {badges[item.key] > 99 ? '99+' : badges[item.key]}
                </span>
            )}
        </Link>
    )

    const renderGroup = (label: string, items: PanelNavItem[]) => {
        if (items.length === 0) return null
        return (
            <div key={label}>
                <div className="px-3 pt-5 pb-1.5">
                    <span className="text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider">
                        {label}
                    </span>
                </div>
                <div className="space-y-0.5">
                    {items.map(renderNavLink)}
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
                    <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[90vw] glass-strong border-r border-surface-3 flex flex-col">
                        <div className="h-14 px-4 border-b border-surface-3 flex items-center justify-between">
                            <div className="text-sm font-semibold text-text-primary truncate">
                                {businessName}
                            </div>
                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                aria-label="Close panel menu"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-surface-3 text-text-primary hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {navigationContent}
                        </nav>

                        <div className="p-3 border-t border-surface-3">
                            {planName && (
                                <div className="px-3 py-2 mb-2">
                                    <span className="plan-badge">{planName}</span>
                                </div>
                            )}
                            <Link
                                href={`/${lang}`}
                                onClick={closeMobileMenu}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {labels.backToStore}
                            </Link>
                        </div>
                    </aside>
                </div>
            )}

            <aside className="hidden md:flex w-64 min-h-screen glass-strong border-r border-surface-3 flex-col">
                {/* Header */}
                <div className="p-5 border-b border-surface-3">
                    <h2 className="text-lg font-bold font-display text-text-primary truncate">
                        {businessName}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                        {labels.ownerPanel}
                    </p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navigationContent}
                </nav>

                {/* Footer with plan badge + back link */}
                <div className="p-3 border-t border-surface-3 space-y-2">
                    {planName && (
                        <div className="px-3 py-1">
                            <span className="plan-badge">{planName}</span>
                        </div>
                    )}
                {/* Replay tour button */}
                    {onboardingCompleted && (
                        <button
                            type="button"
                            onClick={() => setShowReplayTour(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-primary hover:bg-primary/5 transition-all w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            🎓 {replayTourLabel || 'Replay Tour'}
                        </button>
                    )}
                    <Link
                        href={`/${lang}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {labels.backToStore}
                    </Link>
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
