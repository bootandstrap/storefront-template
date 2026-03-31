'use client'

/**
 * PanelMobileNav — Fixed bottom navigation for mobile devices
 *
 * Thumb-zone-optimized tab bar with the 5 most critical sections.
 * Only visible on small screens. Replaces the need to open the
 * full sidebar for everyday navigation.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    MoreHorizontal,
} from 'lucide-react'

interface PanelMobileNavProps {
    lang: string
    labels: {
        dashboard: string
        catalog: string
        orders: string
        customers: string
        more: string
    }
    /** Callback to open the full sidebar */
    onMoreClick: () => void
    /** Notification badges */
    orderBadge?: number
}

const TABS = [
    { key: 'dashboard', icon: LayoutDashboard, path: '' },
    { key: 'catalog', icon: Package, path: '/catalogo' },
    { key: 'orders', icon: ShoppingBag, path: '/pedidos' },
    { key: 'customers', icon: Users, path: '/clientes' },
] as const

export default function PanelMobileNav({
    lang,
    labels,
    onMoreClick,
    orderBadge,
}: PanelMobileNavProps) {
    const pathname = usePathname()
    const panelBase = `/${lang}/panel`

    const isActive = (path: string) => {
        const full = panelBase + path
        if (path === '') return pathname === full
        return pathname === full || pathname.startsWith(full + '/')
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-glass-heavy backdrop-blur-xl border-t border-sf-2 safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {TABS.map(tab => {
                    const active = isActive(tab.path)
                    const Icon = tab.icon
                    const label = labels[tab.key as keyof typeof labels]
                    const href = panelBase + tab.path

                    return (
                        <Link
                            key={tab.key}
                            href={href}
                            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-xl transition-colors relative ${
                                active
                                    ? 'text-brand'
                                    : 'text-tx-muted'
                            }`}
                        >
                            <div className="relative">
                                <Icon className="w-5 h-5" />
                                {tab.key === 'orders' && orderBadge != null && orderBadge > 0 && (
                                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                                        {orderBadge > 9 ? '9+' : orderBadge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium leading-none">{label}</span>
                            {active && (
                                <div className="absolute -top-0.5 w-5 h-0.5 bg-brand rounded-full" />
                            )}
                        </Link>
                    )
                })}

                {/* More button → opens sidebar */}
                <button
                    type="button"
                    onClick={onMoreClick}
                    className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-tx-muted transition-colors"
                >
                    <MoreHorizontal className="w-5 h-5" />
                    <span className="text-[10px] font-medium leading-none">{labels.more}</span>
                </button>
            </div>
        </nav>
    )
}
