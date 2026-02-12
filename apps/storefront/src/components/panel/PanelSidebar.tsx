'use client'

/**
 * PanelSidebar — Owner Panel Navigation
 *
 * 3 fixed items (Inicio, Catálogo, Mi Tienda)
 * + dynamic "Módulos" section (feature-flag-gated)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

export interface FeatureFlagsForSidebar {
    enable_carousel?: boolean
    enable_whatsapp_checkout?: boolean
    enable_cms_pages?: boolean
    enable_analytics?: boolean
}

export interface PanelSidebarLabels {
    dashboard: string
    catalog: string
    orders: string
    customers: string
    storeConfig: string
    modules: string
    carousel: string
    whatsapp: string
    pages: string
    analytics: string
    ownerPanel: string
    backToStore: string
}

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: FeatureFlagsForSidebar
}

export default function PanelSidebar({ lang, businessName, labels, featureFlags }: PanelSidebarProps) {
    const pathname = usePathname()

    // Fixed navigation items (always visible)
    const fixedItems = [
        {
            label: labels.dashboard,
            href: `/${lang}/panel`,
            icon: <LayoutDashboard className="w-5 h-5" />,
            exact: true,
        },
        {
            label: labels.catalog,
            href: `/${lang}/panel/catalogo`,
            icon: <Package className="w-5 h-5" />,
        },
        {
            label: labels.orders,
            href: `/${lang}/panel/pedidos`,
            icon: <ShoppingBag className="w-5 h-5" />,
        },
        {
            label: labels.customers,
            href: `/${lang}/panel/clientes`,
            icon: <Users className="w-5 h-5" />,
        },
        {
            label: labels.storeConfig,
            href: `/${lang}/panel/tienda`,
            icon: <Store className="w-5 h-5" />,
        },
    ]

    // Module items (only visible if feature flag is enabled)
    const moduleItems = [
        {
            label: labels.carousel,
            href: `/${lang}/panel/carrusel`,
            icon: <ImageIcon className="w-5 h-5" />,
            flag: featureFlags.enable_carousel,
        },
        {
            label: labels.whatsapp,
            href: `/${lang}/panel/mensajes`,
            icon: <MessageCircle className="w-5 h-5" />,
            flag: featureFlags.enable_whatsapp_checkout,
        },
        {
            label: labels.pages,
            href: `/${lang}/panel/paginas`,
            icon: <FileText className="w-5 h-5" />,
            flag: featureFlags.enable_cms_pages,
        },
        {
            label: labels.analytics,
            href: `/${lang}/panel/analiticas`,
            icon: <BarChart3 className="w-5 h-5" />,
            flag: featureFlags.enable_analytics,
        },
    ].filter(item => item.flag)

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

    return (
        <aside className="w-64 min-h-screen glass-strong border-r border-surface-3 flex flex-col">
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
                {/* Fixed items */}
                {fixedItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={linkClass(item.href, item.exact)}
                    >
                        {item.icon}
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
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                    </>
                )}
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
    )
}
