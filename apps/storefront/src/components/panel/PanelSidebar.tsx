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
    Package,
    ShoppingBag,
    Users,
    Puzzle,
    BadgeCheck,
    Bot,
    RotateCcw,
    Truck,
    X,
} from 'lucide-react'
import {
    getPanelNavigation,
    type PanelFeatureFlags,
    type PanelSidebarLabels,
} from '@/lib/panel-modules'
import PanelTopbar from '@/components/panel/PanelTopbar'

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
}

export default function PanelSidebar({ lang, businessName, labels, featureFlags }: PanelSidebarProps) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

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
        carousel: <ImageIcon className="w-5 h-5" />,
        whatsapp: <MessageCircle className="w-5 h-5" />,
        pages: <FileText className="w-5 h-5" />,
        analytics: <BarChart3 className="w-5 h-5" />,
        badges: <BadgeCheck className="w-5 h-5" />,
        chatbot: <Bot className="w-5 h-5" />,
        returns: <RotateCcw className="w-5 h-5" />,
    }

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    const linkClass = (href: string, exact?: boolean) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200
        ${isActive(href, exact)
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
        }
    `

    const closeMobileMenu = () => setMobileOpen(false)

    const navigationContent = (
        <>
            {/* Fixed items */}
            {essentialItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={linkClass(item.href, item.exact)}
                    onClick={closeMobileMenu}
                >
                    {iconByKey[item.key]}
                    {item.label}
                </Link>
            ))}

            {/* Módulos section divider */}
            {moduleItems.length > 0 && (
                <>
                    <div className="flex items-center gap-2 px-3 pt-5 pb-1">
                        <Puzzle className="w-3.5 h-3.5 text-text-muted/60" />
                        <span className="text-[11px] font-semibold text-text-muted/60 uppercase tracking-wider">
                            {labels.modules}
                        </span>
                        <div className="flex-1 h-px bg-surface-3" />
                    </div>

                    {moduleItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={linkClass(item.href)}
                            onClick={closeMobileMenu}
                        >
                            {iconByKey[item.key]}
                            {item.label}
                        </Link>
                    ))}
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

                {/* Back to storefront */}
                <div className="p-3 border-t border-surface-3">
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
