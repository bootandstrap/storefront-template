'use client'

/**
 * PanelSidebar — Owner Panel Navigation
 *
 * 3 fixed items (Inicio, Catálogo, Mi Tienda)
 * + dynamic "Módulos" section (feature-flag-gated)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
    LayoutDashboard,
    Store,
    Image as ImageIcon,
    MessageCircle,
    FileText,
    BarChart3,
    ChevronLeft,
    ChevronDown,
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
} from 'lucide-react'
import {
    getPanelNavigation,
    type PanelFeatureFlags,
    type PanelSidebarLabels,
} from '@/lib/panel-policy'
import PanelTopbar from '@/components/panel/PanelTopbar'

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    /** Optional notification badges: nav key → count */
    badges?: Record<string, number>
    /** Plan name for sidebar footer badge */
    planName?: string
}

export default function PanelSidebar({
    lang,
    businessName,
    labels,
    featureFlags,
    badges = {},
    planName,
}: PanelSidebarProps) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [modulesExpanded, setModulesExpanded] = useState(true)

    const { essentialItems, moduleItems } = getPanelNavigation({
        lang,
        labels,
        featureFlags,
    })

    const iconByKey: Record<string, React.ReactNode> = {
        dashboard: <LayoutDashboard className="w-5 h-5" />,
        catalog: <Package className="w-5 h-5" />,
        orders: <ShoppingBag className="w-5 h-5" />,
        customers: <Users className="w-5 h-5" />,
        storeConfig: <Store className="w-5 h-5" />,
        shipping: <Truck className="w-5 h-5" />,
        myProject: <Kanban className="w-5 h-5" />,
        carousel: <ImageIcon className="w-5 h-5" />,
        whatsapp: <MessageCircle className="w-5 h-5" />,
        pages: <FileText className="w-5 h-5" />,
        analytics: <BarChart3 className="w-5 h-5" />,
        badges: <BadgeCheck className="w-5 h-5" />,
        chatbot: <Bot className="w-5 h-5" />,
        returns: <RotateCcw className="w-5 h-5" />,
        reviews: <Star className="w-5 h-5" />,
    }

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    const linkClass = (href: string, exact?: boolean) => {
        const active = isActive(href, exact)
        return `
            relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200
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
    }

    const navigationContent = (
        <>
            {/* Fixed items */}
            {essentialItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={linkClass(item.href, item.exact)}
                    onClick={closeMobileMenu}
                    data-tour-id={tourIdByKey[item.key]}
                >
                    {iconByKey[item.key]}
                    <span className="flex-1">{item.label}</span>
                    {/* Notification badge */}
                    {badges[item.key] != null && badges[item.key] > 0 && (
                        <span className="badge-count">
                            {badges[item.key] > 99 ? '99+' : badges[item.key]}
                        </span>
                    )}
                </Link>
            ))}

            {/* Módulos section — collapsible */}
            {moduleItems.length > 0 && (
                <>
                    <button
                        type="button"
                        onClick={() => setModulesExpanded(!modulesExpanded)}
                        className="flex items-center gap-2 px-3 pt-5 pb-1 w-full text-left group"
                    >
                        <Puzzle className="w-3.5 h-3.5 text-text-muted/60" />
                        <span className="text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider flex-1">
                            {labels.modules}
                        </span>
                        <ChevronDown
                            className={`w-3.5 h-3.5 text-text-muted/40 transition-transform duration-200 ${modulesExpanded ? '' : '-rotate-90'
                                }`}
                        />
                    </button>

                    <div
                        className={`space-y-1 overflow-hidden transition-all duration-300 ${modulesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                    >
                        {moduleItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={linkClass(item.href)}
                                onClick={closeMobileMenu}
                                data-tour-id={`nav-${item.key}`}
                            >
                                {iconByKey[item.key]}
                                <span className="flex-1">{item.label}</span>
                                {badges[item.key] != null && badges[item.key] > 0 && (
                                    <span className="badge-count">
                                        {badges[item.key] > 99 ? '99+' : badges[item.key]}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </>
    )

    return (
        <>
            <PanelTopbar
                businessName={businessName}
                ownerPanelLabel={labels.ownerPanel}
                onMenuClick={() => setMobileOpen(true)}
            />

            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50">
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
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-surface-3 text-text-primary hover:bg-surface-1"
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
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all"
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
                    <Link
                        href={`/${lang}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {labels.backToStore}
                    </Link>
                </div>
            </aside>
        </>
    )
}
